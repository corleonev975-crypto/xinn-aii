document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const menuBtn = $("menuBtn");
  const closeSidebarBtn = $("closeSidebarBtn");
  const moreBtn = $("moreBtn");
  const plusBtn = $("plusBtn");
  const sendBtn = $("sendBtn");
  const messageInput = $("messageInput");

  const sidebar = $("sidebar");
  const overlay = $("overlay");
  const moreMenu = $("moreMenu");
  const plusMenu = $("plusMenu");
  const chatArea = $("chatArea");
  const welcome = $("welcome");

  const newChatBtn = $("newChatBtn");
  const clearChatBtn = $("clearChatBtn");
  const exportChatBtn = $("exportChatBtn");
  const historyList = $("historyList");

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];
  let historySessions = JSON.parse(localStorage.getItem("xinn_history")) || [];

  let isGenerating = false;
  let persona = "santai";

  const memory = JSON.parse(localStorage.getItem("xinn_memory")) || {
    name: null,
    mood: "normal"
  };

  function saveMemory() {
    localStorage.setItem("xinn_memory", JSON.stringify(memory));
  }

  function detectMood(text) {
    if (/error|bug|gagal|masalah/i.test(text)) return "serius";
    if (/haha|wkwk|lol|santai/i.test(text)) return "santai";
    if (text.length > 200) return "serius";
    return "normal";
  }

  function applyMoodUI(mood) {
    document.body.classList.remove("mood-santai", "mood-serius");
    if (mood === "santai") document.body.classList.add("mood-santai");
    if (mood === "serius") document.body.classList.add("mood-serius");
  }

  function applyPersona(text) {
    if (persona === "dingin") return "Jawaban: " + text;
    if (persona === "coder") return "💻 Mode Dev:\n" + text;
    return text;
  }

  function rememberUser(text) {
    const match = text.match(/nama saya (.*)/i);
    if (match) {
      memory.name = match[1];
      saveMemory();
    }
  }

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function scrollBottom() {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: "smooth"
    });
  }

  function formatMessage(text) {
    return marked.parse(text || "");
  }

  function highlightCode() {
    setTimeout(() => Prism.highlightAll(), 0);
  }

  function playTypingSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = 400 + Math.random() * 200;
      gain.gain.value = 0.01;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {}
  }

  function addMessage(role, text) {
    if (welcome) welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    if (role === "ai") {
      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = "./avatar.gif";
      row.appendChild(avatar);
    }

    const msg = document.createElement("div");
    msg.className = `message ${role}`;
    msg.innerHTML = formatMessage(text);

    row.appendChild(msg);

    chatArea.appendChild(row);
    scrollBottom();
  }

  function createAIBox() {
    const row = document.createElement("div");
    row.className = "message-row ai";

    const avatar = document.createElement("img");
    avatar.className = "chat-avatar";
    avatar.src = "./avatar.gif";

    const msg = document.createElement("div");
    msg.className = "message ai";

    msg.innerHTML = `
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
    `;

    row.appendChild(avatar);
    row.appendChild(msg);
    chatArea.appendChild(row);

    scrollBottom();
    return msg;
  }

  async function askAIStream(text, onChunk) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: chats.slice(-20)
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }

  async function sendMessage() {
    if (isGenerating) return;

    const text = messageInput.value.trim();
    if (!text) return;

    // command
    if (text === "/coder") return persona = "coder", addMessage("ai","💻 Mode coder aktif");
    if (text === "/dingin") return persona = "dingin", addMessage("ai","😐 Mode dingin aktif");
    if (text === "/santai") return persona = "santai", addMessage("ai","😄 Mode santai aktif");

    isGenerating = true;
    sendBtn.disabled = true;

    messageInput.value = "";

    addMessage("user", text);

    const aiBox = createAIBox();

    await new Promise(r => setTimeout(r, 700 + Math.random()*900));

    let fullText = "";
    let first = true;

    try {
      await askAIStream(text, async (chunk) => {

        if (first) {
          aiBox.innerHTML = "";
          first = false;
        }

        const words = chunk.split(" ");

        for (let word of words) {

          fullText += word + " ";

          let speed =
            fullText.length < 100 ? 35 :
            fullText.length < 300 ? 20 : 12;

          if (Math.random() < 0.07) speed += 300;

          aiBox.innerHTML =
            formatMessage(fullText) +
            `<span class="typing-cursor"></span>`;

          highlightCode();
          scrollBottom();
          playTypingSound();

          await new Promise(r => setTimeout(r, speed));
        }

      });

      // ===== PERSONALITY =====
      memory.mood = detectMood(fullText);
      saveMemory();

      applyMoodUI(memory.mood);

      fullText = applyPersona(fullText);
      rememberUser(fullText);

      if (memory.name) {
        fullText = `👋 ${memory.name}, ` + fullText;
      }

      if (memory.mood === "santai") fullText = "😄 " + fullText;
      if (memory.mood === "serius") fullText = "🧠 " + fullText;

      aiBox.innerHTML = formatMessage(fullText);
      highlightCode();

      chats.push({ role:"ai", text:fullText });
      saveChats();

    } catch (err) {
      aiBox.textContent = "Error.";
    }

    isGenerating = false;
    sendBtn.disabled = false;
  }

  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

});
