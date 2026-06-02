import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Download,
  Copy,
  RotateCcw,
  FileText,
  Save,
  Printer,
  RefreshCw,
} from "lucide-react";
// @ts-expect-error - latex.js ships without bundled types
import { HtmlGenerator, parse } from "latex.js";

export const Route = createFileRoute("/app/resume")({
  head: () => ({
    meta: [
      { title: "Resume Editor — Inboxly" },
      { name: "description", content: "Edit your resume in LaTeX." },
    ],
  }),
  component: ResumePage,
});

const STORAGE_KEY = "inboxly:resume:tex";

const DEFAULT_TEX = String.raw`\documentclass{article}
\usepackage{hyperref}

\begin{document}

\begin{center}
  {\Huge \textbf{Alex Kim}} \\[4pt]
  Stanford, CA \textbar{} alex@stanford.edu \textbar{} (555) 123-4567 \\
  \href{https://github.com/alexk}{github.com/alexk} $\cdot$ \href{https://linkedin.com/in/alexk}{linkedin.com/in/alexk}
\end{center}

\section{Education}
\textbf{Stanford University} \hfill \textit{Sep 2023 -- Jun 2027} \\
B.S. in Computer Science, GPA: 3.9/4.0 \\
Relevant coursework: Algorithms, Distributed Systems, Machine Learning

\section{Experience}
\textbf{Stripe} -- Software Engineering Intern \hfill \textit{Summer 2025} \\
\begin{itemize}
  \item Built a real-time fraud detection pipeline processing 10M+ events/day.
  \item Reduced p99 latency of payment webhooks by 38\% via batching.
\end{itemize}

\textbf{Vercel} -- SWE Intern \hfill \textit{Summer 2024} \\
\begin{itemize}
  \item Shipped edge caching layer adopted by 500+ enterprise customers.
  \item Authored RFC for incremental static regeneration on Edge runtime.
\end{itemize}

\section{Projects}
\textbf{Inboxly} -- AI internship tracker \\
\begin{itemize}
  \item Auto-classifies recruiting emails via fine-tuned LLM (94\% F1).
  \item React, TypeScript, TanStack Start, Tailwind.
\end{itemize}

\section{Skills}
\textbf{Languages:} TypeScript, Python, Go, Rust \\
\textbf{Tools:} React, Postgres, Redis, Kafka, AWS, Docker

\end{document}
`;

function ResumePage() {
  const [tex, setTex] = useState<string>(DEFAULT_TEX);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [compiled, setCompiled] = useState<{ html: string; css: string } | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setTex(stored);
    } catch {
      // ignore
    }
  }, []);

  // Debounced autosave
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, tex);
        setSavedAt(new Date());
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(id);
  }, [tex]);

  const lineCount = useMemo(() => tex.split("\n").length, [tex]);

  const compile = useMemo(
    () => (source: string) => {
      setIsCompiling(true);
      try {
        const generator = new HtmlGenerator({ hyphenate: false });
        const doc = parse(source, { generator }).htmlDocument();
        const body = doc.body?.innerHTML ?? "";
        const styleNodes = Array.from(
          doc.head?.querySelectorAll("style, link[rel='stylesheet']") ?? [],
        ) as Element[];
        const css = styleNodes
          .map((n) => {
            if (n.tagName === "STYLE") return n.textContent ?? "";
            const href = (n as HTMLLinkElement).href;
            return `@import url("${href}");`;
          })
          .join("\n");
        setCompiled({ html: body, css });
        setCompileError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setCompileError(msg);
      } finally {
        setIsCompiling(false);
      }
    },
    [],
  );

  // Auto-compile (debounced) when source changes
  useEffect(() => {
    if (!autoCompile) return;
    const id = setTimeout(() => compile(tex), 400);
    return () => clearTimeout(id);
  }, [tex, autoCompile, compile]);

  const onDownload = () => {
    const blob = new Blob([tex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.tex";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded resume.tex");
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(tex);
    toast.success("Copied LaTeX to clipboard");
  };

  const onReset = () => {
    if (!confirm("Reset to the default template? Your current edits will be lost.")) return;
    setTex(DEFAULT_TEX);
    toast.message("Template restored");
  };

  const onSaveNow = () => {
    try {
      localStorage.setItem(STORAGE_KEY, tex);
      setSavedAt(new Date());
      toast.success("Saved");
    } catch {
      toast.error("Could not save");
    }
  };

  const onPrint = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      toast.error("Preview not ready");
      return;
    }
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  // Tab support inside the textarea
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = tex.slice(0, start) + "  " + tex.slice(end);
      setTex(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit your resume in LaTeX — compiled live in your browser. Autosaved locally
            {savedAt && (
              <span> · last saved {savedAt.toLocaleTimeString()}</span>
            )}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSaveNow}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="mr-1.5 h-4 w-4" /> .tex
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => compile(tex)} disabled={isCompiling}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isCompiling ? "animate-spin" : ""}`} /> Recompile
          </Button>
          <Button size="sm" onClick={onPrint}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> resume.tex
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autoCompile}
                  onChange={(e) => setAutoCompile(e.target.checked)}
                  className="h-3 w-3 accent-current"
                />
                Auto-compile
              </label>
              <span>{lineCount} lines</span>
            </div>
          </div>
          <div className="relative flex h-[calc(100vh-280px)] min-h-[480px]">
            <LineGutter count={lineCount} />
            <textarea
              ref={taRef}
              value={tex}
              onChange={(e) => setTex(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              className="h-full flex-1 resize-none border-0 bg-background px-3 py-2 font-mono text-[13px] leading-6 text-foreground outline-none focus:ring-0"
            />
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <Tabs defaultValue="preview" className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">Raw</TabsTrigger>
              </TabsList>
              <span className="text-xs text-muted-foreground">
                {compileError ? "Compile error" : isCompiling ? "Compiling…" : "Compiled in-browser"}
              </span>
            </div>
            <TabsContent value="preview" className="m-0 flex-1 overflow-hidden bg-muted/30">
              {compileError ? (
                <pre className="m-4 max-h-full overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  {compileError}
                </pre>
              ) : (
                <iframe
                  ref={iframeRef}
                  title="Resume preview"
                  className="h-[calc(100vh-280px)] min-h-[480px] w-full border-0 bg-white"
                  srcDoc={buildPreviewDoc(compiled)}
                />
              )}
            </TabsContent>
            <TabsContent value="raw" className="m-0 flex-1 overflow-auto">
              <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-muted-foreground">
                {tex}
              </pre>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function LineGutter({ count }: { count: number }) {
  return (
    <div
      aria-hidden
      className="select-none overflow-hidden border-r border-border bg-muted/30 px-2 py-2 text-right font-mono text-[12px] leading-6 text-muted-foreground/70"
      style={{ minWidth: 44 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

function buildPreviewDoc(compiled: { html: string; css: string } | null): string {
  const body = compiled?.html ?? '<p style="color:#888;font-family:sans-serif;padding:2rem">Compiling…</p>';
  const css = compiled?.css ?? "";
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  html,body{margin:0;background:#f4f4f5}
  body{padding:32px 16px;font-family: 'Latin Modern Roman', 'Times New Roman', serif}
  .page{max-width:780px;margin:0 auto;background:#fff;padding:56px 64px;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e4e4e7;border-radius:4px;color:#111}
  a{color:#2563eb}
  @media print{
    html,body{background:#fff}
    body{padding:0}
    .page{box-shadow:none;border:0;padding:0;max-width:none}
  }
  ${css}
</style></head><body><div class="page">${body}</div></body></html>`;
}