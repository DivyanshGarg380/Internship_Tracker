import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, Loader2, AlertCircle,
  Sparkles, Code2, Layers, GraduationCap, User
} from "lucide-react";
import { supabase } from "../../supabase/client";
import {
  uploadResume, getLatestResume, getCandidateProfile,
  triggerResumeparse, type CandidateProfile, type ResumeDocument,
} from "@/lib/agent";
import { toast } from "sonner";

export default function ResumeSetup() {
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([getLatestResume(), getCandidateProfile()]);
    setResume(r);
    setProfile(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (resume?.status !== "pending") return;
    const interval = setInterval(async () => {
      const r = await getLatestResume();
      setResume(r);
      if (r?.status !== "pending") {
        clearInterval(interval);
        const p = await getCandidateProfile();
        setProfile(p);
        setParsing(false);
        if (r?.status === "parsed") toast.success("Resume parsed successfully!");
        else toast.error("Resume parsing failed. Try again.");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [resume?.status]);

  async function handleFile(file: File) {
    if (!file) return;
    const validTypes = ["application/pdf", "text/plain", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }

    setUploading(true);
    const { path, error } = await uploadResume(file);
    if (error) { toast.error(error); setUploading(false); return; }

    setUploading(false);
    setParsing(true);

    const r = await getLatestResume();
    setResume(r);

    const { error: parseError } = await triggerResumeparse(path);
    if (parseError) {
      toast.error("Could not start parsing: " + parseError);
      setParsing(false);
    } else {
      toast.info("Parsing your resume with AI...");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  async function createResumeBucket() {
    const { error } = await supabase.storage.createBucket("resumes", { public: false });
    if (error && !error.message.includes("already exists")) {
      toast.error("Bucket error: " + error.message);
    } else {
      toast.success("Storage bucket ready.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resume Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume once. The AI agent will parse it and build your candidate profile.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && !parsing && fileRef.current?.click()}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors
          ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
          ${(uploading || parsing) ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={onFileChange} />

        {uploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Uploading resume...</p>
          </>
        ) : parsing ? (
          <>
            <Sparkles className="h-10 w-10 animate-pulse text-primary" />
            <p className="font-medium">AI is parsing your resume...</p>
            <p className="text-sm text-muted-foreground">This takes about 10–20 seconds</p>
          </>
        ) : resume?.status === "parsed" ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-green-600 dark:text-green-400">Resume uploaded & parsed</p>
            <p className="text-sm text-muted-foreground">{resume.file_name}</p>
            <p className="text-xs text-muted-foreground">Drop a new file to re-parse</p>
          </>
        ) : resume?.status === "failed" ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium text-destructive">Parsing failed</p>
            <p className="text-sm text-muted-foreground">Drop a new resume to try again</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Drop your resume here</p>
              <p className="text-sm text-muted-foreground">PDF, DOC, DOCX, or TXT · Max 5MB</p>
            </div>
          </>
        )}
      </div>

      {/* Parsed Profile */}
      {profile && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">AI-Extracted Candidate Profile</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Summary */}
            {profile.raw_summary && (
              <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Summary
                </div>
                <p className="text-sm text-muted-foreground">{profile.raw_summary}</p>
              </div>
            )}

            {/* Skills */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Code2 className="h-4 w-4" />
                Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Domains */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4" />
                Domains
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.domains.map((d) => (
                  <span key={d} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="h-4 w-4" />
                Education
              </div>
              <p className="text-sm">{(profile.education as Record<string, string>)?.school ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {(profile.education as Record<string, string>)?.degree} ·{" "}
                Class of {profile.graduation_year ?? "—"}
              </p>
            </div>

            {/* Preferred Roles */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Preferred Roles
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferred_roles.map((r) => (
                  <span key={r} className="rounded-md border border-border px-2 py-0.5 text-xs">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage setup note */}
      {!resume && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-medium">First time?</p>
          <p className="mt-0.5">
            Make sure the <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">resumes</code> storage bucket
            exists in your Supabase project.{" "}
            <button onClick={createResumeBucket} className="underline hover:no-underline">
              Create it now
            </button>
          </p>
        </div>
      )}
    </div>
  );
}