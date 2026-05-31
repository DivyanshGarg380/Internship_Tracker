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
  ExternalLink,
  FileText,
  Save,
} from "lucide-react";

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

const DEFAULT_TEX = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage{hyperref}
\usepackage{titlesec}

\titleformat{\section}{\large\bfseries\uppercase}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=2pt}
\pagestyle{empty}

\begin{document}

\begin{center}
  {\Huge \textbf{Alex Kim}} \\[4pt]
  Stanford, CA $\cdot$ alex@stanford.edu $\cdot$ (555) 123-4567 \\
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
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  // Submits the .tex to Overleaf which compiles it to a real PDF in a new tab.
  const overleafFormRef = useRef<HTMLFormElement>(null);
  const onOpenInOverleaf = () => overleafFormRef.current?.submit();

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
            Edit your resume in LaTeX. Autosaved locally
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
          <Button size="sm" onClick={onOpenInOverleaf}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Compile in Overleaf
          </Button>
        </div>
      </div>

      {/* Hidden form that POSTs the snippet to Overleaf for real PDF compilation */}
      <form
        ref={overleafFormRef}
        action="https://www.overleaf.com/docs"
        method="POST"
        target="_blank"
        className="hidden"
      >
        <input type="hidden" name="snip" value={tex} />
        <input type="hidden" name="snip_name" value="resume.tex" />
        <input type="hidden" name="engine" value="pdflatex" />
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> resume.tex
            </div>
            <div className="text-xs text-muted-foreground">{lineCount} lines</div>
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
                Approximate render · use Overleaf for the real PDF
              </span>
            </div>
            <TabsContent value="preview" className="m-0 flex-1 overflow-auto bg-muted/30 p-6">
              <div className="mx-auto max-w-2xl rounded-md border border-border bg-white p-10 text-[13px] leading-relaxed text-zinc-900 shadow-sm">
                <LatexPreview source={tex} />
              </div>
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

/**
 * Minimal LaTeX-to-HTML preview tailored to resume-style documents.
 * Not a full LaTeX engine — supports common commands used in resumes.
 */
function LatexPreview({ source }: { source: string }) {
  const html = useMemo(() => renderLatex(source), [source]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderLatex(input: string): string {
  // Extract the document body
  const beginIdx = input.indexOf("\\begin{document}");
  const endIdx = input.indexOf("\\end{document}");
  let body =
    beginIdx >= 0 && endIdx > beginIdx
      ? input.slice(beginIdx + "\\begin{document}".length, endIdx)
      : input;

  // Strip comments
  body = body.replace(/(^|[^\\])%[^\n]*/g, "$1");

  // Handle environments
  body = body.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_, inner) => `<div style="text-align:center">${inner}</div>`,
  );

  body = body.replace(
    /\\begin\{itemize\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{itemize\}/g,
    (_, inner: string) => {
      const items = inner
        .split(/\\item\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((it) => `<li>${it}</li>`) // commands inside processed below
        .join("");
      return `<ul style="margin:6px 0 10px 20px;list-style:disc">${items}</ul>`;
    },
  );

  body = body.replace(
    /\\begin\{enumerate\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{enumerate\}/g,
    (_, inner: string) => {
      const items = inner
        .split(/\\item\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((it) => `<li>${it}</li>`)
        .join("");
      return `<ol style="margin:6px 0 10px 22px;list-style:decimal">${items}</ol>`;
    },
  );

  // Escape HTML now (after structural transforms inserted safe tags)
  // We need to escape only the textual parts. Simpler: escape the whole thing
  // then unescape our injected tags by working with a token approach.
  // Use a token map.
  const tokens: string[] = [];
  body = body.replace(/<[^>]+>/g, (m) => {
    tokens.push(m);
    return `\u0000${tokens.length - 1}\u0000`;
  });
  body = escapeHtml(body);
  body = body.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);

  // Sections
  body = body.replace(
    /\\section\*?\{([^}]*)\}/g,
    (_, t) =>
      `<h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #d4d4d8;margin:14px 0 6px;padding-bottom:2px">${t}</h2>`,
  );
  body = body.replace(
    /\\subsection\*?\{([^}]*)\}/g,
    (_, t) => `<h3 style="font-size:13px;font-weight:600;margin:10px 0 4px">${t}</h3>`,
  );

  // Text styling
  body = body.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
  body = body.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>");
  body = body.replace(/\\uppercase\{([^}]*)\}/g, (_, t) => String(t).toUpperCase());

  // Sizing macros (very rough)
  body = body.replace(/\{\\Huge\s+([^}]*)\}/g, '<span style="font-size:26px;font-weight:700">$1</span>');
  body = body.replace(/\{\\LARGE\s+([^}]*)\}/g, '<span style="font-size:20px">$1</span>');
  body = body.replace(/\{\\Large\s+([^}]*)\}/g, '<span style="font-size:17px">$1</span>');
  body = body.replace(/\{\\large\s+([^}]*)\}/g, '<span style="font-size:15px">$1</span>');
  body = body.replace(/\{\\small\s+([^}]*)\}/g, '<span style="font-size:11px">$1</span>');

  // Links
  body = body.replace(
    /\\href\{([^}]*)\}\{([^}]*)\}/g,
    (_, url, label) => `<a href="${url}" style="color:#2563eb;text-decoration:underline" target="_blank" rel="noreferrer">${label}</a>`,
  );
  body = body.replace(
    /\\url\{([^}]*)\}/g,
    (_, url) => `<a href="${url}" style="color:#2563eb;text-decoration:underline" target="_blank" rel="noreferrer">${url}</a>`,
  );

  // \hfill -> push right
  body = body.replace(
    /([^\n]*?)\\hfill\s*([^\n]*)/g,
    (_, l, r) => `<div style="display:flex;justify-content:space-between;gap:12px"><span>${l}</span><span>${r}</span></div>`,
  );

  // Math-ish: $\cdot$ and $\bullet$
  body = body.replace(/\$\\cdot\$/g, "·");
  body = body.replace(/\$\\bullet\$/g, "•");
  body = body.replace(/\\&/g, "&amp;");
  body = body.replace(/\\%/g, "%");
  body = body.replace(/\\\$/g, "$");
  body = body.replace(/\\_/g, "_");
  body = body.replace(/~/g, "&nbsp;");

  // Line breaks: \\ or \\[Xpt]
  body = body.replace(/\\\\(\[[^\]]*\])?/g, "<br/>");

  // Drop remaining unsupported commands like \pagestyle{...}, \titleformat{...}, etc.
  body = body.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?\{[^}]*\}/g, "");
  body = body.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, "");

  // Paragraphs from blank lines
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:6px 0">${p.replace(/\n/g, " ")}</p>`)
    .join("");

  return paragraphs;
}