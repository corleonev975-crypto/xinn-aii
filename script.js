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
  let chatSessions = JSON.parse(localStorage.getItem("xinn_history")) || [];
  let isGenerating = false;
  let soundOn = localStorage.getItem("xinn_sound") !== "off";
  let lastSound = 0;

  soundBtn.textContent = soundOn ? "Sound: ON" : "Sound: OFF";

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
    updateHistory();
  }

  function updateHistory() {
    if (chats.length > 0) {
      const firstUser = chats.find(c => c.role === "user")?.text || "Chat baru";
      const session = {
        title: firstUser.slice(0, 34),
        chats,
        time: Date.now()
      };
      chatSessions = [session, ...chatSessions.filter(s => s.title !== session.title)].slice(0, 8);
      localStorage.setItem("xinn_history", JSON.stringify(chatSessions));
    }

    historyList.innerHTML = "";
    chatSessions.forEach((session) => {
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
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    moreMenu.classList.remove("active");
    plusMenu.classList.remove("active");
  }

  function scrollBottom() {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
  }

  function formatMessage(text) {
    return marked.parse(text || "");
  }

  function renderHighlight() {
    setTimeout(() => Prism.highlightAll(), 0);
  }

  function playTypingSound() {
    if (!soundOn) return;

    const now = Date.now();
    if (now - lastSound < 80) return;
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

    renderHighlight();
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
    msg.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;

    row.appendChild(avatar);
    row.appendChild(msg);
    chatArea.appendChild(row);
    scrollBottom();

    return msg;
  }

  async function askAIStream(text, onChunk) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: chats.slice(-20) })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "API error.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
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

    try {
      await askAIStream(text, (chunk) => {
        buffer += chunk;

        if (buffer.includes(" ") || buffer.includes("\n") || buffer.length > 18) {
          fullText += buffer;
          buffer = "";
          aiBox.innerHTML = formatMessage(fullText) + `<span class="typing-cursor"></span>`;
          renderHighlight();
          playTypingSound();
          scrollBottom();
        }
      });

      fullText += buffer;
      aiBox.innerHTML = formatMessage(fullText);
      renderHighlight();

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

    chats.forEach(chat => addMessage(chat.role, chat.text, false));
    updateHistory();
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
    if (chats.length === 0) return alert("Chat masih kosong.");

    const text = chats.map(c => `${c.role === "user" ? "User" : "Xinn AI"}: ${c.text}`).join("\n\n");
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

  menuBtn.onclick = (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
    overlay.classList.add("active");
  };

  closeSidebarBtn.onclick = closeAll;
  overlay.onclick = closeAll;

  moreBtn.onclick = (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  };

  plusBtn.onclick = (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  };

  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + "px";
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  newChatBtn.onclick = clearChat;
  clearChatBtn.onclick = clearChat;
  exportChatBtn.onclick = exportChat;

  soundBtn.onclick = () => {
    soundOn = !soundOn;
    localStorage.setItem("xinn_sound", soundOn ? "on" : "off");
    soundBtn.textContent = soundOn ? "Sound: ON" : "Sound: OFF";
    closeAll();
  };

  aboutBtn.onclick = () => {
    alert("Xinn AI - Chat AI berbasis Groq API.");
    closeAll();
  };

  photoInput.onchange = () => handleFile(photoInput);
  cameraInput.onchange = () => handleFile(cameraInput);
  fileInput.onchange = () => handleFile(fileInput);

  document.addEventListener("click", (e) => {
    if (!moreMenu.contains(e.target) && e.target !== moreBtn) moreMenu.classList.remove("active");
    if (!plusMenu.contains(e.target) && e.target !== plusBtn) plusMenu.classList.remove("active");

    const pre = e.target.closest("pre");
    if (pre) {
      const code = pre.querySelector("code");
      if (!code) return;
      navigator.clipboard.writeText(code.innerText);
      pre.setAttribute("data-copy", "done");
      setTimeout(() => pre.removeAttribute("data-copy"), 1200);
    }
  });

  updateHistory();
  renderChats();
});
