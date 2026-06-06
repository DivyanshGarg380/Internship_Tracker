import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  email: z.string().min(10).max(10000),
});

const SYSTEM_PROMPT = `You extract structured internship-application data from a single recruiting email.
Return ONLY a JSON object matching the schema. If a field is unknown, use an empty string for text fields, null for status, and today's date for dates.
Status values must be exactly one of: "Applied", "Under Review", "OA Received", "Interview", "Rejected", "Offer".
- "OA Received" = online assessment / coding challenge sent.
- "Interview" = phone screen, technical, onsite, or final round scheduled or completed.
- "Under Review" = application acknowledged or recruiter reaching out but no OA/interview yet.
- "Offer" = explicit offer letter.
- "Rejected" = explicit rejection.
- "Applied" = generic confirmation only.
Date format: YYYY-MM-DD.`;

export const extractEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.email },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_application",
              description: "Persist the extracted internship application.",
              parameters: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  role: { type: "string" },
                  location: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["Applied", "Under Review", "OA Received", "Interview", "Rejected", "Offer"],
                  },
                  event_date: { type: "string", description: "YYYY-MM-DD" },
                  event_summary: { type: "string", description: "Short description of what this email indicates." },
                },
                required: ["company", "role", "status", "event_date", "event_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_application" } },
      }),
    });

    if (res.status === 429) {
      return { ok: false as const, error: "Rate limited. Please wait a moment and try again." };
    }
    if (res.status === 402) {
      return { ok: false as const, error: "AI credits exhausted. Add credits in your workspace settings." };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI extract error:", res.status, text);
      return { ok: false as const, error: `AI request failed (${res.status}).` };
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return { ok: false as const, error: "AI returned no structured result." };
    }
    try {
      const parsed = JSON.parse(args) as {
        company: string;
        role: string;
        location?: string;
        status: string;
        event_date: string;
        event_summary: string;
      };
      return {
        ok: true as const,
        data: {
          company: parsed.company || "",
          role: parsed.role || "",
          location: parsed.location || "",
          status: parsed.status,
          event_date: parsed.event_date,
          event_summary: parsed.event_summary,
        },
      };
    } catch (e) {
      console.error("AI parse error", e, args);
      return { ok: false as const, error: "Could not parse AI response." };
    }
  });