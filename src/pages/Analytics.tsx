import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase/client";
import { STATUSES, type Application } from "@/lib/applications";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 12,
  fontSize: 12,
  color: "#d4d4d8",
};

function AnalyticsPage() {
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    supabase.from("applications").select("*").then(({ data }) => {
      setApps((data as Application[] | null) ?? []);
    });
  }, []);

  const stats = useMemo(() => {
    const total = apps.length;
    const responded = apps.filter((a) => a.status !== "Applied").length;
    const interviews = apps.filter((a) => ["Interview", "Offer"].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === "Offer").length;
    return {
      total,
      responseRate: total ? Math.round((responded / total) * 100) : 0,
      interviewRate: total ? Math.round((interviews / total) * 100) : 0,
      offerRate: total ? Math.round((offers / total) * 100) : 0,
    };
  }, [apps]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    apps.forEach((a) => {
      const d = new Date(a.applied_date);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({ month, count })).reverse();
  }, [apps]);

  const statusDist = useMemo(
    () => STATUSES.map((s) => ({ name: s, value: apps.filter((a) => a.status === s).length })),
    [apps],
  );

  const topCompanies = useMemo(() => {
    const groups: Record<string, number> = {};
    apps.forEach((a) => (groups[a.company] = (groups[a.company] || 0) + 1));
    return Object.entries(groups).map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [apps]);

  const funnel = useMemo(() => {
    const submitted = apps.length;
    const responded = apps.filter((a) => a.status !== "Applied").length;
    const oas = apps.filter((a) => ["OA Received", "Interview", "Offer"].includes(a.status)).length;
    const interviews = apps.filter((a) => ["Interview", "Offer"].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === "Offer").length;
    return [
      { label: "Applications", value: submitted },
      { label: "Responses", value: responded },
      { label: "OAs", value: oas },
      { label: "Interviews", value: interviews },
      { label: "Offers", value: offers },
    ];
  }, [apps]);

  const funnelColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#06b6d4"];

  const statCards = [
    { l: "Applications Submitted", v: stats.total },
    { l: "Response Rate", v: `${stats.responseRate}%` },
    { l: "Interview Rate", v: `${stats.interviewRate}%` },
    { l: "Offer Rate", v: `${stats.offerRate}%` },
  ];

  return (
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 space-y-8 p-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Insights</p>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Trends and conversion rates across your search.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((c) => (
            <div
              key={c.l}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
            >
              <p className="text-xs font-medium text-zinc-500">{c.l}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{c.v}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Bar Chart: Monthly */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
            <p className="mb-4 text-sm font-semibold">Applications per Month</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:[&>line]:stroke-zinc-800" vertical={false} />
                  <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Status */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
            <p className="mb-4 text-sm font-semibold">Status Distribution</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {statusDist.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: Companies */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
            <p className="mb-4 text-sm font-semibold">Top Companies Applied To</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompanies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="company" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
            <p className="mb-6 text-sm font-semibold">Interview Conversion Funnel</p>
            <div className="space-y-4">
              {funnel.map((f, idx) => {
                const base = funnel[0].value || 1;
                const pct = Math.round((f.value / base) * 100);
                const color = funnelColors[idx] ?? "#3b82f6";
                return (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-500 text-xs font-medium">{f.label}</span>
                      <span className="text-zinc-400 tabular-nums text-xs">{f.value} · {pct}%</span>
                    </div>
                    <div className="h-7 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="flex h-full items-center justify-end rounded-xl px-2.5 text-xs font-medium text-white transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                      >
                        {pct >= 15 && <span>{pct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;