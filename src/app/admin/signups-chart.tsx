"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function SignupsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #334155", backgroundColor: "#0f172a", color: "#f1f5f9", fontSize: 12 }}
            labelStyle={{ color: "#f1f5f9" }}
          />
          <Bar dataKey="count" name="Signups" radius={[4, 4, 0, 0]} fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
