// Small, pure critical-path scheduling engine (the classic Critical Path
// Method / CPM forward+backward pass) — pulled out on its own and unit
// tested for the same reason as financial-calcs.ts: this drives what a
// builder sees as "which of these milestones can't slip without pushing
// the whole job out," so a silent bug here is a wrong answer to a question
// builders actually rely on, not a cosmetic glitch.
//
// Deliberately day-granularity and deliberately ignores weekends/holidays
// (a real construction program would want a working-calendar), kept simple
// on purpose: this is meant to answer "what's the sequence and what's
// driving the finish date," not replace a dedicated scheduling tool.

export type ScheduleTask = {
  id: string;
  durationDays: number;
  /** Only used for tasks with no predecessors — an explicit anchor date
   * (the milestone's own target_date, or the project start) to schedule
   * from. Tasks with predecessors are scheduled entirely from their
   * predecessors' finish dates instead. */
  anchorDate: string | null;
};

export type ScheduleEdge = { predecessorId: string; successorId: string };

export type ScheduleResult = {
  earliestStart: number; // day offset from the earliest anchor, 0-based
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayOffset(dateStr: string, epoch: number): number {
  return Math.round((new Date(dateStr).setHours(0, 0, 0, 0) - epoch) / DAY_MS);
}

/**
 * Topologically sorts tasks by dependency edges. Returns null if the graph
 * has a cycle (a task that (in)directly depends on itself) — callers
 * should treat that as "can't compute a schedule" rather than looping
 * forever.
 */
export function topologicalSort(taskIds: string[], edges: ScheduleEdge[]): string[] | null {
  const inDegree = new Map(taskIds.map((id) => [id, 0]));
  const successors = new Map<string, string[]>(taskIds.map((id) => [id, []]));

  for (const e of edges) {
    if (!inDegree.has(e.predecessorId) || !inDegree.has(e.successorId)) continue;
    inDegree.set(e.successorId, (inDegree.get(e.successorId) ?? 0) + 1);
    successors.get(e.predecessorId)!.push(e.successorId);
  }

  const queue = taskIds.filter((id) => inDegree.get(id) === 0);
  const order: string[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of successors.get(id) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 0) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  return order.length === taskIds.length ? order : null;
}

/**
 * Returns true if `candidateId` is reachable from `fromId` following
 * dependency edges forward (successor direction) — used to block a user
 * from creating a dependency that would introduce a cycle before it's ever
 * saved.
 */
export function wouldCreateCycle(edges: ScheduleEdge[], predecessorId: string, successorId: string): boolean {
  if (predecessorId === successorId) return true;
  const successors = new Map<string, string[]>();
  for (const e of edges) {
    if (!successors.has(e.predecessorId)) successors.set(e.predecessorId, []);
    successors.get(e.predecessorId)!.push(e.successorId);
  }
  // Would adding predecessor -> successor create a cycle? Only if
  // successor can already reach predecessor.
  const stack = [successorId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === predecessorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of successors.get(id) ?? []) stack.push(next);
  }
  return false;
}

/**
 * Computes earliest/latest start/finish and slack for every task via the
 * standard two-pass CPM algorithm. Returns null if the dependency graph
 * has a cycle. Dates are returned as day offsets from the earliest anchor
 * date found among root tasks — callers add that back to get real dates.
 */
export function computeCriticalPath(
  tasks: ScheduleTask[],
  edges: ScheduleEdge[]
): { results: Map<string, ScheduleResult>; epochDate: string } | null {
  if (!tasks.length) return { results: new Map(), epochDate: new Date().toISOString().slice(0, 10) };

  const taskIds = tasks.map((t) => t.id);
  const order = topologicalSort(taskIds, edges);
  if (!order) return null;

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const predecessorsOf = new Map<string, string[]>(taskIds.map((id) => [id, []]));
  const successorsOf = new Map<string, string[]>(taskIds.map((id) => [id, []]));
  for (const e of edges) {
    if (!taskById.has(e.predecessorId) || !taskById.has(e.successorId)) continue;
    predecessorsOf.get(e.successorId)!.push(e.predecessorId);
    successorsOf.get(e.predecessorId)!.push(e.successorId);
  }

  const rootAnchors = tasks
    .filter((t) => predecessorsOf.get(t.id)!.length === 0 && t.anchorDate)
    .map((t) => new Date(t.anchorDate!).setHours(0, 0, 0, 0));
  const epoch = rootAnchors.length ? Math.min(...rootAnchors) : new Date().setHours(0, 0, 0, 0);

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();

  for (const id of order) {
    const task = taskById.get(id)!;
    const preds = predecessorsOf.get(id)!;
    let start: number;
    if (preds.length === 0) {
      start = task.anchorDate ? toDayOffset(task.anchorDate, epoch) : 0;
    } else {
      start = Math.max(...preds.map((p) => earliestFinish.get(p) ?? 0));
    }
    earliestStart.set(id, start);
    earliestFinish.set(id, start + Math.max(1, task.durationDays));
  }

  const projectFinish = Math.max(...[...earliestFinish.values()], 0);

  const latestStart = new Map<string, number>();
  const latestFinish = new Map<string, number>();

  for (const id of [...order].reverse()) {
    const task = taskById.get(id)!;
    const succs = successorsOf.get(id)!;
    const finish = succs.length === 0 ? projectFinish : Math.min(...succs.map((s) => latestStart.get(s) ?? projectFinish));
    latestFinish.set(id, finish);
    latestStart.set(id, finish - Math.max(1, task.durationDays));
  }

  const results = new Map<string, ScheduleResult>();
  for (const id of taskIds) {
    const es = earliestStart.get(id) ?? 0;
    const ef = earliestFinish.get(id) ?? 0;
    const ls = latestStart.get(id) ?? 0;
    const lf = latestFinish.get(id) ?? 0;
    const slack = ls - es;
    results.set(id, { earliestStart: es, earliestFinish: ef, latestStart: ls, latestFinish: lf, slack, isCritical: slack <= 0 });
  }

  return { results, epochDate: new Date(epoch).toISOString().slice(0, 10) };
}
