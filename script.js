let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];
let isGenerating = false;

// ===== FORMAT =====
function formatMessage(text) {
  if (!text) return "";
  text = text.replace(/\n{3,}/g, "\n\n");
  return marked.parse(text);
}

// ===== STREAM (PLAIN TEXT, STABLE) =====
async function askAIStream(text, onChunk) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: chats.slice(-10)
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onChunk(chunk);
  }
}

// ===== COPY BUTTON =====
document.addEventListener("click", (e) => {
  const pre = e.target.closest("pre");
  if (!pre) return;

  const code = pre.innerText;
  navigator.clipboard.writeText(code);

  pre.setAttribute("data-copy", "done");
  setTimeout(() => pre.removeAttribute("data-copy"), 1200);
});

// ===== PREVIEW HTML =====
function renderPreview(code) {
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "220px";
  iframe.style.border = "1px solid #333";
  iframe.srcdoc = code;
  return iframe;
}

function extractCodeBlock(text, lang) {
  const regex = new RegExp("```" + lang + "([\\s\\S]*?)```", "i");
  const match = text.match(regex);
  return match ? match[1] : null;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  if (isGenerating) return;

  const text = messageInput.value.trim();
  if (!text) return;

  isGenerating = true;
  sendBtn.disabled = true;

  messageInput.value = "";

  addMessage("user", text);

  const aiBox = createAIBox();

  // delay mikir biar natural
  await new Promise(r => setTimeout(r, 500));

  let fullText = "";
  let first = true;

  try {
    await askAIStream(text, async (chunk) => {

      if (first) {
        aiBox.innerHTML = "";
        first = false;
      }

      // tampil per karakter (biar gak pecah kata)
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];
        fullText += char;

        let speed = fullText.length < 200 ? 18 : 10;

        if (/[.,!?]/.test(char)) speed += 180;
        if (Math.random() < 0.04) speed += 120;

        aiBox.innerHTML =
          formatMessage(fullText) +
          `<span class="typing-cursor"></span>`;

        scrollBottom();
        if (window.Prism) Prism.highlightAll();

        await new Promise(r => setTimeout(r, speed));
      }

    });

    // final render
    aiBox.innerHTML = formatMessage(fullText);
    if (window.Prism) Prism.highlightAll();

    // ===== AUTO PREVIEW HTML =====
    const htmlCode = extractCodeBlock(fullText, "html");
    if (htmlCode) {
      const preview = renderPreview(htmlCode);
      aiBox.appendChild(preview);
    }

    // simpan chat
    chats.push({ role: "ai", text: fullText });
    localStorage.setItem("xinn_chats", JSON.stringify(chats));

  } catch {
    aiBox.textContent = "⚠️ Gagal mengambil jawaban";
  }

  isGenerating = false;
  sendBtn.disabled = false;
}

// ===== EVENTS =====
sendBtn.onclick = sendMessage;

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
