const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function extractEmail(email: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
                  Extract the following information from this recruiting email.

                  Return ONLY valid JSON.
                  If a field is unknown, return an empty string "".
                  Never return null.

                  {
                    "company": "",
                    "role": "",
                    "location": "",
                    "status": "",
                    "event_date": "",
                    "event_summary": ""
                  }

                  Status must be one of:
                  Applied
                  OA Received
                  Interview
                  Rejected
                  Offer

                  Email:

                  ${email}
                `,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no content");
  }

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

