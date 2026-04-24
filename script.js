document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");

  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
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
    typing.innerText = "Xinn AI sedang mengetik...";
    chatArea.appendChild(typing);
    scrollBottom();
  }

  function hideTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

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

  function loadChats() {
    if (chats.length === 0) return;

    welcome.style.display = "none";

    chats.forEach(c => {
      addMessage(c.role, c.text, false);
    });
  }

  // ===== FORMAT MESSAGE (CODE BLOCK FIX) =====
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

  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  loadChats();
});
