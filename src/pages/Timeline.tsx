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
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 space-y-6 p-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">History</p>
          <h1 className="text-3xl font-semibold tracking-tight">Timeline</h1>
          <p className="mt-1 text-sm text-zinc-500">Every event across your applications.</p>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="p-6">
            {loading ? (
              <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">Loading…</p>
            ) : grouped.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">No timeline events yet.</p>
            ) : (
              <div className="relative space-y-10">
                {grouped.map(([date, items]) => (
                  <div key={date} className="relative">
                    {/* Sticky date label */}
                    <div className="sticky top-14 z-10 -mx-6 mb-5 bg-zinc-50/90 dark:bg-zinc-900/90 px-6 py-2 backdrop-blur border-b border-zinc-200/50 dark:border-zinc-800/50">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                        {formatDate(date)}
                      </p>
                    </div>

                    {/* Events */}
                    <ol className="relative space-y-5 border-l border-blue-500/20 pl-6">
                      {items.map((e, i) => (
                        <li key={i} className="relative group">
                          <span
                            className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full"
                            style={{ backgroundColor: "#3b82f6", boxShadow: "0 0 6px #3b82f666" }}
                          />
                          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/40 px-4 py-3 transition-all group-hover:border-zinc-300 dark:group-hover:border-zinc-700 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/60">
                            <p className="text-sm">
                              <span className="font-semibold">{e.company}</span>
                              <span className="text-zinc-500"> — {e.event}</span>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelinePage;