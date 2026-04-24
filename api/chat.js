export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history = [] } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY belum diisi." });

    const messages = [
      {
        role: "system",
        content: `
Kamu adalah Xinn AI, asisten seperti ChatGPT.

Aturan:
- Bahasa Indonesia natural.
- Jawab rapi, jelas, tidak ngaco.
- Jika user minta coding, berikan kode valid dan siap pakai.
- Gunakan markdown code block:
  html = \`\`\`html
  css = \`\`\`css
  javascript = \`\`\`javascript
  python = \`\`\`python
- Jangan campur teks biasa ke dalam code block.
- Jika user minta website, pisahkan index.html, style.css, script.js.
`
      },
      ...history.map(c => ({
        role: c.role === "ai" ? "assistant" : "user",
        content: c.text
      })),
      { role: "user", content: message }
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.5,
        max_tokens: 1200,
        stream: true
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: err });
    }

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    });

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();
        if (!data || data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content || "";
          if (text) res.write(text);
        } catch {}
      }
    }

    res.end();
  } catch {
    res.status(500).json({ error: "Server error." });
  }
}
