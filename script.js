document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const moreBtn = document.getElementById("moreBtn");
  const plusBtn = document.getElementById("plusBtn");
  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const moreMenu = document.getElementById("moreMenu");
  const plusMenu = document.getElementById("plusMenu");
  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");

  const newChatBtn = document.getElementById("newChatBtn");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const exportChatBtn = document.getElementById("exportChatBtn");
  const themeBtn = document.getElementById("themeBtn");
  const aboutBtn = document.getElementById("aboutBtn");
  const historyBtn = document.getElementById("historyBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  const filePreview = document.getElementById("filePreview");
  const photoInput = document.getElementById("photoInput");
  const cameraInput = document.getElementById("cameraInput");
  const fileInput = document.getElementById("fileInput");

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];
  let isGenerating = false;
  let lastSound = 0;

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function closeAll() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    moreMenu.classList.remove("active");
    plusMenu.classList.remove("active");
  }

  function scrollBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function formatMessage(text) {
    return marked.parse(text || "");
  }

  function renderHighlight() {
    setTimeout(() => Prism.highlightAll(), 0);
  }

  function playTypingSound() {
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

    renderHighlight();
    scrollBottom();
  }

  function createAIMessageBox() {
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

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
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

    const aiBox = createAIMessageBox();
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

    chats.forEach((chat) => addMessage(chat.role, chat.text, false));
  }

  function clearChat() {
    chats = [];
    saveChats();
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

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });

  closeSidebarBtn.addEventListener("click", closeAll);
  overlay.addEventListener("click", closeAll);

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  });

  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  });

  sendBtn.addEventListener("click", sendMessage);

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

  newChatBtn.addEventListener("click", clearChat);
  clearChatBtn.addEventListener("click", clearChat);
  exportChatBtn.addEventListener("click", exportChat);

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    closeAll();
  });

  aboutBtn.addEventListener("click", () => {
    alert("Xinn AI - Chat AI berbasis Groq API.");
    closeAll();
  });

  historyBtn.addEventListener("click", () => {
    alert(`Total pesan tersimpan: ${chats.length}`);
    closeAll();
  });

  settingsBtn.addEventListener("click", () => {
    alert("Settings aktif.");
    closeAll();
  });

  photoInput.addEventListener("change", () => handleFile(photoInput));
  cameraInput.addEventListener("change", () => handleFile(cameraInput));
  fileInput.addEventListener("change", () => handleFile(fileInput));

  document.addEventListener("click", (e) => {
    if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }

    if (!plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }
  });

  document.addEventListener("click", (e) => {
    const pre = e.target.closest("pre");
    if (!pre) return;

    const code = pre.querySelector("code");
    if (!code) return;

    navigator.clipboard.writeText(code.innerText);

    pre.setAttribute("data-copy", "done");
    setTimeout(() => pre.removeAttribute("data-copy"), 1200);
  });

  renderChats();
});
