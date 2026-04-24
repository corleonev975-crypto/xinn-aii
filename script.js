document.addEventListener("DOMContentLoaded", () => {

  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");

  let isLoading = false;

  function scrollBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.innerHTML = text || "";

    row.appendChild(bubble);
    chatArea.appendChild(row);

    scrollBottom();
    return bubble;
  }

  function createLoading() {
    return addMessage("ai", `
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
    `);
  }

  // =========================
  // API FIX (ANTI KOSONG)
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

      const text = await res.text();

      // 🔥 FIX: kalau kosong
      if (!text || text.trim() === "") {
        return "⚠️ AI tidak mengembalikan jawaban.";
      }

      return text;

    } catch (err) {
      console.error(err);
      return "⚠️ Error: koneksi / API gagal.";
    }
  }

  // =========================
  // SEND MESSAGE (ANTI BUG)
  // =========================
  async function sendMessage() {
    console.log("CLICK");

    if (isLoading) return;

    const text = messageInput.value.trim();
    if (!text) return;

    isLoading = true;
    sendBtn.disabled = true;

    messageInput.value = "";

    addMessage("user", text);

    const aiBubble = createLoading();

    await new Promise(r => setTimeout(r, 500));

    try {
      const response = await fetchAI(text);

      aiBubble.innerHTML = "";

      let finalText = "";

      for (let i = 0; i < response.length; i++) {
        finalText += response[i];

        aiBubble.innerHTML =
          finalText + `<span class="typing-cursor"></span>`;

        scrollBottom();

        let speed = 10;

        if (/[.,!?]/.test(response[i])) speed = 60;
        if (Math.random() < 0.05) speed = 100;

        await new Promise(r => setTimeout(r, speed));
      }

      aiBubble.innerHTML = finalText;

    } catch (err) {
      aiBubble.innerHTML = "⚠️ Gagal memproses jawaban";
      console.error(err);
    }

    // 🔥 FIX PENTING: RESET STATE
    isLoading = false;
    sendBtn.disabled = false;
  }

  // =========================
  // EVENT FIX
  // =========================
  sendBtn.addEventListener("click", sendMessage);

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

});
