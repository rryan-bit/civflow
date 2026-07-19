"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useIsDark } from "@/lib/use-is-dark";

// The dark theme's background (#0a0f1c) sits almost on top of brand-navy
// (#0f172a) and brand-steel (#1e3a5f) — those two bars/slices would nearly
// vanish on a dark card. Everything else (orange/green/yellow) has enough
// contrast to reuse as-is, so only the dark navy/steel tones get a lighter
// stand-in for dark mode.
function getPalette(isDark: boolean) {
  return {
    axis: isDark ? "#94a3b8" : "#64748b", // slate-400 / slate-500
    grid: isDark ? "#334155" : "#cbd5e1", // slate-700 / slate-300
    tooltipBg: isDark ? "#0f172a" : "#ffffff",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipText: isDark ? "#f1f5f9" : "#0f172a",
    contract: isDark ? "#60a5fa" : "#0f172a", // blue-400 in dark, brand-navy in light
    claimed: "#f97316", // brand-orange — legible either way
    paid: "#22c55e", // brand-success — legible either way
    subcontractors: isDark ? "#7dd3fc" : "#1e3a5f", // sky-300 in dark, brand-steel in light
    materials: "#f97316",
    labour: "#eab308",
    equipment: isDark ? "#c4b5fd" : "#7c3aed", // violet-300 in dark, violet-600 in light
    margin: "#22c55e",
  };
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatCompact(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", notation: "compact", maximumFractionDigits: 1 });
}

export function ProjectFinancialCharts({
  projectId,
  hasContractValue,
  revisedContractValue,
  totalClaimed,
  totalPaidByClient,
  totalSubCommitted,
  totalMaterialsCost,
  totalLabourCost,
  totalEquipmentCost = 0,
  estimatedMargin,
}: {
  projectId: string;
  hasContractValue: boolean;
  revisedContractValue: number;
  totalClaimed: number;
  totalPaidByClient: number;
  totalSubCommitted: number;
  totalMaterialsCost: number;
  totalLabourCost: number;
  totalEquipmentCost?: number;
  estimatedMargin: number | null;
}) {
  const isDark = useIsDark();
  const palette = getPalette(isDark);

  if (!hasContractValue) {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Financials</h2>
          <Link href={`/projects/${projectId}/financials`} className="text-xs font-medium text-brand-orange hover:underline">
            Open Financials &amp; Schedule
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Set a contract value in Financials &amp; Schedule to see billing progress and cost breakdown charts here.
        </p>
      </Card>
    );
  }

  const billingData = [
    { name: "Contract", value: revisedContractValue, fill: palette.contract },
    { name: "Claimed", value: totalClaimed, fill: palette.claimed },
    { name: "Paid", value: totalPaidByClient, fill: palette.paid },
  ];

  const costData = [
    { name: "Subcontractors", value: totalSubCommitted, color: palette.subcontractors },
    { name: "Materials", value: totalMaterialsCost, color: palette.materials },
    { name: "Labour", value: totalLabourCost, color: palette.labour },
    { name: "Equipment & plant", value: totalEquipmentCost, color: palette.equipment },
    ...(estimatedMargin !== null && estimatedMargin > 0 ? [{ name: "Margin", value: estimatedMargin, color: palette.margin }] : []),
  ].filter((d) => d.value > 0);

  const tooltipStyle = {
    borderRadius: 10,
    border: `1px solid ${palette.tooltipBorder}`,
    backgroundColor: palette.tooltipBg,
    color: palette.tooltipText,
    fontSize: 12,
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Financials</h2>
        <Link href={`/projects/${projectId}/financials`} className="text-xs font-medium text-brand-orange hover:underline">
          Open Financials &amp; Schedule
        </Link>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Billing progress</p>
          <div className="mt-2 h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billingData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: palette.axis, fontSize: 12 }} axisLine={{ stroke: palette.grid }} tickLine={false} />
                <YAxis tick={{ fill: palette.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={56} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: palette.tooltipText }}
                  labelStyle={{ color: palette.tooltipText }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cost breakdown</p>
          {costData.length > 0 ? (
            <div className="mt-2 h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {costData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: palette.tooltipText }}
                    labelStyle={{ color: palette.tooltipText }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No subcontractor, materials, labour, or equipment hire costs logged yet.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
