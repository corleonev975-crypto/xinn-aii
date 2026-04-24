// =========================
// INIT SAFE
// =========================
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const chatArea = document.getElementById("chatArea");

let isLoading = false;

// =========================
// AUTO SCROLL
// =========================
function scrollBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// =========================
// ADD MESSAGE
// =========================
function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.innerHTML = text;

  row.appendChild(bubble);
  chatArea.appendChild(row);

  scrollBottom();
  return bubble;
}

// =========================
// LOADING AI (DOTS)
// =========================
function createLoading() {
  const bubble = addMessage("ai", `
    <span class="typing-dots">
      <span></span><span></span><span></span>
    </span>
  `);
  return bubble;
}

// =========================
// API CALL (SAFE)
// =========================
async function fetchAI(message) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    if (!res.ok) throw new Error("API error");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      result += decoder.decode(value);
    }

    return result;

  } catch (err) {
    console.error(err);
    return "⚠️ Error: API gagal atau koneksi bermasalah.";
  }
}

// =========================
// SEND MESSAGE (FINAL FIX)
// =========================
async function sendMessage() {
  if (isLoading) return;

  const text = messageInput.value.trim();
  if (!text) return;

  isLoading = true;

  // disable UI
  sendBtn.disabled = true;
  messageInput.value = "";

  // user message
  addMessage("user", text);

  // loading bubble
  const aiBubble = createLoading();

  // delay biar terasa mikir
  await new Promise(r => setTimeout(r, 600));

  // ambil jawaban
  const response = await fetchAI(text);

  // efek typing manusia
  let finalText = "";
  aiBubble.innerHTML = "";

  for (let i = 0; i < response.length; i++) {
    finalText += response[i];

    aiBubble.innerHTML = finalText + `<span class="typing-cursor"></span>`;

    scrollBottom();

    let speed = 12;

    if (/[.,!?]/.test(response[i])) speed = 80;
    if (Math.random() < 0.05) speed = 120;

    await new Promise(r => setTimeout(r, speed));
  }

  // selesai
  aiBubble.innerHTML = finalText;

  // enable lagi
  isLoading = false;
  sendBtn.disabled = false;
}

// =========================
// EVENT LISTENER (ANTI ERROR)
// =========================
if (sendBtn && messageInput) {

  sendBtn.addEventListener("click", sendMessage);

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

} else {
  console.error("❌ Button / Input tidak ditemukan");
}
