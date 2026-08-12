"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Material, MaterialStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

const statusTone: Record<MaterialStatus, BadgeTone> = {
  ordered: "neutral",
  delivered: "emerald",
  short: "amber",
  damaged: "red",
  cancelled: "neutral",
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function MaterialsList({ projectId, materials }: { projectId: string; materials: Material[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantityOrdered, setQuantityOrdered] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState("");

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("materials").insert({
      project_id: projectId,
      description: description.trim(),
      supplier: supplier.trim() || null,
      quantity_ordered: quantityOrdered ? parseFloat(quantityOrdered) : null,
      unit: unit.trim() || null,
      cost: cost ? parseFloat(cost) : null,
      expected_date: expectedDate || null,
      created_by: user?.id ?? null,
      status: "ordered",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDescription("");
    setSupplier("");
    setQuantityOrdered("");
    setUnit("");
    setCost("");
    setExpectedDate("");
    setAdding(false);
    router.refresh();
  }

  function startReceiving(m: Material) {
    setReceivingId(m.id);
    setReceivedQtyInput(m.quantity_ordered?.toString() ?? "");
  }

  async function confirmReceived(m: Material) {
    const qty = receivedQtyInput ? parseFloat(receivedQtyInput) : null;
    const isShort = qty !== null && m.quantity_ordered !== null && qty < m.quantity_ordered;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("materials")
      .update({
        status: isShort ? "short" : "delivered",
        received_date: toDateInput(new Date()),
        quantity_received: qty,
      })
      .eq("id", m.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setReceivingId(null);
    setReceivedQtyInput("");
    router.refresh();
  }

  async function flagDamaged(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("materials").update({ status: "damaged" }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function cancelOrder(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("materials").update({ status: "cancelled" }).eq("id", id);
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
        {materials.map((m) => (
          <div key={m.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{m.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.supplier && `${m.supplier} · `}
                  {m.quantity_ordered !== null && `${m.quantity_ordered}${m.unit ? ` ${m.unit}` : ""} ordered · `}
                  {m.expected_date && `expected ${m.expected_date}`}
                  {m.cost !== null && ` · ${formatCurrency(m.cost)}`}
                </p>
                {m.status === "short" && m.quantity_received !== null && (
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    Only {m.quantity_received}{m.unit ? ` ${m.unit}` : ""} received of {m.quantity_ordered}{m.unit ? ` ${m.unit}` : ""} ordered
                  </p>
                )}
              </div>
              <Badge tone={statusTone[m.status]} className="shrink-0">{m.status}</Badge>
            </div>

            {m.status === "ordered" && receivingId !== m.id && (
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => startReceiving(m)} className="text-xs font-medium text-brand-orange hover:underline">
                  Mark received
                </button>
                <button type="button" onClick={() => cancelOrder(m.id)} disabled={saving} className="text-xs text-slate-400 hover:underline disabled:opacity-50">
                  Cancel order
                </button>
              </div>
            )}

            {receivingId === m.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(e.target.value)}
                  placeholder="Quantity received"
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <Button size="sm" loading={saving} onClick={() => confirmReceived(m)}>Confirm</Button>
                <button type="button" onClick={() => setReceivingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}

            {(m.status === "delivered" || m.status === "short") && (
              <button type="button" onClick={() => flagDamaged(m.id)} disabled={saving} className="mt-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400">
                Flag as damaged
              </button>
            )}
          </div>
        ))}
        {!materials.length && <EmptyState icon={EmptyIcons.package} title="No materials logged yet." className="px-4 py-8" />}
      </Card>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {adding ? (
        <Card className="p-4">
          <form onSubmit={addMaterial} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What was ordered</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g. 12x roof trusses" className="field mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Supplier</label>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expected delivery</label>
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="field mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
                <input type="number" step="0.01" value={quantityOrdered} onChange={(e) => setQuantityOrdered(e.target.value)} className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Unit</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. m3, bags, each" className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost (AUD)</label>
                <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="field mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Log order</Button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-brand-orange hover:underline">
          + Log a material order
        </button>
      )}
    </div>
  );
}
