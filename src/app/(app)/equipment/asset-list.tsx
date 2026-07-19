"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Asset, AssetCheckout, AssetOwnership, AssetStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusSelectColor: Record<AssetStatus, string> = {
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  checked_out: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  in_repair: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  retired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate < toDateInput(new Date());
}

export function AssetList({
  companyId,
  assets,
  openCheckouts,
  projects,
}: {
  companyId: string;
  assets: Asset[];
  openCheckouts: Map<string, AssetCheckout>;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [ownership, setOwnership] = useState<AssetOwnership>("owned");
  const [hireCompany, setHireCompany] = useState("");
  const [hireCostPerDay, setHireCostPerDay] = useState("");

  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [checkedOutTo, setCheckedOutTo] = useState("");
  const [checkoutProjectId, setCheckoutProjectId] = useState("");
  const [dueBackDate, setDueBackDate] = useState("");
  const [checkoutCost, setCheckoutCost] = useState("");

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("assets").insert({
      company_id: companyId,
      name: name.trim(),
      category: category.trim() || null,
      ownership,
      hire_company: ownership === "hired" ? hireCompany.trim() || null : null,
      hire_cost_per_day: ownership === "hired" && hireCostPerDay ? parseFloat(hireCostPerDay) : null,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setCategory("");
    setOwnership("owned");
    setHireCompany("");
    setHireCostPerDay("");
    setAdding(false);
    router.refresh();
  }

  function startCheckout(assetId: string) {
    setCheckingOutId(assetId);
    setCheckedOutTo("");
    setCheckoutProjectId("");
    setDueBackDate("");
    setCheckoutCost("");
  }

  async function confirmCheckout(assetId: string) {
    if (!checkedOutTo.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: checkoutError } = await supabase.from("asset_checkouts").insert({
      asset_id: assetId,
      project_id: checkoutProjectId || null,
      checked_out_to: checkedOutTo.trim(),
      due_back_date: dueBackDate || null,
      total_cost: checkoutCost ? parseFloat(checkoutCost) : null,
      created_by: user?.id ?? null,
    });
    if (checkoutError) {
      setSaving(false);
      setError(checkoutError.message);
      return;
    }

    const { error: assetError } = await supabase.from("assets").update({ status: "checked_out" }).eq("id", assetId);
    setSaving(false);
    if (assetError) {
      setError(assetError.message);
      return;
    }
    setCheckingOutId(null);
    router.refresh();
  }

  async function markReturned(checkout: AssetCheckout) {
    setSaving(true);
    setError(null);
    const { error: checkoutError } = await supabase
      .from("asset_checkouts")
      .update({ returned_date: toDateInput(new Date()) })
      .eq("id", checkout.id);
    if (checkoutError) {
      setSaving(false);
      setError(checkoutError.message);
      return;
    }
    const { error: assetError } = await supabase.from("assets").update({ status: "available" }).eq("id", checkout.asset_id);
    setSaving(false);
    if (assetError) {
      setError(assetError.message);
      return;
    }
    router.refresh();
  }

  async function setStatus(assetId: string, status: AssetStatus) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("assets").update({ status }).eq("id", assetId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {assets.map((a) => {
          const checkout = openCheckouts.get(a.id);
          const project = checkout?.project_id ? projects.find((p) => p.id === checkout.project_id) : null;
          const overdue = a.status === "checked_out" && isOverdue(checkout?.due_back_date ?? null);
          return (
            <div key={a.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900 dark:text-slate-100">{a.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {a.category && `${a.category} · `}
                    {a.ownership === "hired" ? `Hired${a.hire_company ? ` from ${a.hire_company}` : ""}${a.hire_cost_per_day ? ` · $${a.hire_cost_per_day}/day` : ""}` : "Owned"}
                  </p>
                  {checkout && (
                    <p className={`mt-0.5 text-xs ${overdue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                      With {checkout.checked_out_to}
                      {project && ` · ${project.name}`}
                      {checkout.due_back_date && ` · due back ${checkout.due_back_date}${overdue ? " (overdue)" : ""}`}
                      {checkout.total_cost !== null && ` · $${checkout.total_cost.toLocaleString()}${project ? " in that project's Financials" : ""}`}
                    </p>
                  )}
                  {checkout?.notes && (
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{checkout.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {overdue && <Badge tone="red">overdue</Badge>}
                  <select
                    value={a.status}
                    onChange={(e) => setStatus(a.id, e.target.value as AssetStatus)}
                    disabled={saving || a.status === "checked_out"}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange/40 disabled:opacity-70 ${statusSelectColor[a.status]}`}
                  >
                    <option value="available">Available</option>
                    <option value="checked_out" disabled>Checked out</option>
                    <option value="in_repair">In repair</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>

              {a.status === "available" && checkingOutId !== a.id && (
                <button type="button" onClick={() => startCheckout(a.id)} className="mt-2 text-xs font-medium text-brand-orange hover:underline">
                  Check out
                </button>
              )}
              {a.status === "checked_out" && checkout && (
                <button type="button" onClick={() => markReturned(checkout)} disabled={saving} className="mt-2 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50">
                  Mark returned
                </button>
              )}

              {checkingOutId === a.id && (
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <input
                    type="text"
                    value={checkedOutTo}
                    onChange={(e) => setCheckedOutTo(e.target.value)}
                    placeholder="Who's it with?"
                    className="field !py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={checkoutProjectId} onChange={(e) => setCheckoutProjectId(e.target.value)} className="field !py-1.5 text-xs">
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input type="date" value={dueBackDate} onChange={(e) => setDueBackDate(e.target.value)} className="field !py-1.5 text-xs" />
                  </div>
                  {a.ownership === "hired" && (
                    <input
                      type="number"
                      step="0.01"
                      value={checkoutCost}
                      onChange={(e) => setCheckoutCost(e.target.value)}
                      placeholder="Hire cost for this period, AUD (optional) — rolls into the project's Financials"
                      className="field !py-1.5 text-xs"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" loading={saving} onClick={() => confirmCheckout(a.id)}>Confirm</Button>
                    <button type="button" onClick={() => setCheckingOutId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!assets.length && <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No tools or plant on the register yet.</p>}
      </Card>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {adding ? (
        <Card className="p-4">
          <form onSubmit={addAsset} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Concrete saw" className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Power tool, Plant, Vehicle" className="field mt-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ownership</label>
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => setOwnership("owned")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${ownership === "owned" ? "border-brand-orange bg-orange-50 dark:bg-orange-500/10" : "border-slate-200 dark:border-slate-800"}`}>
                  Owned
                </button>
                <button type="button" onClick={() => setOwnership("hired")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${ownership === "hired" ? "border-brand-orange bg-orange-50 dark:bg-orange-500/10" : "border-slate-200 dark:border-slate-800"}`}>
                  Hired
                </button>
              </div>
            </div>
            {ownership === "hired" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hire company</label>
                  <input value={hireCompany} onChange={(e) => setHireCompany(e.target.value)} className="field mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost per day (AUD)</label>
                  <input type="number" step="0.01" value={hireCostPerDay} onChange={(e) => setHireCostPerDay(e.target.value)} className="field mt-1" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Add to register</Button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-brand-orange hover:underline">
          + Add a tool or hired plant
        </button>
      )}
    </div>
  );
}
