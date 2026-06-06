import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "../../supabase/client";
import { STATUSES, type Application, type Status, type TimelineEvent, timeAgo } from "@/lib/applications";
import { Search, Building2, MapPin, Calendar, Trash2 } from "lucide-react";
import { AddApplicationDialog } from "@/components/add-application-dialog";
import { PasteEmailDialog } from "@/components/paste-email-dialog";
import { toast } from "sonner";


const statusFilters = ["All", ...STATUSES] as const;

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All">("All");
  const [company, setCompany] = useState<string>("All");
  const [selected, setSelected] = useState<Application | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("applications").select("*").order("updated_at", { ascending: false });
    setApps((data as Application[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("timeline_events")
      .select("*")
      .eq("application_id", selected.id)
      .order("event_date", { ascending: false })
      .then(({ data }) => setTimeline((data as TimelineEvent[] | null) ?? []));
  }, [selected]);

  const companies = useMemo(
    () => ["All", ...Array.from(new Set(apps.map((a) => a.company)))],
    [apps],
  );

  const filtered = useMemo(
    () =>
      apps.filter((a) => {
        if (status !== "All" && a.status !== status) return false;
        if (company !== "All" && a.company !== company) return false;
        if (query && !`${a.company} ${a.role} ${a.location}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [apps, query, status, company],
  );

  async function updateStatus(app: Application, next: Status) {
    const { error } = await supabase.from("applications").update({ status: next }).eq("id", app.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("timeline_events").insert({
      application_id: app.id,
      event: `Status changed to ${next}`,
      status: next,
    });
    toast.success("Status updated.");
    setSelected({ ...app, status: next });
    load();
  }

  async function remove(app: Application) {
    if (!confirm(`Delete ${app.company} — ${app.role}?`)) return;
    const { error } = await supabase.from("applications").delete().eq("id", app.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {apps.length} shown</p>
        </div>
        <div className="flex gap-2">
          <PasteEmailDialog onCreated={load} />
          <AddApplicationDialog onCreated={load} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search company, role, location…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "All")}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {statusFilters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
                  <TableCell className="font-medium">{a.company}</TableCell>
                  <TableCell className="text-muted-foreground">{a.role}</TableCell>
                  <TableCell className="text-muted-foreground">{a.location}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{timeAgo(a.updated_at)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading…" : apps.length === 0 ? "No applications yet. Add one or paste an email." : "No applications match your filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.company}</SheetTitle>
                <SheetDescription>{selected.role}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" /> <span>{selected.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> <span>{selected.location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> <span>Applied {selected.applied_date}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <Select value={selected.status} onValueChange={(v) => updateStatus(selected, v as Status)}>
                      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{selected.notes}</p>
                  </div>
                )}
                <div>
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Timeline</p>
                  {timeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events yet.</p>
                  ) : (
                    <ol className="relative space-y-4 border-l border-border pl-5">
                      {timeline.map((t) => (
                        <li key={t.id} className="relative">
                          <span className="absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
                          <p className="text-sm font-medium">{t.event}</p>
                          <p className="text-xs text-muted-foreground">{t.event_date}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={() => remove(selected)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete application
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ApplicationsPage;