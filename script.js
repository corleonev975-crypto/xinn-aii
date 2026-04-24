document.addEventListener("DOMContentLoaded", () => {
  console.log("Xinn AI FULL ACTIVE");

  const API_KEY = "ISI_API_KEY_GROQ_KAMU";

  // ELEMENT
  const menuBtn = document.getElementById("menuBtn");
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

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];

  // ====================
  // SIDEBAR
  // ====================
  menuBtn.onclick = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  };

  overlay.onclick = () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    moreMenu.classList.remove("active");
    plusMenu.classList.remove("active");
  };

  // ====================
  // DROPDOWN (⋮)
  // ====================
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("active");
    plusMenu.classList.remove("active");
  };

  // ====================
  // PLUS MENU
  // ====================
  plusBtn.onclick = (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("active");
    moreMenu.classList.remove("active");
  };

  // ====================
  // AUTO RESIZE TEXTAREA
  // ====================
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
  });

  // ====================
  // ENTER SEND
  // ====================
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.onclick = sendMessage;

  // ====================
  // CHAT UI
  // ====================
  function addMessage(role, text) {
    if (welcome) welcome.style.display = "none";

    const msg = document.createElement("div");
    msg.className = "message " + role;
    msg.textContent = text;

    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;

    chats.push({ role, text });
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "message ai typing";
    typing.id = "typing";
    typing.textContent = "Xinn AI sedang mengetik...";
    chatArea.appendChild(typing);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

  // ====================
  // API GROQ
  // ====================
  async function askAI(text) {
    if (!API_KEY || API_KEY === "ISI_API_KEY_GROQ_KAMU") {
      return "Masukkan API KEY Groq dulu di script.js";
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "user", content: text }
          ]
        })
      });

      const data = await res.json();

      return data.choices?.[0]?.message?.content || "AI tidak merespon";
    } catch (err) {
      return "Error koneksi API";
    }
  }

  // ====================
  // SEND MESSAGE
  // ====================
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

  // ====================
  // CLEAR CHAT
  // ====================
  function clearChat() {
    chats = [];
    localStorage.removeItem("xinn_chats");
    chatArea.innerHTML = "";
    if (welcome) {
      chatArea.appendChild(welcome);
      welcome.style.display = "flex";
    }
  }

  clearChatBtn.onclick = clearChat;
  newChatBtn.onclick = clearChat;

  // ====================
  // EXPORT CHAT
  // ====================
  exportChatBtn.onclick = () => {
    let text = chats.map(c => `${c.role}: ${c.text}`).join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.txt";
    a.click();
  };

  // ====================
  // THEME
  // ====================
  themeBtn.onclick = () => {
    document.body.classList.toggle("light");
  };

  // ====================
  // LOAD CHAT
  // ====================
  function loadChat() {
    if (chats.length === 0) return;

    welcome.style.display = "none";

    chats.forEach(c => {
      const msg = document.createElement("div");
      msg.className = "message " + c.role;
      msg.textContent = c.text;
      chatArea.appendChild(msg);
    });
  }

  loadChat();

  // ====================
  // CLICK OUTSIDE CLOSE
  // ====================
  document.addEventListener("click", (e) => {
    if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }
    if (!plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }
  });
});
