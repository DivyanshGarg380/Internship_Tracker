import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  tex: z.string().min(20).max(50000),
  role: z.string().min(2).max(200),
  jobDescription: z.string().max(20000).optional(),
});

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) keyword analyst.
Given a candidate's LaTeX resume and a target role (optionally a full job description), extract the high-signal keywords/skills/tools/phrases that an ATS and recruiter would scan for.

For each keyword decide:
- present: appears in the resume (case-insensitive, allow simple variants/acronyms like "JS"/"JavaScript", "ML"/"Machine Learning").
- missing: not in the resume but important for this role.

Rules:
- Focus on hard skills, tools, frameworks, methodologies, domain terms, certifications. Avoid generic fluff ("team player").
- 18-30 keywords total. Prioritize the highest-signal ones.
- For each MISSING keyword, suggest a short, natural way to include it (under 18 words) — only if the candidate plausibly has the experience based on their resume. If not plausible, set suggestion to "" (do NOT fabricate experience).
- Compute match_score = round(100 * present_count / total_count).`;

export type AtsKeyword = {
  keyword: string;
  status: "present" | "missing";
  importance: "high" | "medium" | "low";
  category: "Skill" | "Tool" | "Framework" | "Concept" | "Domain" | "Soft" | "Certification";
  suggestion?: string;
};

export type AtsScanResult = {
  match_score: number;
  summary: string;
  keywords: AtsKeyword[];
};

export const scanAts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not configured." };

    const userMsg = [
      `Target role: ${data.role}`,
      data.jobDescription ? `\nJob description:\n${data.jobDescription}` : "",
      `\nResume (LaTeX):\n${data.tex}`,
    ].join("");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_ats_scan",
              description: "Return ATS keyword scan results.",
              parameters: {
                type: "object",
                properties: {
                  match_score: { type: "number" },
                  summary: { type: "string" },
                  keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        status: { type: "string", enum: ["present", "missing"] },
                        importance: { type: "string", enum: ["high", "medium", "low"] },
                        category: {
                          type: "string",
                          enum: ["Skill", "Tool", "Framework", "Concept", "Domain", "Soft", "Certification"],
                        },
                        suggestion: { type: "string" },
                      },
                      required: ["keyword", "status", "importance", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["match_score", "summary", "keywords"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_ats_scan" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Rate limited. Try again shortly." };
    if (res.status === 402) return { ok: false as const, error: "AI credits exhausted." };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("ATS scan error:", res.status, text);
      return { ok: false as const, error: `AI request failed (${res.status}).` };
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { ok: false as const, error: "AI returned no structured result." };
    try {
      const parsed = JSON.parse(args) as AtsScanResult;
      return { ok: true as const, data: parsed };
    } catch (e) {
      console.error("ATS scan parse error", e, args);
      return { ok: false as const, error: "Could not parse AI response." };
    }
  });