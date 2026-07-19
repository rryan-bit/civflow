import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OptionsPanel } from "./options-panel";
import { SelectionActions } from "./selection-actions";
import { SelectionApprovalLink } from "./selection-approval-link";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  awaiting_choice: "amber",
  chosen: "emerald",
};

const statusLabel: Record<string, string> = {
  draft: "draft",
  awaiting_choice: "awaiting client choice",
  chosen: "chosen",
};

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function SelectionDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; selectionId: string }>;
}) {
  const { projectId, selectionId } = await params;
  const supabase = await createClient();

  const { data: selection } = await supabase
    .from("selections")
    .select("*")
    .eq("id", selectionId)
    .eq("project_id", projectId)
    .single();
  if (!selection) notFound();

  const { data: options } = await supabase
    .from("selection_options")
    .select("*")
    .eq("selection_id", selectionId)
    .order("sort_order", { ascending: true });

  const chosenOption = (options ?? []).find((o) => o.id === selection.chosen_option_id) ?? null;
  const variance =
    selection.allowance_amount !== null && chosenOption?.cost !== null && chosenOption?.cost !== undefined
      ? chosenOption.cost - selection.allowance_amount
      : null;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/selections`}>Back to Selections</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{selection.category}</h1>
        <Badge tone={statusTone[selection.status]} className="shrink-0">{statusLabel[selection.status]}</Badge>
      </div>
      {selection.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selection.description}</p>}
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {selection.allowance_amount !== null && `${formatCurrency(selection.allowance_amount)} allowance`}
        {selection.allowance_amount !== null && selection.due_date && " · "}
        {selection.due_date && `due ${formatDate(selection.due_date)}`}
      </p>

      {selection.status === "chosen" && (
        <Card className="mt-6 border-emerald-200/80 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
            {selection.client_chosen_name} chose {chosenOption?.name ?? "an option"} on {formatDate(selection.client_chosen_at)}.
          </p>
          {variance !== null && (
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-400">
              {variance > 0
                ? `${formatCurrency(variance)} over the allowance.`
                : variance < 0
                  ? `${formatCurrency(Math.abs(variance))} under the allowance.`
                  : "Exactly on the allowance."}
            </p>
          )}
        </Card>
      )}

      <div className="mt-6 space-y-4">
        <OptionsPanel
          selectionId={selectionId}
          options={options ?? []}
          chosenOptionId={selection.chosen_option_id}
          editable={selection.status === "draft"}
        />

        <SelectionActions selectionId={selectionId} status={selection.status} optionCount={options?.length ?? 0} />

        {selection.status !== "draft" && selection.status !== "chosen" && (
          <SelectionApprovalLink token={selection.client_approval_token} />
        )}
      </div>
    </div>
  );
}
