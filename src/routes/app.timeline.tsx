import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { applications } from "@/lib/dummy-data";
import { useMemo } from "react";

export const Route = createFileRoute("/app/timeline")({
  head: () => ({ meta: [{ title: "Timeline — Inboxly" }] }),
  component: TimelinePage,
});

function TimelinePage() {
  const grouped = useMemo(() => {
    const events: { date: string; company: string; event: string }[] = [];
    applications.forEach((a) => a.timeline.forEach((t) => events.push({ date: t.date, company: a.company, event: t.event })));
    events.sort((a, b) => (a.date < b.date ? 1 : -1));
    const byDate: Record<string, typeof events> = {};
    events.forEach((e) => {
      (byDate[e.date] ||= []).push(e);
    });
    return Object.entries(byDate);
  }, []);

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
        </CardContent>
      </Card>
    </div>
  );
}
