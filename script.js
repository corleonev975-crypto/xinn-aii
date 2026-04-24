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
  const soundBtn = $("soundBtn");
  const aboutBtn = $("aboutBtn");
  const historyList = $("historyList");

  const filePreview = $("filePreview");
  const photoInput = $("photoInput");
  const cameraInput = $("cameraInput");
  const fileInput = $("fileInput");

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];
  let historySessions = JSON.parse(localStorage.getItem("xinn_history")) || [];
  let isGenerating = false;
  let soundOn = localStorage.getItem("xinn_sound") !== "off";
  let lastSound = 0;

  if (soundBtn) soundBtn.textContent = soundOn ? "Sound: ON" : "Sound: OFF";

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
    saveHistory();
  }

  function saveHistory() {
    if (chats.length === 0) return;

    const first = chats.find((c) => c.role === "user")?.text || "Chat baru";
    const title = first.slice(0, 34);

    const session = {
      title,
      chats,
      time: Date.now()
    };

    historySessions = [
      session,
      ...historySessions.filter((s) => s.title !== title)
    ].slice(0, 8);

    localStorage.setItem("xinn_history", JSON.stringify(historySessions));
    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    historySessions.forEach((session) => {
      const btn = document.createElement("button");
      btn.className = "history-item";
      btn.textContent = session.title;

      btn.onclick = () => {
        chats = session.chats || [];
        localStorage.setItem("xinn_chats", JSON.stringify(chats));
        renderChats();
        closeAll();
      };

      historyList.appendChild(btn);
    });
  }

  function closeAll() {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
    moreMenu?.classList.remove("active");
    plusMenu?.classList.remove("active");
  }

  function scrollBottom() {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: "smooth"
    });
  }

  function formatMessage(text) {
    if (window.marked) {
      return marked.parse(text || "");
    }

    return (text || "").replace(/\n/g, "<br>");
  }

  function highlightCode() {
    if (window.Prism) {
      setTimeout(() => Prism.highlightAll(), 0);
    }
  }

  function playTypingSound() {
    if (!soundOn) return;

    const now = Date.now();
    if (now - lastSound < 85) return;
    lastSound = now;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.value = 520;
      gain.gain.value = 0.008;

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.018);
    } catch {}
  }

  function addMessage(role, text, save = true) {
    if (welcome) welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    if (role === "ai") {
      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = "./avatar.gif";
      avatar.alt = "Xinn AI";
      row.appendChild(avatar);
    }

    const msg = document.createElement("div");
    msg.className = `message ${role}`;
    msg.innerHTML = formatMessage(text);
    row.appendChild(msg);

    if (role === "user") {
      const userAvatar = document.createElement("div");
      userAvatar.className = "user-avatar";
      userAvatar.textContent = "U";
      row.appendChild(userAvatar);
    }

    chatArea.appendChild(row);

    if (save) {
      chats.push({ role, text });
      saveChats();
    }

    highlightCode();
    scrollBottom();
  }

  function createAIBox() {
    if (welcome) welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = "message-row ai";

    const avatar = document.createElement("img");
    avatar.className = "chat-avatar";
    avatar.src = "./avatar.gif";
    avatar.alt = "Xinn AI";

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

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "API error.");
    }

    if (!res.body) {
      const data = await res.text();
      onChunk(data);
      return;
    }

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

    isGenerating = true;
    sendBtn.disabled = true;

    messageInput.value = "";
    messageInput.style.height = "auto";

    addMessage("user", text);

    const aiBox = createAIBox();

    let fullText = "";
    let buffer = "";
    let firstChunk = true;

    try {
      await new Promise((r) => setTimeout(r, 350));

      await askAIStream(text, (chunk) => {
        if (firstChunk) {
          aiBox.innerHTML = "";
          firstChunk = false;
        }

        buffer += chunk;

        if (
          buffer.includes(" ") ||
          buffer.includes("\n") ||
          buffer.length > 12
        ) {
          fullText += buffer;
          buffer = "";

          aiBox.innerHTML =
            formatMessage(fullText) + `<span class="typing-cursor"></span>`;

          highlightCode();
          playTypingSound();
          scrollBottom();
        }
      });

      fullText += buffer;

      aiBox.innerHTML = formatMessage(fullText);
      highlightCode();

      chats.push({ role: "ai", text: fullText });
      saveChats();
    } catch (err) {
      aiBox.textContent = err.message || "Streaming error.";
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
      scrollBottom();
    }
  }

  function renderChats() {
    chatArea.innerHTML = "";

    if (chats.length === 0) {
      chatArea.appendChild(welcome);
      welcome.style.display = "flex";
      return;
    }

    chats.forEach((chat) => {
      addMessage(chat.role, chat.text, false);
    });
  }

  function clearChat() {
    chats = [];
    localStorage.setItem("xinn_chats", JSON.stringify(chats));

    chatArea.innerHTML = "";
    chatArea.appendChild(welcome);
    welcome.style.display = "flex";

    closeAll();
  }

  function exportChat() {
    if (chats.length === 0) {
      alert("Chat masih kosong.");
      return;
    }

    const text = chats
      .map((c) => `${c.role === "user" ? "User" : "Xinn AI"}: ${c.text}`)
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "xinn-ai-chat.txt";
    a.click();

    URL.revokeObjectURL(url);
    closeAll();
  }

  function handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    filePreview.textContent = `File dipilih: ${file.name}`;
    filePreview.classList.add("active");
    plusMenu.classList.remove("active");

    addMessage("user", `Saya memilih file: ${file.name}`);
  }

  menuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });

  closeSidebarBtn?.addEventListener("click", closeAll);
  overlay?.addEventListener("click", closeAll);

  moreBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  });

  plusBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  });

  sendBtn?.addEventListener("click", sendMessage);

  messageInput?.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + "px";
  });

  messageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  newChatBtn?.addEventListener("click", clearChat);
  clearChatBtn?.addEventListener("click", clearChat);
  exportChatBtn?.addEventListener("click", exportChat);

  soundBtn?.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("xinn_sound", soundOn ? "on" : "off");
    soundBtn.textContent = soundOn ? "Sound: ON" : "Sound: OFF";
    closeAll();
  });

  aboutBtn?.addEventListener("click", () => {
    alert("Xinn AI - Chat AI berbasis Groq API.");
    closeAll();
  });

  photoInput?.addEventListener("change", () => handleFile(photoInput));
  cameraInput?.addEventListener("change", () => handleFile(cameraInput));
  fileInput?.addEventListener("change", () => handleFile(fileInput));

  document.addEventListener("click", (e) => {
    if (moreMenu && !moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }

    if (plusMenu && !plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }

    const pre = e.target.closest("pre");
    if (pre) {
      const code = pre.querySelector("code");
      if (!code) return;

      navigator.clipboard.writeText(code.innerText);

      pre.setAttribute("data-copy", "done");
      setTimeout(() => pre.removeAttribute("data-copy"), 1200);
    }
  });

  renderHistory();
  renderChats();
});
