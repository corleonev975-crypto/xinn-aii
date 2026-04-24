export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY belum di-set" });
    }

    const systemPrompt = `
Kamu adalah Xinn AI (setara ChatGPT Pro, fokus coding & clarity).

ATURAN WAJIB:
- Jawab singkat, jelas, tidak bertele-tele
- Bahasa Indonesia natural
- Jangan halu / ngaco / typo aneh
- Jangan mengulang kalimat

JIKA CODING:
- Gunakan markdown code block yang BENAR:
  \`\`\`html
  \`\`\`css
  \`\`\`javascript
  \`\`\`python
- Kode harus VALID & bisa dijalankan
- Pisahkan HTML / CSS / JS jika perlu
- Jangan campur teks ke dalam code block

AUTO DEBUG:
- Jika user kirim kode → cek & perbaiki
- Jelaskan singkat kesalahan (1–2 poin)
- Beri versi kode yang sudah diperbaiki

FORMAT:
- Gunakan heading jika perlu (###)
- Gunakan bullet list jika membantu
- Jangan berlebihan
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((c) => ({
        role: c.role === "ai" ? "assistant" : "user",
        content: c.text
      })),
      { role: "user", content: message }
    ];

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.5,
          max_tokens: 900,
          stream: true,
          messages
        })
      }
    );

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(500).json({ error: err });
    }

    // 👉 kirim plain text chunk ke client
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // filter SSE -> ambil content saja
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) res.write(text);
        } catch {}
      }
    }

    res.end();

  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}
