import { describe, it, expect } from "vitest";
import { topologicalSort, wouldCreateCycle, computeCriticalPath } from "./schedule-calcs";

describe("topologicalSort", () => {
  it("orders a simple chain", () => {
    const order = topologicalSort(["a", "b", "c"], [
      { predecessorId: "a", successorId: "b" },
      { predecessorId: "b", successorId: "c" },
    ]);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("returns null for a cycle", () => {
    const order = topologicalSort(["a", "b"], [
      { predecessorId: "a", successorId: "b" },
      { predecessorId: "b", successorId: "a" },
    ]);
    expect(order).toBeNull();
  });

  it("handles tasks with no edges at all", () => {
    const order = topologicalSort(["a", "b"], []);
    expect(order).toHaveLength(2);
  });
});

describe("wouldCreateCycle", () => {
  it("flags a direct self-dependency", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("flags an indirect cycle through an existing chain", () => {
    // a -> b -> c already exists; adding c -> a would cycle.
    const edges = [
      { predecessorId: "a", successorId: "b" },
      { predecessorId: "b", successorId: "c" },
    ];
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("allows a new edge that doesn't cycle", () => {
    const edges = [{ predecessorId: "a", successorId: "b" }];
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
  });
});

describe("computeCriticalPath", () => {
  it("returns an empty result for no tasks", () => {
    const result = computeCriticalPath([], []);
    expect(result?.results.size).toBe(0);
  });

  it("schedules a single task with no dependencies from its anchor date", () => {
    const result = computeCriticalPath([{ id: "a", durationDays: 5, anchorDate: "2026-01-01" }], []);
    const a = result?.results.get("a");
    expect(a?.earliestStart).toBe(0);
    expect(a?.earliestFinish).toBe(5);
    expect(a?.isCritical).toBe(true);
  });

  it("chains a successor's start to its predecessor's finish", () => {
    const result = computeCriticalPath(
      [
        { id: "a", durationDays: 3, anchorDate: "2026-01-01" },
        { id: "b", durationDays: 4, anchorDate: null },
      ],
      [{ predecessorId: "a", successorId: "b" }]
    );
    const a = result?.results.get("a");
    const b = result?.results.get("b");
    expect(a?.earliestFinish).toBe(3);
    expect(b?.earliestStart).toBe(3);
    expect(b?.earliestFinish).toBe(7);
    // Single chain — both tasks are on the critical path.
    expect(a?.isCritical).toBe(true);
    expect(b?.isCritical).toBe(true);
  });

  it("identifies the longer of two parallel branches as critical, the shorter as having slack", () => {
    // a -> b (short branch, 2 days) and a -> c (long branch, 10 days), both feeding into d.
    const result = computeCriticalPath(
      [
        { id: "a", durationDays: 1, anchorDate: "2026-01-01" },
        { id: "b", durationDays: 2, anchorDate: null },
        { id: "c", durationDays: 10, anchorDate: null },
        { id: "d", durationDays: 1, anchorDate: null },
      ],
      [
        { predecessorId: "a", successorId: "b" },
        { predecessorId: "a", successorId: "c" },
        { predecessorId: "b", successorId: "d" },
        { predecessorId: "c", successorId: "d" },
      ]
    );
    expect(result?.results.get("c")?.isCritical).toBe(true);
    expect(result?.results.get("b")?.isCritical).toBe(false);
    expect(result?.results.get("b")?.slack).toBeGreaterThan(0);
  });

  it("returns null when the dependency graph has a cycle", () => {
    const result = computeCriticalPath(
      [
        { id: "a", durationDays: 1, anchorDate: "2026-01-01" },
        { id: "b", durationDays: 1, anchorDate: null },
      ],
      [
        { predecessorId: "a", successorId: "b" },
        { predecessorId: "b", successorId: "a" },
      ]
    );
    expect(result).toBeNull();
  });
});
