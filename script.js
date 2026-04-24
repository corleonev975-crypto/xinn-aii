document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const sendBtn = $("sendBtn");
  const input = $("messageInput");
  const chatArea = $("chatArea");
  const welcome = $("welcome");

  const menuBtn = $("menuBtn");
  const closeSidebarBtn = $("closeSidebarBtn");
  const sidebar = $("sidebar");
  const overlay = $("overlay");

  const moreBtn = $("moreBtn");
  const moreMenu = $("moreMenu");
  const plusBtn = $("plusBtn");
  const plusMenu = $("plusMenu");

  const clearChatBtn = $("clearChatBtn");
  const newChatBtn = $("newChatBtn");
  const exportChatBtn = $("exportChatBtn");
  const themeBtn = $("themeBtn");
  const aboutBtn = $("aboutBtn");
  const historyList = $("historyList");

  const photoInput = $("photoInput");
  const cameraInput = $("cameraInput");
  const fileInput = $("fileInput");

  let loading = false;
  let currentId = localStorage.getItem("xinn_current") || Date.now().toString();
  let sessions = JSON.parse(localStorage.getItem("xinn_sessions")) || {};
  if (!sessions[currentId]) sessions[currentId] = [];

  function chats() {
    return sessions[currentId] || [];
  }

  function save() {
    sessions[currentId] = chats();
    localStorage.setItem("xinn_sessions", JSON.stringify(sessions));
    localStorage.setItem("xinn_current", currentId);
    renderHistory();
  }

  function titleOf(list) {
    return list.find(m => m.role === "user")?.text?.slice(0, 36) || "New Chat";
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = "";

    Object.entries(sessions).reverse().forEach(([id, list]) => {
      const btn = document.createElement("button");
      btn.className = "history-item" + (id === currentId ? " active" : "");
      btn.textContent = titleOf(list);

      btn.onclick = () => {
        currentId = id;
        localStorage.setItem("xinn_current", currentId);
        renderChats();
        closePanels();
      };

      historyList.appendChild(btn);
    });
  }

  function scrollBottom() {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
  }

  function render(text, live = false) {
    let t = (text || "").replace(/\n{3,}/g, "\n\n");
    if (live && ((t.match(/```/g) || []).length % 2 === 1)) t += "\n```";
    return window.marked ? marked.parse(t) : t.replace(/\n/g, "<br>");
  }

  function highlight() {
    if (window.Prism) requestAnimationFrame(() => Prism.highlightAll());

    setTimeout(() => {
      document.querySelectorAll("pre").forEach(pre => {
        if (pre.querySelector(".copy-code-btn")) return;

        const btn = document.createElement("button");
        btn.className = "copy-code-btn";
        btn.type = "button";
        btn.textContent = "Copy";

        btn.onclick = async (e) => {
          e.stopPropagation();
          const code = pre.querySelector("code")?.innerText || pre.innerText;

          try {
            await navigator.clipboard.writeText(code);
            btn.textContent = "Copied!";
          } catch {
            btn.textContent = "Gagal";
          }

          setTimeout(() => btn.textContent = "Copy", 1200);
        };

        pre.appendChild(btn);
      });
    }, 50);
  }

  function addMessage(role, text, saveMsg = true) {
    if (welcome) welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    if (role === "ai") {
      const av = document.createElement("img");
      av.className = "chat-avatar";
      av.src = "./avatar.gif";
      av.alt = "Xinn AI";
      row.appendChild(av);
    }

    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.innerHTML = render(text);
    row.appendChild(bubble);

    chatArea.appendChild(row);

    if (saveMsg) {
      sessions[currentId].push({ role, text });
      save();
    }

    highlight();
    scrollBottom();
    return bubble;
  }

  function loadingBubble() {
    return addMessage("ai", `<span class="typing-dots"><span></span><span></span><span></span></span>`, false);
  }

  async function streamAI(message, onChunk) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: chats().slice(-10) })
    });

    if (!res.ok) throw new Error("API error");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
    }
  }

  async function sendMessage() {
    if (loading) return;

    const text = input.value.trim();
    if (!text) return;

    loading = true;
    sendBtn.disabled = true;
    input.value = "";

    addMessage("user", text);

    const ai = loadingBubble();
    let output = "";
    let last = 0;

    try {
      await new Promise(r => setTimeout(r, 300));
      ai.innerHTML = "";

      await streamAI(text, (chunk) => {
        output += chunk;

        const now = Date.now();
        if (now - last > 60 || /[.!?}\n]$/.test(output)) {
          ai.innerHTML = render(output, true) + `<span class="typing-cursor"></span>`;
          highlight();
          scrollBottom();
          last = now;
        }
      });

      ai.innerHTML = output ? render(output) : "⚠️ AI tidak memberi jawaban.";
      highlight();

      sessions[currentId].push({ role: "ai", text: output });
      save();

    } catch (e) {
      ai.innerHTML = "⚠️ Error: API gagal atau koneksi bermasalah.";
    } finally {
      loading = false;
      sendBtn.disabled = false;
      scrollBottom();
    }
  }

  function renderChats() {
    chatArea.innerHTML = "";
    const list = chats();

    if (list.length === 0) {
      chatArea.appendChild(welcome);
      welcome.style.display = "flex";
      return;
    }

    list.forEach(m => addMessage(m.role, m.text, false));
  }

  function newChat() {
    currentId = Date.now().toString();
    sessions[currentId] = [];
    save();
    renderChats();
    closePanels();
  }

  function clearChat() {
    sessions[currentId] = [];
    save();
    renderChats();
    closePanels();
  }

  function closePanels() {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
    moreMenu?.classList.remove("active");
    plusMenu?.classList.remove("active");
  }

  sendBtn.onclick = sendMessage;

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("focus", () => setTimeout(scrollBottom, 300));
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  });

  menuBtn.onclick = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  };

  closeSidebarBtn.onclick = closePanels;
  overlay.onclick = closePanels;

  moreBtn.onclick = e => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  };

  plusBtn.onclick = e => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  };

  newChatBtn.onclick = newChat;
  clearChatBtn.onclick = clearChat;

  exportChatBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(chats(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xinn-ai-chat.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  themeBtn.onclick = () => {
    document.body.classList.toggle("light");
    themeBtn.textContent = document.body.classList.contains("light") ? "🌙 Mode Gelap" : "☀ Mode Terang";
  };

  aboutBtn.onclick = () => alert("Xinn AI — AI Assistant buatan kamu sendiri.");

  function handleFile(file) {
    if (!file) return;
    addMessage("user", `File dipilih: **${file.name}**`);
    plusMenu.classList.remove("active");
  }

  photoInput.onchange = () => handleFile(photoInput.files[0]);
  cameraInput.onchange = () => handleFile(cameraInput.files[0]);
  fileInput.onchange = () => handleFile(fileInput.files[0]);

  document.addEventListener("click", e => {
    if (moreMenu && !moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }

    if (plusMenu && !plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }
  });

  renderHistory();
  renderChats();
});
