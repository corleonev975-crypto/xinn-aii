document.addEventListener("DOMContentLoaded", () => {

  // ===== ELEMENT =====
  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");

  const moreBtn = document.getElementById("moreBtn");
  const moreMenu = document.getElementById("moreMenu");

  const plusBtn = document.getElementById("plusBtn");
  const plusMenu = document.getElementById("plusMenu");

  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];

  // ===== SAVE =====
  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function scrollBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ===== MESSAGE =====
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
    typing.innerText = "Xinn AI sedang mengetik...";
    chatArea.appendChild(typing);
  }

  function hideTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

  // ===== API =====
  async function askAI(text) {
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

    const data = await res.json();
    return data.reply || "AI tidak menjawab";
  }

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = "";

    addMessage("user", text);
    showTyping();

    const reply = await askAI(text);

    hideTyping();
    addMessage("ai", reply);
  }

  // ===== FORMAT MESSAGE =====
  function formatMessage(text) {
    if (text.includes("```")) {
      return text
        .replace(/```(.*?)\n([\s\S]*?)```/g, (_, lang, code) => {
          return `<pre><code>${escapeHTML(code)}</code></pre>`;
        })
        .replace(/\n/g, "<br>");
    }
    return text.replace(/\n/g, "<br>");
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ===== LOAD CHAT =====
  function loadChats() {
    if (chats.length === 0) return;
    welcome.style.display = "none";

    chats.forEach(c => addMessage(c.role, c.text, false));
  }

  // =========================
  // 🔥 FIX TOMBOL
  // =========================

  // ⋮ MORE
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  };

  // + PLUS
  plusBtn.onclick = (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  };

  // CLOSE DROPDOWN
  document.addEventListener("click", () => {
    moreMenu.classList.remove("active");
    plusMenu.classList.remove("active");
  });

  // SIDEBAR
  menuBtn.onclick = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  };

  overlay.onclick = closeSidebar;
  closeSidebarBtn.onclick = closeSidebar;

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  // ===== SEND =====
  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // INIT
  loadChats();

});
