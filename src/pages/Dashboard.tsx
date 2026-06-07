import { useEffect, useMemo, useState, useCallback } from "react";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "../../supabase/client";
import { type Application, type Status, type TimelineEvent, timeAgo } from "@/lib/applications";
import { ArrowDown, Briefcase, CheckCircle2, FileText, MessageSquare, Percent, Send } from "lucide-react";
import { AddApplicationDialog } from "@/components/add-application-dialog";
import { PasteEmailDialog } from "@/components/paste-email-dialog";

type Activity = TimelineEvent & { company: string };

function Dashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: a }, { data: ev }] = await Promise.all([
      supabase.from("applications").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("timeline_events")
        .select("*, applications(company)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setApps((a as Application[] | null) ?? []);
    setActivity(
      ((ev ?? []) as (TimelineEvent & { applications: { company: string } | null })[]).map((e) => ({
        ...e,
        company: e.applications?.company ?? "Unknown",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = apps.length;
    const active = apps.filter((a) => !["Rejected", "Offer"].includes(a.status)).length;
    const oas = apps.filter((a) => ["OA Received", "Interview", "Offer"].includes(a.status)).length;
    const interviews = apps.filter((a) => ["Interview", "Offer"].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === "Offer").length;
    const responded = apps.filter((a) => a.status !== "Applied").length;
    const responseRate = total ? Math.round((responded / total) * 100) : 0;
    return { total, active, oas, interviews, offers, responseRate };
  }, [apps]);

  const statCards = [
    { label: "Total Applications", value: stats.total, icon: Send },
    { label: "Active", value: stats.active, icon: Briefcase },
    { label: "OAs Received", value: stats.oas, icon: FileText },
    { label: "Interviews", value: stats.interviews, icon: MessageSquare },
    { label: "Offers", value: stats.offers, icon: CheckCircle2 },
    { label: "Response Rate", value: `${stats.responseRate}%`, icon: Percent },
  ];

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

  const recent = apps.slice(0, 6);

  return (
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] dark:opacity-[0.03] opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 space-y-8 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Overview</p>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500">Your internship pipeline at a glance.</p>
          </div>
          <div className="flex gap-2">
            <PasteEmailDialog onCreated={load} />
            <AddApplicationDialog onCreated={load} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <s.icon className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Middle Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
              <p className="text-sm font-semibold">Recent Activity</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 px-6">
              {activity.length === 0 && !loading ? (
                <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
                  No activity yet. Add an application or paste a recruiting email.
                </p>
              ) : (
                activity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3.5 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {a.company[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="font-medium">{a.company}</p>
                        <p className="text-xs text-zinc-500">{a.event}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600 tabular-nums">{timeAgo(a.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
              <p className="text-sm font-semibold">Application Funnel</p>
            </div>
            <div className="space-y-3 p-6">
              {funnel.map((f, i) => {
                const base = funnel[0].value || 1;
                const pct = (f.value / base) * 100;
                return (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-500 text-xs">{f.label}</span>
                      <span className="font-semibold tabular-nums text-xs">{f.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-zinc-400 dark:bg-zinc-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {i < funnel.length - 1 && (
                      <div className="my-1 flex justify-center text-zinc-300 dark:text-zinc-700">
                        <ArrowDown className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Applications Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
            <p className="text-sm font-semibold">Recent Applications</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-600">
                    {loading ? "Loading…" : "No applications yet."}
                  </td>
                </tr>
              ) : (
                recent.map((a: Application) => (
                  <tr key={a.id} className="transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-3.5 font-medium">{a.company}</td>
                    <td className="px-6 py-3.5 text-zinc-500">{a.role}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={a.status as Status} /></td>
                    <td className="px-6 py-3.5 text-right text-zinc-400 dark:text-zinc-600 tabular-nums">{timeAgo(a.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;