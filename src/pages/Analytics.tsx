import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase/client";
import { STATUSES, type Application } from "@/lib/applications";

const COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"];

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
          { l: "Interview Rate", v: `${stats.interviewRate}%` },
          { l: "Offer Rate", v: `${stats.offerRate}%` },
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
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
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
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-4 grid grid-cols-3 gap-2 text-xs">
              {statusDist.map((s, i) => (
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
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
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
              const base = funnel[0].value || 1;
              const pct = Math.round((f.value / base) * 100);
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

export default AnalyticsPage;