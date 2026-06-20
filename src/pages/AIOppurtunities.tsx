import { useCallback, useEffect, useState } from "react";
import {
  Sparkles, Play, Loader2, CheckCircle2, XCircle,
  ExternalLink, MapPin, Building2, RefreshCw, Inbox,
  TrendingUp, Clock, AlertCircle
} from "lucide-react";
import {
  getQueueItems, reviewQueueItem, acceptAndApply,
  triggerAgentRun, getLastAgentRun,
  type QueueItem, type AgentRunLog,
} from "@/lib/agent";
import { timeAgo } from "@/lib/applications";
import { toast } from "sonner";

function MatchRing({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-green-500" :
    score >= 65 ? "text-amber-500" :
    "text-muted-foreground";

  return (
    <div className={`flex flex-col items-center justify-center ${color}`}>
      <span className="text-2xl font-bold leading-none">{score}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">match</span>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const cls =
    confidence >= 85 ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" :
    confidence >= 65 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
    "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      AI {confidence}% confident
    </span>
  );
}

function JobCard({ item, onDecision }: { item: QueueItem; onDecision: () => void }) {
  const [actioning, setActioning] = useState<"accept" | "reject" | null>(null);

  const handleAccept = async () => {
    setActioning("accept");
    const { error } = await acceptAndApply(item);
    if (error) toast.error(error);
    else toast.success(`Added ${item.company} to your applications!`);
    setActioning(null);
    onDecision();
  };

  const handleReject = async () => {
    setActioning("reject");
    const { error } = await reviewQueueItem(item.id, "rejected");
    if (error) toast.error(error);
    setActioning(null);
    onDecision();
  };

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Company avatar */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold uppercase">
            {item.company.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{item.company}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.role}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <MatchRing score={item.match_score} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        {item.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {item.location}
          </span>
        )}
        <ConfidencePill confidence={item.ai_confidence} />
      </div>

      {/* AI Reasoning */}
      {item.ai_reasoning.length > 0 && (
        <div className="mx-5 mb-3 rounded-lg bg-muted/40 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Why this role
          </p>
          <ul className="space-y-1">
            {item.ai_reasoning.slice(0, 3).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-border p-4">
        <button
          onClick={handleAccept}
          disabled={!!actioning}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {actioning === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Accept & Apply
        </button>
        <button
          onClick={handleReject}
          disabled={!!actioning}
          className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive disabled:opacity-60"
        >
          {actioning === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={item.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function AgentStatusBanner({
  run, onRefresh, onForceStop,
}: { run: AgentRunLog | null; onRefresh: () => void; onForceStop: () => void }) {
  if (!run) return null;
  const isRunning = run.status === "running";
  const icon = isRunning
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : run.status === "completed"
    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
    : <AlertCircle className="h-4 w-4 text-destructive" />;

  const hasProgress = isRunning && run.jobs_total && run.jobs_total > 0;

  const text = isRunning
    ? run.current_step ?? "Agent is running — discovering opportunities..."
    : run.status === "completed"
    ? `Last run: found ${run.jobs_discovered} jobs, queued ${run.jobs_queued} · ${timeAgo(run.completed_at!)}`
    : `Last run failed: ${run.error_message}`;

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
      isRunning ? "border-primary/30 bg-primary/5" :
      run.status === "completed" ? "border-border bg-muted/30" :
      "border-destructive/30 bg-destructive/5"
    }`}>
      {icon}
      <span className="flex-1 text-muted-foreground">
        {text}
        {hasProgress && (
          <span className="ml-1 font-medium text-foreground">
            ({run.jobs_processed ?? 0} of {run.jobs_total})
          </span>
        )}
      </span>
      {isRunning ? (
        <button onClick={onForceStop} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          Stop watching
        </button>
      ) : (
        <button onClick={onRefresh} className="flex items-center gap-1 text-xs hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      )}
    </div>
  );
}

export default function AIOpportunities() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [lastRun, setLastRun] = useState<AgentRunLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [q, r] = await Promise.all([getQueueItems("pending"), getLastAgentRun()]);
    setItems(q);
    setLastRun(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (lastRun?.status !== "running") return;

    const pollStartedAt = Date.now();
    const FRONTEND_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes — beyond the 4-min backend cap

    const interval = setInterval(async () => {
      if (Date.now() - pollStartedAt > FRONTEND_TIMEOUT_MS) {
        clearInterval(interval);
        setRunning(false);
        toast.error("Agent run timed out. It may still finish in the background — check back shortly.");
        return;
      }

      const [q, r] = await Promise.all([getQueueItems("pending"), getLastAgentRun()]);
      setItems(q);
      setLastRun(r);
      if (r?.status !== "running") {
        clearInterval(interval);
        setRunning(false);
        if (r?.status === "completed") {
          toast.success(`Agent found ${r.jobs_queued} new opportunities!`);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [lastRun?.status]);

  const handleRun = async () => {
    setRunning(true);
    const { error } = await triggerAgentRun();
    if (error) {
      toast.error(error);
      setRunning(false);
    } else {
      toast.info("Agent started — this can take a few minutes.");
      setTimeout(load, 1000);
    }
  };

  const handleForceStop = async () => {
    setRunning(false);
    setLastRun((prev) => prev ? { ...prev, status: "failed", error_message: "Stopped manually." } : prev);
    toast.info("Stopped watching this run. It may still be finishing in the background.");
  };

  const stats = {
    pending: items.length,
    highMatch: items.filter((i) => i.match_score >= 85).length,
    avgScore: items.length
      ? Math.round(items.reduce((s, i) => s + i.match_score, 0) / items.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">AI Opportunities</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Jobs discovered from company career pages, ranked and reasoned by AI.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running || lastRun?.status === "running"}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {running || lastRun?.status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Agent
        </button>
      </div>

      {/* Agent status */}
      <AgentStatusBanner run={lastRun} onRefresh={load} onForceStop={handleForceStop} />

      {/* Stats row */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "In Queue", value: stats.pending, icon: Inbox },
            { label: "High Match (85+)", value: stats.highMatch, icon: TrendingUp },
            { label: "Avg Match Score", value: `${stats.avgScore}%`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-1.5 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No opportunities yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Make sure your resume is uploaded and preferences are set, then click{" "}
              <span className="font-medium text-foreground">Run Agent</span> to discover jobs.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <a href="/resume" className="underline hover:no-underline">Upload resume</a>
            <span>·</span>
            <a href="/preferences" className="underline hover:no-underline">Set preferences</a>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <JobCard key={item.id} item={item} onDecision={load} />
          ))}
        </div>
      )}
    </div>
  );
}