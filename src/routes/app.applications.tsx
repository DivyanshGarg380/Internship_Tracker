import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { applications, type Application, type Status } from "@/lib/dummy-data";
import { Search, Building2, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/app/applications")({
  head: () => ({ meta: [{ title: "Applications — Inboxly" }] }),
  component: ApplicationsPage,
});

const statuses: (Status | "All")[] = ["All", "Applied", "Under Review", "OA Received", "Interview", "Rejected", "Offer"];

function ApplicationsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All">("All");
  const [company, setCompany] = useState<string>("All");
  const [selected, setSelected] = useState<Application | null>(null);

  const companies = useMemo(() => ["All", ...Array.from(new Set(applications.map((a) => a.company)))], []);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (status !== "All" && a.status !== status) return false;
      if (company !== "All" && a.company !== company) return false;
      if (query && !`${a.company} ${a.role} ${a.location}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, status, company]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {applications.length} shown</p>
        </div>
        <Button>Add Application</Button>
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
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9">Date Range</Button>
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
                  <TableCell className="text-right text-muted-foreground tabular-nums">{a.lastUpdated}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No applications match your filters.
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
                    <Building2 className="h-4 w-4" />
                    <span>{selected.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{selected.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {selected.appliedDate}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Current status</p>
                  <div className="mt-2"><StatusBadge status={selected.status} /></div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Timeline</p>
                  <ol className="relative space-y-4 border-l border-border pl-5">
                    {selected.timeline.map((t, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
                        <p className="text-sm font-medium">{t.event}</p>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
