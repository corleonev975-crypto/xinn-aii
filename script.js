document.addEventListener("DOMContentLoaded", () => {

  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");

  let chats = [];

  function addMessage(role, text) {
    const msg = document.createElement("div");
    msg.className = "message " + role;
    msg.innerHTML = formatMessage(text);

    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;

    setTimeout(() => Prism.highlightAll(), 0);
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
    return data.reply;
  }

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = "";

    addMessage("user", text);
    chats.push({ role: "user", text });

    const reply = await askAI(text);

    addMessage("ai", reply);
    chats.push({ role: "ai", text: reply });
  }

  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function formatMessage(text) {
    return marked.parse(text);
  }

  // COPY CODE
  document.addEventListener("click", (e) => {
    const pre = e.target.closest("pre");
    if (!pre) return;

    const code = pre.querySelector("code").innerText;
    navigator.clipboard.writeText(code);

    pre.setAttribute("data-copy", "done");
    setTimeout(() => pre.removeAttribute("data-copy"), 1200);
  });

});
