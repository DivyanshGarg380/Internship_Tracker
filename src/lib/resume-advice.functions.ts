import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  tex: z.string().min(20).max(50000),
  role: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You are a senior tech recruiter and resume coach reviewing a LaTeX resume for a software engineering / internship candidate.
Give SHORT, ACTIONABLE tips that materially increase callback rate. Be specific to the resume's actual content — quote phrases when useful.
Cover: impact metrics, action verbs, clarity, redundancy, formatting, ATS-friendliness, missing sections, weak bullets.
Do NOT rewrite the resume. Keep each tip under 25 words.`;

export type ResumeTip = {
  category: "Impact" | "Clarity" | "Skills" | "Formatting" | "ATS" | "Content";
  severity: "high" | "medium" | "low";
  tip: string;
  target?: string;
};

export const adviseResume = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not configured." };

    const userMsg = data.role
      ? `Target role: ${data.role}\n\nResume (LaTeX):\n${data.tex}`
      : `Resume (LaTeX):\n${data.tex}`;

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
              name: "return_resume_tips",
              description: "Return prioritized resume improvement tips.",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "0-100 estimated callback strength." },
                  summary: { type: "string", description: "1-2 sentence overall verdict." },
                  tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["Impact", "Clarity", "Skills", "Formatting", "ATS", "Content"],
                        },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        tip: { type: "string" },
                        target: { type: "string", description: "Optional phrase from the resume this targets." },
                      },
                      required: ["category", "severity", "tip"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["overall_score", "summary", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_resume_tips" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Rate limited. Try again shortly." };
    if (res.status === 402) return { ok: false as const, error: "AI credits exhausted." };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Resume advise error:", res.status, text);
      return { ok: false as const, error: `AI request failed (${res.status}).` };
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { ok: false as const, error: "AI returned no structured result." };
    try {
      const parsed = JSON.parse(args) as {
        overall_score: number;
        summary: string;
        tips: ResumeTip[];
      };
      return { ok: true as const, data: parsed };
    } catch (e) {
      console.error("Resume advise parse error", e, args);
      return { ok: false as const, error: "Could not parse AI response." };
    }
  });