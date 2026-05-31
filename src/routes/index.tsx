import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Mail,
  Sparkles,
  Activity,
  BarChart3,
  Search,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Github,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inboxly — Track Every Internship Application Automatically" },
      {
        name: "description",
        content:
          "Connect Gmail, monitor recruiting updates, and manage your entire internship journey from a single dashboard.",
      },
      { property: "og:title", content: "Inboxly — Internship Application Tracker" },
      {
        property: "og:description",
        content:
          "Personal recruiting CRM that auto-tracks internship applications from Gmail.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Inbox className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Inboxly</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#" className="hover:text-foreground">Docs</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/app">Open dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> AI-powered Gmail sync
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
            Track every internship application{" "}
            <span className="text-muted-foreground">automatically.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Connect Gmail, monitor recruiting updates, and manage your entire internship
            journey from a single dashboard.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/app">
                Open Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="mt-16 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="ml-3 text-xs text-muted-foreground">inboxly.app/dashboard</div>
          </div>
          <div className="grid grid-cols-4 gap-4 p-6">
            {[
              { label: "Applications", value: "12" },
              { label: "Active", value: "8" },
              { label: "Interviews", value: "3" },
              { label: "Offers", value: "1" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-6 py-4">
            <div className="space-y-2 text-sm">
              {[
                ["Uber", "OA Received"],
                ["Amazon", "Interview Scheduled"],
                ["Stripe", "Offer extended"],
              ].map(([c, e]) => (
                <div key={c} className="flex items-center justify-between py-1.5">
                  <span className="font-medium">{c}</span>
                  <span className="text-muted-foreground">{e}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature preview */}
      <section id="features" className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
            {[
              { icon: Mail, title: "Gmail Sync", desc: "Real-time sync with your inbox." },
              { icon: Sparkles, title: "AI Extraction", desc: "Parse offers, OAs, rejections." },
              { icon: Activity, title: "Timeline Tracking", desc: "Every step, on one feed." },
              { icon: BarChart3, title: "Analytics", desc: "Funnel & response insights." },
            ].map((f) => (
              <div key={f.title} className="bg-background p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Four steps from inbox chaos to organized pipeline.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { n: "01", t: "Connect Gmail", d: "Secure OAuth, read-only access." },
            { n: "02", t: "Auto-detect emails", d: "Recruiter messages are surfaced." },
            { n: "03", t: "Statuses updated", d: "Applications progress automatically." },
            { n: "04", t: "Unified dashboard", d: "Track everything in one place." },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-mono text-muted-foreground">{s.n}</p>
              <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">Built for the job hunt</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Mail, t: "Recruitment Detection", d: "Smart filters surface only recruiting emails." },
              { icon: Activity, t: "Application Timeline", d: "See every milestone for every company." },
              { icon: Sparkles, t: "Smart Status Updates", d: "OA, interview, rejection — all detected." },
              { icon: BarChart3, t: "Analytics", d: "Response rate, funnel, and trends." },
              { icon: Search, t: "Search & Filtering", d: "Find any application in seconds." },
              { icon: ShieldCheck, t: "Privacy First", d: "Your data stays yours. End-to-end encrypted." },
            ].map((f) => (
              <div key={f.t} className="rounded-lg border border-border p-6">
                <f.icon className="h-5 w-5" />
                <h3 className="mt-4 text-sm font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Inbox className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Inboxly</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Product</a>
            <a href="#" className="hover:text-foreground">Documentation</a>
            <a href="#" className="inline-flex items-center gap-1 hover:text-foreground"><Github className="h-3.5 w-3.5" />GitHub</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

void CheckCircle2;
