import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase/client";
import type { TimelineEvent } from "@/lib/applications";

type Row = TimelineEvent & { applications: { company: string } | null };

function TimelinePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("timeline_events")
      .select("*, applications(company)")
      .order("event_date", { ascending: false })
      .then(({ data }) => {
        setRows((data as Row[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  const grouped = useMemo(() => {
    const byDate: Record<string, { company: string; event: string }[]> = {};
    rows.forEach((e) => {
      (byDate[e.event_date] ||= []).push({
        company: e.applications?.company ?? "Unknown",
        event: e.event,
      });
    });
    return Object.entries(byDate);
  }, [rows]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every event across your applications.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <div className="relative space-y-8">
              {grouped.map(([date, items]) => (
                <div key={date} className="relative">
                  <div className="sticky top-14 z-10 -mx-6 mb-4 bg-card/80 px-6 py-1 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(date)}</p>
                  </div>
                  <ol className="relative space-y-4 border-l border-border pl-6">
                    {items.map((e, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[1.85rem] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm">
                            <span className="font-medium">{e.company}</span>
                            <span className="text-muted-foreground"> — {e.event}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TimelinePage;