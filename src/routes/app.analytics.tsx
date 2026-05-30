import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applications, funnel, monthlyApplications, statusDistribution, stats,
} from "@/lib/dummy-data";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Inboxly" }] }),
  component: AnalyticsPage,
});

const COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"];

function AnalyticsPage() {
  const interviewRate = Math.round((stats.interviews / stats.total) * 100);
  const offerRate = Math.round((stats.offers / stats.total) * 100);

  const topCompanies = useMemo(() => {
    const groups: Record<string, number> = {};
    applications.forEach((a) => (groups[a.company] = (groups[a.company] || 0) + 1));
    return Object.entries(groups)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Trends and conversion rates across your search.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Applications Submitted", v: stats.total },
          { l: "Response Rate", v: `${stats.responseRate}%` },
          { l: "Interview Rate", v: `${interviewRate}%` },
          { l: "Offer Rate", v: `${offerRate}%` },
        ].map((c) => (
          <Card key={c.l}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{c.l}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{c.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Applications per Month</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyApplications}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-4 grid grid-cols-3 gap-2 text-xs">
              {statusDistribution.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Companies Applied To</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCompanies} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="company" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Interview Conversion Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => {
              const pct = Math.round((f.value / funnel[0].value) * 100);
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground tabular-nums">{f.value} · {pct}%</span>
                  </div>
                  <div className="mt-1.5 h-8 overflow-hidden rounded-md bg-muted">
                    <div className="flex h-full items-center justify-end bg-primary px-2 text-xs font-medium text-primary-foreground" style={{ width: `${pct}%` }}>
                      {pct >= 15 && <span>{pct}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
