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

  function addMessage(role, text, save = true) {
    if (welcome) welcome.style.display = "none";

    const msg = document.createElement("div");
    msg.className = `message ${role}`;
    msg.innerHTML = formatMessage(text);

    chatArea.appendChild(msg);

    if (save) {
      chats.push({ role, text });
      saveChats();
    }

    scrollBottom();
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.id = "typing";
    typing.className = "message ai typing";
    typing.textContent = "Xinn AI sedang mengetik...";
    chatArea.appendChild(typing);
    scrollBottom();
  }

  function hideTyping() {
    const typing = document.getElementById("typing");
    if (typing) typing.remove();
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

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatMessage(text) {
    const safe = escapeHTML(text);

    return safe
      .replace(/```(\w+)?\n([\s\S]*?)```/g, function(_, lang, code) {
        return `
          <div class="code-block">
            <div class="code-header">
              <span>${lang || "code"}</span>
              <button class="copy-btn">Copy</button>
            </div>
            <pre><code>${code}</code></pre>
          </div>
        `;
      })
      .replace(/\n/g, "<br>");
  }

  async function askAI(text) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chats.slice(-20)
        })
      });

      const data = await res.json();

      if (!res.ok) return data.error || "API error.";
      return data.reply || "Xinn AI tidak menjawab.";
    } catch (err) {
      return "Koneksi error. Cek internet atau Vercel API kamu.";
    }
  }

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = "";
    messageInput.style.height = "auto";

    addMessage("user", text);
    showTyping();

    const reply = await askAI(text);

    hideTyping();
    addMessage("ai", reply);
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
    if (e.target.classList.contains("copy-btn")) {
      const code = e.target.closest(".code-block").querySelector("code").innerText;
      navigator.clipboard.writeText(code);
      e.target.textContent = "Copied!";
      setTimeout(() => e.target.textContent = "Copy", 1200);
    }
  });

  renderChats();
});
