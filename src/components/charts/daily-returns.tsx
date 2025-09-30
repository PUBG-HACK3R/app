"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type DailyReturnsDatum = { day: string; earnings: number };

export function DailyReturnsChart({ data }: { data: DailyReturnsDatum[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8 }}>
          <defs>
            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`hsl(var(--chart-2))`} stopOpacity={0.8} />
              <stop offset="95%" stopColor={`hsl(var(--chart-2))`} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke={`hsl(var(--muted-foreground))`} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={`hsl(var(--muted-foreground))`} fontSize={12} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ stroke: `hsl(var(--muted))` }} />
          <Area type="monotone" dataKey="earnings" stroke={`hsl(var(--chart-2))`} fill="url(#colorEarnings)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
