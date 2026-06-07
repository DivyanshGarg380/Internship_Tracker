import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
      event_date: new Date().toISOString().slice(0, 10),
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
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.5,
        }}
      />

      <div className="relative z-10 space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Pipeline</p>
            <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
            <p className="mt-1 text-sm text-zinc-500">{filtered.length} of {apps.length} shown</p>
          </div>
          <div className="flex gap-2">
            <PasteEmailDialog onCreated={load} />
            <AddApplicationDialog onCreated={load} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
            <input
              placeholder="Search company, role, location…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none transition-colors"
            />
          </div>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "All")}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5 text-left text-xs font-medium text-zinc-500">Company</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-zinc-500">Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-zinc-500">Location</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-medium text-zinc-500">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/30"
                  onClick={() => setSelected(a)}
                >
                  <td className="px-6 py-3.5 font-medium">{a.company}</td>
                  <td className="px-6 py-3.5 text-zinc-500">{a.role}</td>
                  <td className="px-6 py-3.5 text-zinc-500">{a.location}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-6 py-3.5 text-right text-zinc-400 dark:text-zinc-600 tabular-nums">{timeAgo(a.updated_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-sm text-zinc-400 dark:text-zinc-600">
                    {loading ? "Loading…" : apps.length === 0 ? "No applications yet. Add one or paste an email." : "No applications match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {selected && (
            <>
              <SheetHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <SheetTitle>{selected.company}</SheetTitle>
                <SheetDescription>{selected.role}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-6 pt-4">
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5 text-zinc-500">
                    <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{selected.company}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-zinc-500">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{selected.location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-zinc-500">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Applied {selected.applied_date}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-600 mb-2">Status</p>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected, v as Status)}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {selected.notes && (
                  <div>
                    <p className="text-xs font-medium text-zinc-400 dark:text-zinc-600 mb-2">Notes</p>
                    <p className="whitespace-pre-wrap text-sm text-zinc-500">{selected.notes}</p>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-xs font-medium text-zinc-400 dark:text-zinc-600">Timeline</p>
                  {timeline.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">No events yet.</p>
                  ) : (
                    <ol className="relative space-y-4 border-l border-zinc-200 dark:border-zinc-800 pl-5">
                      {timeline.map((t) => (
                        <li key={t.id} className="relative">
                          <span className="absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full bg-zinc-400 ring-4 ring-white dark:ring-zinc-950" />
                          <p className="text-sm font-medium">{t.event}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-600">{t.event_date}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <button
                  onClick={() => remove(selected)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-red-500 transition-all hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete application
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ApplicationsPage;