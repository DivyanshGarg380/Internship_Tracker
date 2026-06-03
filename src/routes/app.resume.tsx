import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Download, FileText, Printer, RotateCcw, Save } from "lucide-react";

export const Route = createFileRoute("/app/resume")({
  head: () => ({
    meta: [
      { title: "Resume Editor — Inboxly" },
      { name: "description", content: "Edit your resume in LaTeX on-site." },
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

type RenderResult = {
  html: string;
  warnings: string[];
};

function ResumePage() {
  const [tex, setTex] = useState<string>(DEFAULT_TEX);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [debouncedTex, setDebouncedTex] = useState<string>(DEFAULT_TEX);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTex(stored);
        setDebouncedTex(stored);
      }
    } catch {
      // Browser storage can be blocked in private/restricted contexts.
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, tex);
        setSavedAt(new Date());
      } catch {
        // Keep editing usable even if persistence fails.
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [tex]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedTex(tex), 250);
    return () => window.clearTimeout(id);
  }, [tex]);

  const lineCount = useMemo(() => tex.split("\n").length, [tex]);
  const rendered = useMemo(() => renderLatexResume(debouncedTex), [debouncedTex]);
  const previewDoc = useMemo(() => buildPreviewDoc(rendered), [rendered]);

  const onDownload = () => {
    downloadFile("resume.tex", tex, "application/x-tex");
    toast.success("Downloaded resume.tex");
  };

  const onDownloadHtml = () => {
    downloadFile("resume.html", previewDoc, "text/html");
    toast.success("Downloaded resume.html");
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(tex);
    toast.success("Copied LaTeX to clipboard");
  };

  const onReset = () => {
    if (!window.confirm("Reset to the default template? Your current edits will be lost.")) return;
    setTex(DEFAULT_TEX);
    setDebouncedTex(DEFAULT_TEX);
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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = tex.slice(0, start) + "  " + tex.slice(end);
    setTex(next);
    window.requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit LaTeX-style resume code with a standalone on-site preview. Autosaved locally
            {savedAt && <span> · last saved {savedAt.toLocaleTimeString()}</span>}.
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
          <Button variant="outline" size="sm" onClick={onDownloadHtml}>
            <Download className="mr-1.5 h-4 w-4" /> .html
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
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
                <TabsTrigger value="preview" className="text-xs">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">
                  HTML
                </TabsTrigger>
              </TabsList>
              <span className="text-xs text-muted-foreground">
                {rendered.warnings.length ? `${rendered.warnings.length} warning` : "Offline renderer"}
              </span>
            </div>
            <TabsContent value="preview" className="m-0 flex-1 overflow-hidden bg-muted/30">
              <iframe
                ref={iframeRef}
                title="Resume preview"
                className="h-[calc(100vh-280px)] min-h-[480px] w-full border-0 bg-white"
                srcDoc={previewDoc}
              />
            </TabsContent>
            <TabsContent value="raw" className="m-0 flex-1 overflow-auto">
              <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-muted-foreground">
                {rendered.html}
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

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderLatexResume(source: string): RenderResult {
  const warnings = collectWarnings(source);
  const documentBody = extractDocumentBody(source);
  const lines = documentBody.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (line === String.raw`\begin{center}`) {
      const centered: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== String.raw`\end{center}`) {
        centered.push(lines[index].trim());
        index += 1;
      }
      html.push(`<div class="center-block">${renderLineBreaks(centered.join("\n"))}</div>`);
      continue;
    }

    const section = line.match(/^\\section\*?\{(.+)\}$/);
    if (section) {
      html.push(`<h2>${renderInline(section[1])}</h2>`);
      continue;
    }

    if (line === String.raw`\begin{itemize}`) {
      const items: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== String.raw`\end{itemize}`) {
        const item = lines[index].trim().replace(/^\\item\s*/, "");
        if (item) items.push(`<li>${renderInline(stripLineBreak(item))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    html.push(renderParagraph(line));
  }

  return { html: html.join("\n"), warnings };
}

function collectWarnings(source: string): string[] {
  const warnings: string[] = [];
  const openItemize = (source.match(/\\begin\{itemize\}/g) ?? []).length;
  const closeItemize = (source.match(/\\end\{itemize\}/g) ?? []).length;
  const openCenter = (source.match(/\\begin\{center\}/g) ?? []).length;
  const closeCenter = (source.match(/\\end\{center\}/g) ?? []).length;
  const openBraces = (source.match(/\{/g) ?? []).length;
  const closeBraces = (source.match(/}/g) ?? []).length;

  if (openItemize !== closeItemize) warnings.push("itemize blocks are not balanced");
  if (openCenter !== closeCenter) warnings.push("center blocks are not balanced");
  if (openBraces !== closeBraces) warnings.push("curly braces are not balanced");
  return warnings;
}

function extractDocumentBody(source: string) {
  const match = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  return match?.[1] ?? source.replace(/^\\documentclass(?:\[[^\]]*])?\{[^}]+}\s*/m, "").replace(/^\\usepackage(?:\[[^\]]*])?\{[^}]+}\s*/gm, "");
}

function renderParagraph(line: string) {
  const cleaned = stripLineBreak(line);
  if (cleaned.includes(String.raw`\hfill`)) {
    const [left, ...rightParts] = cleaned.split(String.raw`\hfill`);
    return `<p class="row"><span>${renderInline(left)}</span><span>${renderInline(rightParts.join(" "))}</span></p>`;
  }
  return `<p>${renderInline(cleaned)}</p>`;
}

function renderLineBreaks(value: string) {
  return value
    .split(/\\(?:\[[^\]]*])?\s*\n?|\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<div>${renderInline(stripLineBreak(part))}</div>`)
    .join("");
}

function stripLineBreak(value: string) {
  return value.replace(/\\(?:\[[^\]]*])?\s*$/g, "").trim();
}

function renderInline(value: string): string {
  let output = escapeHtml(value);

  output = output.replace(/\{\\(Huge|huge|LARGE|Large|large)\s+([\s\S]*?)}/g, (_match, size, content) => {
    const className = size === "Huge" || size === "huge" ? "huge" : "large";
    return `<span class="${className}">${content}</span>`;
  });

  output = replaceCommand(output, "href", (url, text) => {
    const safeUrl = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") ? url : "#";
    return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  output = replaceCommand(output, "textbf", (_unused, text) => `<strong>${text}</strong>`);
  output = replaceCommand(output, "textit", (_unused, text) => `<em>${text}</em>`);
  output = replaceCommand(output, "emph", (_unused, text) => `<em>${text}</em>`);
  output = replaceCommand(output, "underline", (_unused, text) => `<u>${text}</u>`);

  return output
    .replace(/\\textbar\{}/g, "|")
    .replace(/\$\\cdot\$/g, "·")
    .replace(/\\cdot/g, "·")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\\$/g, "$ ")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/~/g, " ")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*])?(?:\{[^}]*})?/g, "")
    .trim();
}

function replaceCommand(
  value: string,
  command: string,
  replacer: (firstArg: string, secondArg: string) => string,
) {
  if (command === "href") {
    return value.replace(/\\href\{([^}]*)}\{([^}]*)}/g, (_match, firstArg, secondArg) => replacer(firstArg, secondArg));
  }
  const pattern = new RegExp(String.raw`\\${command}\{([^{}]*(?:\{[^{}]*}[^{}]*)*)}`, "g");
  return value.replace(pattern, (_match, content) => replacer("", content));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPreviewDoc(result: RenderResult): string {
  const warningHtml = result.warnings.length
    ? `<div class="warnings"><strong>Rendered with warnings:</strong> ${result.warnings.map(escapeHtml).join(", ")}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root{color-scheme:light;}
  html,body{margin:0;background:#f4f4f5;}
  body{padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#111827;}
  .sheet{box-sizing:border-box;max-width:816px;min-height:1056px;margin:0 auto;background:#fff;padding:54px 64px;box-shadow:0 1px 3px rgba(15,23,42,.10);border:1px solid #e4e4e7;border-radius:4px;}
  .center-block{text-align:center;margin-bottom:22px;line-height:1.35;}
  .huge{font-size:30px;line-height:1.1;font-weight:700;}
  .large{font-size:20px;line-height:1.2;font-weight:700;}
  h2{margin:18px 0 8px;padding-bottom:3px;border-bottom:1px solid #18181b;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.2;letter-spacing:.08em;text-transform:uppercase;}
  p{margin:3px 0;font-size:13px;line-height:1.42;}
  .row{display:flex;align-items:baseline;justify-content:space-between;gap:20px;}
  .row span:last-child{white-space:nowrap;text-align:right;}
  ul{margin:4px 0 10px 19px;padding:0;}
  li{margin:2px 0;font-size:13px;line-height:1.38;}
  a{color:#1d4ed8;text-decoration:none;}
  strong{font-weight:700;} em{font-style:italic;}
  .warnings{max-width:816px;box-sizing:border-box;margin:0 auto 10px;padding:10px 12px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:6px;font:12px/1.4 Arial,Helvetica,sans-serif;}
  @page{size:letter;margin:.5in;}
  @media print{
    html,body{background:#fff;padding:0;}
    .warnings{display:none;}
    .sheet{min-height:auto;max-width:none;margin:0;padding:0;box-shadow:none;border:0;border-radius:0;}
  }
</style>
</head>
<body>${warningHtml}<main class="sheet">${result.html}</main></body>
</html>`;
}