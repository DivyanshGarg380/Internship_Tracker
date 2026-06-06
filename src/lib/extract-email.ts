const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function extractEmail(email: string) {
  const res = await fetch(
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
                    Extract:
                    company
                    role
                    location
                    status
                    event_date
                    event_summary

                    Return ONLY JSON.

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

  const data = await res.json();
  return data;
}