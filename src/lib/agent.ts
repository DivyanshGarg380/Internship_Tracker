import { supabase } from "../../supabase/client";

export interface CandidateProfile {
    id: string;
    user_id: string;
    skills: string[];
    domains: string[];
    experience_level: string;
    graduation_year: number | null;
    preferred_roles: string[];
    projects: Record<string, unknown>[];
    education: Record<string, unknown>;
    raw_summary: string | null;
    created_at: string;
    updated_at: string;
};

export interface ResumeDocument {
    id: string;
    user_id: string;
    file_name: string;
    storage_path: string;
    parsed_at: string | null;
    status: "pending" | "parsed" | "failed";
    created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_roles: string[];
  preferred_locations: string[];
  graduation_year: number | null;
  experience_level: string;
  preferred_companies: string[];
  rejected_categories: string[];
  accepted_categories: string[];
  target_companies: string[];
  role_weights: Record<string, number>;
  company_weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface JobSource {
  id: string;
  company: string;
  careers_url: string;
  api_type: string;
  api_endpoint: string | null;
  logo_url: string | null;
  tier: number;
  active: boolean;
  last_crawled_at: string | null;
}

export interface QueueItem {
  id: string;
  user_id: string;
  discovered_job_id: string;
  status: "pending" | "accepted" | "rejected" | "applied" | "failed";
  company: string;
  role: string;
  location: string | null;
  apply_url: string;
  match_score: number;
  ai_confidence: number;
  ai_reasoning: string[];
  logo_url: string | null;
  user_notes: string | null;
  queued_at: string;
  reviewed_at: string | null;
}

export interface AgentRunLog {
  id: string;
  user_id: string;
  status: "running" | "completed" | "failed";
  jobs_discovered: number;
  jobs_queued: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export async function uploadResume(file : File): Promise<{path: string; error: string | null}> {
    const { data: { user }} = await supabase.auth.getUser();
    if(!user) return { path: "", error: "Not authenticated" };
    
    const ext = file.name.split(".").pop();
    const path = `${user.id}/resume_${Date.now()}.${ext}`;

    const {error: uploadError} = await supabase.storage.from("resume").upload(path, file, {upsert: true});
    if(uploadError) return {path: "", error: uploadError.message};

    await supabase.from("resume_docuemnts").insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        status: "pending",
    });

    return { path, error: null };
}

export async function getLatestResume(): Promise<ResumeDocument | null> {
    const { data } = await supabase.from("resume_documents").select("*").order("created_at", {ascending: false}).limit(1).maybeSingle();
    return data as ResumeDocument | null;
}

export async function getCandidateProfile(): Promise<CandidateProfile | null> {
  const { data } = await supabase.from("candidate_profiles").select("*").maybeSingle();
  return data as CandidateProfile | null;
}

export async function getPreferences(): Promise<UserPreferences | null> {
  const { data } = await supabase.from("user_preferences").select("*").maybeSingle();
  return data as UserPreferences | null;
}

export async function upsertPreferences(
  prefs: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
 
  const { error } = await supabase.from("user_preferences").upsert(
    { user_id: user.id, ...prefs },
    { onConflict: "user_id" }
  );
  return { error: error?.message ?? null };
}

// Queue
export async function getQueueItems(status?: QueueItem["status"]): Promise<QueueItem[]> {
  let q = supabase.from("job_queue").select("*").order("match_score", { ascending: false });
 
  if (status) q = q.eq("status", status);
 
  const { data } = await q;
  return (data ?? []) as QueueItem[];
}

export async function reviewQueueItem(id: string, decision: "accepted" | "rejected"): Promise<{ error: string | null }> {
  
  const { error } = await supabase.from("job_queue").update({ status: decision, reviewed_at: new Date().toISOString()}).eq("id", id);
 
  if (!error) {
    const { data: item } = await supabase.from("job_queue").select("company, role").eq("id", id).maybeSingle();
 
    if (item) {
      await supabase.from("user_agent_feedback").insert({
        queue_item_id: id,
        company: (item as { company: string }).company,
        role: (item as { role: string }).role,
        decision,
      });
    }
  }
 
  return { error: error?.message ?? null };
}

export async function acceptAndApply(item: QueueItem): Promise<{ error: string | null }> {
  await supabase.from("job_queue").update({ status: "applied", reviewed_at: new Date().toISOString() }).eq("id", item.id);
 
  const { error } = await supabase.from("applications").insert({
    company: item.company,
    role: item.role,
    location: item.location ?? "Remote",
    status: "Applied",
    applied_date: new Date().toISOString().split("T")[0],
    notes: `Auto-discovered by AI agent. Match score: ${item.match_score}%\n\nAI Reasoning:\n${item.ai_reasoning.map((r) => `• ${r}`).join("\n")}`,
  });

  window.open(item.apply_url, "_blank", "noopener,noreferrer");
 
  return { error: error?.message ?? null };
}

export async function triggerAgentRun(): Promise<{ runId: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("recruiting-agent", {body: { action: "run" }});
 
  if (error) return { runId: null, error: error.message };
  return { runId: (data as { run_id?: string })?.run_id ?? null, error: null };
}
 
export async function triggerResumeparse(storagePath: string): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("recruiting-agent", { body: { action: "parse_resume", storage_path: storagePath } });
  return { error: error?.message ?? null };
}
 
export async function getLastAgentRun(): Promise<AgentRunLog | null> {
  const { data } = await supabase.from("agent_run_log").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
  return data as AgentRunLog | null;
}
 
export async function getJobSources(): Promise<JobSource[]> {
  const { data } = await supabase.from("job_sources").select("*").eq("active", true).order("tier", { ascending: true });
  return (data ?? []) as JobSource[];
}