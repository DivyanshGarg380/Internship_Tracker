import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your internship pipeline.</p>
        </div>
        <div className="flex gap-2">
          <PasteEmailDialog onCreated={load} />
          <AddApplicationDialog onCreated={load} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {activity.length === 0 && !loading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity yet. Add an application or paste a recruiting email.
              </p>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium">
                    {a.company[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium">{a.company}</p>
                    <p className="text-xs text-muted-foreground">{a.event}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Application Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {funnel.map((f, i) => {
              const base = funnel[0].value || 1;
              const pct = (f.value / base) * 100;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">{f.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  {i < funnel.length - 1 && (
                    <div className="my-1 flex justify-center text-muted-foreground/40">
                      <ArrowDown className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Applications</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "Loading…" : "No applications yet."}
                  </TableCell>
                </TableRow>
              )}
              {recent.map((a: Application) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.company}</TableCell>
                  <TableCell className="text-muted-foreground">{a.role}</TableCell>
                  <TableCell><StatusBadge status={a.status as Status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{timeAgo(a.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;