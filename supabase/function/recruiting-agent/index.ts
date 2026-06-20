import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_MIN_INTERVAL_MS = 13000; 
let lastGeminiCallAt = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGeminiSlot() {
  const now = Date.now();
  const elapsed = now - lastGeminiCallAt;
  if (elapsed < GEMINI_MIN_INTERVAL_MS) {
    await sleep(GEMINI_MIN_INTERVAL_MS - elapsed);
  }
  lastGeminiCallAt = Date.now();
}
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface SearchFilters {
  roles: string[];
  locations: string[];
  graduationYear?: number;
  experienceLevel: string;
}

interface RawJob {
  company: string;
  role: string;
  location: string;
  description: string;
  apply_url: string;
  external_job_id?: string;
  source_id?: string;
  logo_url?: string;
}

interface JobSource {
  id: string;
  company: string;
  careers_url: string;
  api_type: string;
  api_endpoint: string | null;
  tier: number;
}

async function geminiGenerate(prompt: string, jsonMode = false, retriesLeft = 3): Promise<string> {
  await waitForGeminiSlot();

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.status === 429 && retriesLeft > 0) {
    console.error("Gemini generate rate-limited, retrying after backoff:", JSON.stringify(data));
    await sleep(20000); // extra cooldown beyond the normal pacing
    return geminiGenerate(prompt, jsonMode, retriesLeft - 1);
  }

  if (!res.ok) {
    console.error("Gemini generate API error:", res.status, JSON.stringify(data));
    throw new Error(
      `Gemini generate request failed (${res.status}): ${data?.error?.message ?? "unknown error"}`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Gemini generate returned no text:", JSON.stringify(data));
    throw new Error("Gemini generate API returned no content");
  }

  return text;
}

async function geminiEmbedding(text: string, retriesLeft = 3): Promise<number[]> {
  await waitForGeminiSlot();

  const url = `${GEMINI_BASE}/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const body = {
    model: "models/gemini-embedding-001",
    content: { parts: [{ text: text.slice(0, 8000) }] },
    outputDimensionality: 768,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.status === 429 && retriesLeft > 0) {
    console.error("Gemini embedding rate-limited, retrying after backoff:", JSON.stringify(data));
    await sleep(20000);
    return geminiEmbedding(text, retriesLeft - 1);
  }

  if (!res.ok) {
    console.error("Gemini embedding API error:", res.status, JSON.stringify(data));
    throw new Error(
      `Gemini embedding request failed (${res.status}): ${data?.error?.message ?? "unknown error"}`
    );
  }

  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    console.error("Gemini embedding returned no values:", JSON.stringify(data));
    throw new Error("Gemini embedding API returned an empty embedding");
  }

  return values;
}

async function geminiGenerateFromPdf(
  base64Pdf: string,
  prompt: string,
  retriesLeft = 3
): Promise<string> {
  await waitForGeminiSlot();

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: "application/pdf", data: base64Pdf } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.status === 429 && retriesLeft > 0) {
    console.error("Gemini PDF generate rate-limited, retrying after backoff:", JSON.stringify(data));
    await sleep(20000);
    return geminiGenerateFromPdf(base64Pdf, prompt, retriesLeft - 1);
  }

  if (!res.ok) {
    console.error("Gemini PDF generate API error:", res.status, JSON.stringify(data));
    throw new Error(
      `Gemini PDF generate request failed (${res.status}): ${data?.error?.message ?? "unknown error"}`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Gemini PDF generate returned no text:", JSON.stringify(data));
    throw new Error("Gemini PDF generate API returned no content");
  }

  return text;
}

async function parseResume(supabase: ReturnType<typeof createClient>, storagePath: string, userId: string) {
  const { data: fileData, error } = await supabase.storage.from("resumes").download(storagePath);
  if (error || !fileData) throw new Error("Could not download resume: " + error?.message);

  const isPdf = storagePath.toLowerCase().endsWith(".pdf") || fileData.type === "application/pdf";

  const promptInstructions = `
    You are a resume parser. Analyze this resume and extract structured information.
    Return ONLY valid JSON with NO markdown fences.

    Return this exact JSON structure:
    {
      "skills": ["React", "TypeScript", ...],
      "domains": ["Frontend", "Web Development", ...],
      "education": { "school": "...", "degree": "...", "graduationYear": 2027 },
      "experienceLevel": "Intern",
      "projects": [{ "name": "...", "description": "...", "tech": ["..."] }],
      "preferredRoles": ["Software Engineer Intern", "Frontend Engineer Intern"],
      "rawSummary": "2-sentence professional summary of this candidate"
    }
  `;

  let raw: string;

  if (isPdf) {
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Pdf = btoa(binary);

    raw = await geminiGenerateFromPdf(base64Pdf, promptInstructions);
  } else {
    const text = await fileData.text();
    const profilePrompt = `
      ${promptInstructions}

      Resume text:
      """
      ${text.slice(0, 6000)}
      """
    `;
    raw = await geminiGenerate(profilePrompt, true);
  }

  let profile: Record<string, unknown>;
  try {
    profile = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    console.error("Failed to parse Gemini profile JSON. Raw response:", raw);
    throw new Error("Failed to parse Gemini profile response");
  }

  if (!Array.isArray(profile.skills) || profile.skills.length === 0) {
    console.error("Gemini extracted an empty profile. Raw response:", raw);
    throw new Error(
      "Could not extract any information from this resume. Please check the file isn't corrupted or scanned as an image, and try again."
    );
  }

  const summaryForEmbedding = `
    Skills: ${(profile.skills as string[]).join(", ")}.
    Domains: ${(profile.domains as string[]).join(", ")}.
    Experience: ${profile.experienceLevel}.
    ${profile.rawSummary}
  `;
  const embedding = await geminiEmbedding(summaryForEmbedding);

  const { error: upsertError } = await supabase.from("candidate_profiles").upsert(
    {
      user_id: userId,
      skills: profile.skills,
      domains: profile.domains,
      education: profile.education,
      experience_level: profile.experienceLevel,
      graduation_year: (profile.education as Record<string, unknown>)?.graduationYear ?? null,
      preferred_roles: profile.preferredRoles,
      projects: profile.projects,
      raw_summary: profile.rawSummary,
      resume_embedding: `[${embedding.join(",")}]`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("candidate_profiles upsert failed:", upsertError.message, upsertError);
    throw new Error("Failed to save candidate profile: " + upsertError.message);
  }

  await supabase
    .from("resume_documents")
    .update({ status: "parsed", parsed_at: new Date().toISOString() })
    .eq("storage_path", storagePath);
}

async function generateSearchQueries(filters: SearchFilters, profile: Record<string, unknown>): Promise<string[]> {
  const prompt = `
    You are an expert technical recruiter. Generate 8–10 targeted job search queries.

    Candidate profile:
    - Roles seeking: ${filters.roles.join(", ")}
    - Skills: ${(profile.skills as string[]).slice(0, 8).join(", ")}
    - Experience level: ${filters.experienceLevel}
    - Graduation year: ${filters.graduationYear ?? "N/A"}
    - Preferred locations: ${filters.locations.join(", ")}

    Return ONLY a JSON array of search query strings, no markdown. Example:
    ["Remote Software Engineer Intern 2025", "Frontend Engineer Intern React TypeScript"]

    Generate queries that are specific enough to find relevant internships but broad enough to catch opportunities.
    Focus on: intern, internship, new grad, co-op. Include year if provided.
  `;
  const raw = await geminiGenerate(prompt, true);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as string[];
  } catch {
    return filters.roles.map((r) => `${r} Internship ${filters.locations[0] ?? "Remote"}`);
  }
}

async function fetchGreenhouseJobs(source: JobSource, query: string): Promise<RawJob[]> {
  if (!source.api_endpoint) return [];
  try {
    const url = `${source.api_endpoint}?content=true`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: { id: number; title: string; location?: { name: string }; content?: string; absolute_url: string }[] };

    return (data.jobs ?? [])
      .filter((j) => {
        const title = j.title.toLowerCase();
        const q = query.toLowerCase();
        return (
          (title.includes("intern") || title.includes("co-op") || title.includes("new grad")) &&
          (q.split(" ").some((word) => word.length > 3 && title.includes(word)))
        );
      })
      .slice(0, 10)
      .map((j) => ({
        company: source.company,
        role: j.title,
        location: j.location?.name ?? "Remote",
        description: (j.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 2000),
        apply_url: j.absolute_url,
        external_job_id: String(j.id),
        source_id: source.id,
      }));
  } catch {
    return [];
  }
}

async function fetchLeverJobs(source: JobSource, query: string): Promise<RawJob[]> {
  if (!source.api_endpoint) return [];
  try {
    const res = await fetch(source.api_endpoint, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { id: string; text: string; categories?: { location?: string; team?: string }; descriptionPlain?: string; hostedUrl?: string }[];

    return (Array.isArray(data) ? data : [])
      .filter((j) => {
        const title = j.text.toLowerCase();
        const q = query.toLowerCase();
        return (
          (title.includes("intern") || title.includes("co-op") || title.includes("new grad")) &&
          q.split(" ").some((word) => word.length > 3 && title.includes(word))
        );
      })
      .slice(0, 10)
      .map((j) => ({
        company: source.company,
        role: j.text,
        location: j.categories?.location ?? "Remote",
        description: (j.descriptionPlain ?? "").slice(0, 2000),
        apply_url: j.hostedUrl ?? source.careers_url,
        external_job_id: j.id,
        source_id: source.id,
      }));
  } catch {
    return [];
  }
}

async function fetchAshbyJobs(source: JobSource, query: string): Promise<RawJob[]> {
  if (!source.api_endpoint) return [];
  try {
    const res = await fetch(source.api_endpoint, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: { id: string; title: string; locationName?: string; descriptionHtml?: string; jobUrl?: string }[] };

    return (data.jobs ?? [])
      .filter((j) => {
        const title = j.title.toLowerCase();
        const q = query.toLowerCase();
        return (
          (title.includes("intern") || title.includes("co-op") || title.includes("new grad")) &&
          q.split(" ").some((word) => word.length > 3 && title.includes(word))
        );
      })
      .slice(0, 10)
      .map((j) => ({
        company: source.company,
        role: j.title,
        location: j.locationName ?? "Remote",
        description: (j.descriptionHtml ?? "").replace(/<[^>]+>/g, " ").slice(0, 2000),
        apply_url: j.jobUrl ?? source.careers_url,
        external_job_id: j.id,
        source_id: source.id,
      }));
  } catch {
    return [];
  }
}

async function fetchGoogleJobs(source: JobSource, query: string): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({
      q: query + " intern OR internship OR co-op",
      location: "United States",
      distance: "50",
      hl: "en",
      jl: "en",
      num: "10",
    });
    const url = `${source.api_endpoint}?${params}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: { title?: string; locations?: { display?: string }[]; description?: string; apply_url?: string; job_id?: string }[] };

    return (data.jobs ?? []).slice(0, 8).map((j) => ({
      company: "Google",
      role: j.title ?? "Software Engineer Intern",
      location: j.locations?.[0]?.display ?? "Mountain View, CA",
      description: (j.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 2000),
      apply_url: j.apply_url ?? "https://careers.google.com",
      external_job_id: j.job_id,
      source_id: source.id,
    }));
  } catch {
    return [];
  }
}

async function fetchMicrosoftJobs(source: JobSource, query: string): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({
      q: query + " intern",
      pg: "1",
      pgSz: "10",
      o: "Relevance",
      flt: "",
    });
    const url = `${source.api_endpoint}?${params}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json() as { operationResult?: { result?: { jobs?: { title?: string; properties?: { primaryLocation?: string; description?: string; applyUrl?: string }; jobId?: string }[] } } };
    const jobs = data?.operationResult?.result?.jobs ?? [];

    return jobs.slice(0, 8).map((j) => ({
      company: "Microsoft",
      role: j.title ?? "Software Engineer Intern",
      location: j.properties?.primaryLocation ?? "Redmond, WA",
      description: (j.properties?.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 2000),
      apply_url: j.properties?.applyUrl ?? "https://careers.microsoft.com",
      external_job_id: j.jobId,
      source_id: source.id,
    }));
  } catch {
    return [];
  }
}

async function fetchAmazonJobs(source: JobSource, query: string): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({
      query: query + " intern",
      offset: "0",
      result_limit: "10",
      sort: "relevant",
      category: "software-development",
    });
    const url = `${source.api_endpoint}?${params}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: { title?: string; basic_qualifications?: string; location?: string; job_path?: string; id_icims?: string }[] };

    return (data.jobs ?? []).slice(0, 8).map((j) => ({
      company: "Amazon",
      role: j.title ?? "SDE Intern",
      location: j.location ?? "Seattle, WA",
      description: (j.basic_qualifications ?? "").slice(0, 2000),
      apply_url: `https://www.amazon.jobs${j.job_path ?? ""}`,
      external_job_id: j.id_icims,
      source_id: source.id,
    }));
  } catch {
    return [];
  }
}

async function fetchJobsForSource(source: JobSource, query: string): Promise<RawJob[]> {
  switch (source.api_type) {
    case "greenhouse_api":
      return fetchGreenhouseJobs(source, query);
    case "lever_api":
      return fetchLeverJobs(source, query);
    case "ashby_api":
      return fetchAshbyJobs(source, query);
    case "google_jobs":
      return fetchGoogleJobs(source, query);
    case "microsoft_jobs":
      return fetchMicrosoftJobs(source, query);
    case "amazon_jobs":
      return fetchAmazonJobs(source, query);
    default:
      return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

interface AIEvaluation {
  decision: "YES" | "NO" | "MAYBE";
  confidence: number;
  reasoning: string[];
  rank_score: number;
}

async function evaluateJob(
  profile: Record<string, unknown>,
  job: RawJob,
  similarity: number,
  preferences: Record<string, unknown> | null
): Promise<AIEvaluation> {
  const prompt = `
You are a recruiting agent. Evaluate whether this candidate should apply to this job.

CANDIDATE:
Skills: ${(profile.skills as string[]).join(", ")}
Domains: ${(profile.domains as string[]).join(", ")}
Experience level: ${profile.experience_level}
Graduation year: ${profile.graduation_year}
Summary: ${profile.raw_summary}

JOB:
Company: ${job.company}
Role: ${job.role}
Location: ${job.location}
Description: ${job.description.slice(0, 1500)}

VECTOR SIMILARITY SCORE: ${(similarity * 100).toFixed(1)}%

PREVIOUS PREFERENCES:
Preferred companies: ${(preferences?.preferred_companies as string[] ?? []).join(", ") || "None set"}
Preferred roles: ${(preferences?.preferred_roles as string[] ?? []).join(", ") || "None set"}

Return ONLY valid JSON (no markdown):
{
  "decision": "YES" | "NO" | "MAYBE",
  "confidence": 0-100,
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "rank_score": 0.0-10.0
}

Criteria:
- Decision YES: strong skill match, right experience level, relevant domain, eligible graduation year
- Decision MAYBE: partial match, uncertain eligibility, or missing key info
- Decision NO: clear mismatch in skills/level/domain
- confidence: how certain you are (0–100)
- rank_score: overall opportunity value (skills fit + company quality + career value)
`;

  const raw = await geminiGenerate(prompt, true);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as AIEvaluation;
  } catch {
    return { decision: "MAYBE", confidence: 50, reasoning: ["Could not evaluate"], rank_score: 5 };
  }
}

const MAX_RUN_DURATION_MS = 4 * 60 * 1000;

async function runAgent(supabase: ReturnType<typeof createClient>, userId: string) {
  const runStartedAt = Date.now();
  const isOutOfTime = () => Date.now() - runStartedAt > MAX_RUN_DURATION_MS;

  const { data: runLog } = await supabase
    .from("agent_run_log")
    .insert({ user_id: userId, status: "running", current_step: "Starting up" })
    .select()
    .single();
  const runId = (runLog as { id: string })?.id;

  const updateProgress = async (step: string, processed?: number, total?: number) => {
    const patch: Record<string, unknown> = { current_step: step };
    if (processed !== undefined) patch.jobs_processed = processed;
    if (total !== undefined) patch.jobs_total = total;
    await supabase.from("agent_run_log").update(patch).eq("id", runId);
  };

  try {
    await updateProgress("Loading your profile and preferences");

    const { data: profileData } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileData) {
      await supabase.from("agent_run_log").update({
        status: "failed",
        error_message: "No candidate profile found. Please upload and parse your resume first.",
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
      return { error: "No candidate profile" };
    }

    const profile = profileData as Record<string, unknown>;

    const { data: prefData } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const prefs = prefData as Record<string, unknown> | null;

    const filters: SearchFilters = {
      roles: (prefs?.preferred_roles as string[] | undefined) ||
             (profile.preferred_roles as string[] | undefined) ||
             ["Software Engineer", "Frontend Engineer"],
      locations: (prefs?.preferred_locations as string[] | undefined) || ["Remote"],
      graduationYear: (prefs?.graduation_year as number | undefined) ||
                      (profile.graduation_year as number | undefined),
      experienceLevel: (profile.experience_level as string) || "Intern",
    };

    await updateProgress("Generating targeted search queries");
    const queries = await generateSearchQueries(filters, profile);

    const { data: sourcesData } = await supabase
      .from("job_sources")
      .select("*")
      .eq("active", true)
      .order("tier", { ascending: true });

    const sources = (sourcesData ?? []) as JobSource[];

    const resumeEmbeddingRaw = profile.resume_embedding as string | null;
    let resumeEmbedding: number[] = [];
    if (resumeEmbeddingRaw && typeof resumeEmbeddingRaw === "string") {
      try {
        resumeEmbedding = JSON.parse(resumeEmbeddingRaw);
      } catch { /* ignore */ }
    }

    const { count: queueSize } = await supabase
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    const MAX_QUEUE = 100;
    const slotsAvailable = MAX_QUEUE - (queueSize ?? 0);
    if (slotsAvailable <= 0) {
      await supabase.from("agent_run_log").update({
        status: "completed",
        error_message: "Queue is full (100 items). Review pending opportunities first.",
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
      return { message: "Queue full" };
    }

    let totalDiscovered = 0;
    let totalQueued = 0;

    const BATCH_SIZE = 25;
    const allJobs: RawJob[] = [];

    await updateProgress("Searching company career pages");
    for (const query of queries.slice(0, 5)) {
      // Pick relevant sources based on tier
      for (const source of sources.slice(0, 15)) {
        if (isOutOfTime()) break;
        const jobs = await fetchJobsForSource(source, query);
        allJobs.push(...jobs);
        if (allJobs.length >= BATCH_SIZE * 3) break;
      }
      if (allJobs.length >= BATCH_SIZE * 3 || isOutOfTime()) break;
    }

    totalDiscovered = allJobs.length;

    await updateProgress("Checking for duplicate listings");
    const uniqueJobs: RawJob[] = [];
    for (const job of allJobs) {
      if (isOutOfTime()) break;
      const { data: existing } = await supabase
        .from("discovered_jobs")
        .select("id")
        .eq("user_id", userId)
        .eq("company", job.company)
        .eq("role", job.role)
        .maybeSingle();

      if (!existing) uniqueJobs.push(job);
    }

    const MAX_JOBS_PER_RUN = 8;
    const jobsToProcess = uniqueJobs.slice(0, Math.min(slotsAvailable, MAX_JOBS_PER_RUN));
    await updateProgress("Evaluating opportunities with AI", 0, jobsToProcess.length);

    for (let i = 0; i < jobsToProcess.length; i++) {
      if (isOutOfTime()) {
        console.log(`Run hit ${MAX_RUN_DURATION_MS / 1000}s time limit, stopping after ${i} of ${jobsToProcess.length} jobs.`);
        break;
      }

      const job = jobsToProcess[i];
      await updateProgress(`Evaluating ${job.company} — ${job.role}`, i, jobsToProcess.length);

      const jobText = `${job.role} at ${job.company}. ${job.location}. ${job.description}`;
      const jobEmbedding = await geminiEmbedding(jobText);

      const similarity = resumeEmbedding.length > 0
        ? cosineSimilarity(resumeEmbedding, jobEmbedding)
        : 0.5;

      if (similarity < 0.3) continue;

      const evaluation = await evaluateJob(profile, job, similarity, prefs);
      if (evaluation.decision === "NO") continue;

      const matchScore = Math.round(
        (similarity * 0.4 + (evaluation.confidence / 100) * 0.4 + (evaluation.rank_score / 10) * 0.2) * 100
      );

      const { data: discoveredJob } = await supabase
        .from("discovered_jobs")
        .insert({
          user_id: userId,
          source_id: job.source_id ?? null,
          company: job.company,
          role: job.role,
          location: job.location,
          description: job.description,
          apply_url: job.apply_url,
          external_job_id: job.external_job_id ?? null,
          match_score: matchScore,
          embedding: `[${jobEmbedding.join(",")}]`,
          embedding_similarity: similarity,
          ai_decision: evaluation.decision,
          ai_confidence: evaluation.confidence,
          ai_reasoning: evaluation.reasoning,
          rank_score: evaluation.rank_score,
        })
        .select()
        .single();

      if (!discoveredJob) continue;

      const sourceLogoUrl = sources.find((s) => s.id === job.source_id)?.logo_url ?? null;

      await supabase.from("job_queue").insert({
        user_id: userId,
        discovered_job_id: (discoveredJob as { id: string }).id,
        status: "pending",
        company: job.company,
        role: job.role,
        location: job.location,
        apply_url: job.apply_url,
        match_score: matchScore,
        ai_confidence: evaluation.confidence,
        ai_reasoning: evaluation.reasoning,
        logo_url: sourceLogoUrl,
      });

      totalQueued++;
    }

    await supabase.from("agent_run_log").update({
      status: "completed",
      jobs_discovered: totalDiscovered,
      jobs_queued: totalQueued,
      jobs_processed: jobsToProcess.length,
      current_step: "Done",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    for (const source of sources) {
      await supabase
        .from("job_sources")
        .update({ last_crawled_at: new Date().toISOString() })
        .eq("id", source.id);
    }

    return { run_id: runId, jobs_discovered: totalDiscovered, jobs_queued: totalQueued };

  } catch (err) {
    await supabase.from("agent_run_log").update({
      status: "failed",
      error_message: String(err),
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    throw err;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401 });
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json() as { action: string; storage_path?: string };
  const { action } = body;

  try {
    if (action === "parse_resume") {
      const { storage_path } = body;
      if (!storage_path) {
        return new Response(JSON.stringify({ error: "storage_path required" }), { status: 400 });
      }
      await parseResume(supabaseClient, storage_path, user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (action === "run") {
      const result = await runAgent(supabaseClient, user.id);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });

  } catch (err) {
    console.error("Agent error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});