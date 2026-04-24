export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Pesan kosong." });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY belum diisi di Vercel."
      });
    }

    const systemPrompt = `
Kamu adalah Xinn AI, asisten AI modern seperti ChatGPT.
Jawab dalam Bahasa Indonesia yang natural, santai, jelas, dan membantu.
Kalau user minta coding, berikan kode yang rapi dan siap pakai.
Gunakan markdown yang rapi.
Jika memberi kode, selalu gunakan format code block dengan bahasa:
\`\`\`html
\`\`\`
\`\`\`css
\`\`\`
\`\`\`javascript
\`\`\`
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((c) => ({
        role: c.role === "ai" ? "assistant" : "user",
        content: c.text
      })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Groq API error."
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "Tidak ada jawaban dari AI."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error. Cek api/chat.js atau Vercel logs."
    });
  }
}
