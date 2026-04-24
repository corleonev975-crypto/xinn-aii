export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY belum diisi di Vercel." });
    }

    if (!message) {
      return res.status(400).json({ error: "Pesan kosong." });
    }

    const systemPrompt = `
Kamu adalah Xinn AI, asisten AI modern seperti ChatGPT.
Jawab dalam Bahasa Indonesia yang natural, santai, jelas, dan membantu.
Gunakan markdown rapi.
Kalau memberi kode, gunakan code block sesuai bahasa.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((c) => ({
        role: c.role === "ai" ? "assistant" : "user",
        content: c.text
      })),
      { role: "user", content: message }
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.8,
        max_tokens: 1024,
        stream: true
      })
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json();
      return res.status(groqRes.status).json({
        error: errorData.error?.message || "Groq API error."
      });
    }

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    });

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "").trim();

        if (data === "[DONE]") {
          continue;
        }

        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content || "";

          if (text) {
            res.write(text);
          }
        } catch {}
      }
    }

    res.end();
  } catch (error) {
    return res.status(500).json({
      error: "Server error streaming."
    });
  }
      }
