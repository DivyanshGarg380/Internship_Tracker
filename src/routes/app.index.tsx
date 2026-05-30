import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { applications, funnel, stats } from "@/lib/dummy-data";
import { ArrowDown, Briefcase, CheckCircle2, FileText, MessageSquare, Percent, Send } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Inboxly" }] }),
  component: Dashboard,
});

const statCards = [
  { label: "Total Applications", value: stats.total, icon: Send },
  { label: "Active", value: stats.active, icon: Briefcase },
  { label: "OAs Received", value: stats.oas, icon: FileText },
  { label: "Interviews", value: stats.interviews, icon: MessageSquare },
  { label: "Offers", value: stats.offers, icon: CheckCircle2 },
  { label: "Response Rate", value: `${stats.responseRate}%`, icon: Percent },
];

function Dashboard() {
  const recent = applications.slice(0, 6);
  const activity = [
    { company: "Uber", event: "OA Received", time: "2h ago" },
    { company: "Amazon", event: "Interview Scheduled", time: "1d ago" },
    { company: "Google", event: "Rejected", time: "3d ago" },
    { company: "Stripe", event: "Offer extended", time: "4d ago" },
    { company: "Vercel", event: "Onsite scheduled", time: "5d ago" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your internship pipeline.
        </p>
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
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium">
                    {a.company[0]}
                  </div>
                  <div>
                    <p className="font-medium">{a.company}</p>
                    <p className="text-xs text-muted-foreground">{a.event}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnel.map((f, i) => {
              const pct = (f.value / funnel[0].value) * 100;
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
        <CardHeader>
          <CardTitle className="text-base">Recent Applications</CardTitle>
        </CardHeader>
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
              {recent.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.company}</TableCell>
                  <TableCell className="text-muted-foreground">{a.role}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{a.lastUpdated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
