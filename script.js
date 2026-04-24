// =======================
// INIT
// =======================
const sendBtn = document.querySelector(".send-btn");
const input = document.querySelector("textarea");
const chat = document.querySelector(".chat-area");

let isLoading = false;

// =======================
// SCROLL
// =======================
function scrollBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// =======================
// TAMBAH CHAT
// =======================
function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.innerHTML = text;

  row.appendChild(bubble);
  chat.appendChild(row);

  scrollBottom();
  return bubble;
}

// =======================
// LOADING DOTS
// =======================
function loadingBubble() {
  return addMessage("ai", `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `);
}

// =======================
// FAKE AI (BIAR TEST DULU)
// =======================
async function fakeAI(text) {
  await new Promise(r => setTimeout(r, 800));

  return "Halo 👋 ini respon dari AI.\n\nKamu ngetik: **" + text + "**";
}

// =======================
// SEND MESSAGE (FIX TOTAL)
// =======================
async function sendMessage() {
  console.log("SEND KE TEKAN"); // 🔥 debug

  if (isLoading) return;

  const text = input.value.trim();
  if (!text) return;

  isLoading = true;
  sendBtn.disabled = true;

  input.value = "";

  addMessage("user", text);

  const bubble = loadingBubble();

  try {
    const res = await fakeAI(text);

    bubble.innerHTML = "";

    let output = "";

    for (let i = 0; i < res.length; i++) {
      output += res[i];

      bubble.innerHTML =
        output + `<span class="typing-cursor"></span>`;

      scrollBottom();

      let speed = 10;
      if (/[.,!?]/.test(res[i])) speed = 60;

      await new Promise(r => setTimeout(r, speed));
    }

    bubble.innerHTML = output;

  } catch (e) {
    bubble.innerHTML = "⚠️ Error AI";
  }

  isLoading = false;
  sendBtn.disabled = false;
}

// =======================
// EVENT LISTENER (INI YANG PENTING)
// =======================

// tombol kirim
sendBtn.addEventListener("click", sendMessage);

// enter kirim
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
