document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");

  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  const moreBtn = document.getElementById("moreBtn");
  const moreMenu = document.getElementById("moreMenu");

  const plusBtn = document.getElementById("plusBtn");
  const plusMenu = document.getElementById("plusMenu");

  const clearChatBtn = document.getElementById("clearChatBtn");

  let loading = false;
  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];

  if (!sendBtn || !input || !chatArea) {
    alert("ERROR: id sendBtn / messageInput / chatArea belum cocok.");
    return;
  }

  function saveChats() {
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function scrollBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function format(text) {
    if (!text) return "";
    if (window.marked) return marked.parse(text);
    return text.replace(/\n/g, "<br>");
  }

  function highlight() {
    if (window.Prism) setTimeout(() => Prism.highlightAll(), 0);
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

    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.innerHTML = format(text);

    row.appendChild(bubble);

    if (role === "user") {
      const user = document.createElement("div");
      user.className = "user-avatar";
      user.textContent = "U";
      row.appendChild(user);
    }

    chatArea.appendChild(row);

    if (save) {
      chats.push({ role, text });
      saveChats();
    }

    highlight();
    scrollBottom();
    return bubble;
  }

  function loadingBubble() {
    return addMessage("ai", `
<span class="typing-dots">
  <span></span><span></span><span></span>
</span>
`, false);
  }

  async function streamAI(message, onChunk) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        history: chats.slice(-10)
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "API error");
    }

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
    sendBtn.style.opacity = ".5";

    input.value = "";
    addMessage("user", text);

    const ai = loadingBubble();
    let output = "";

    try {
      await new Promise((r) => setTimeout(r, 400));
      ai.innerHTML = "";

      await streamAI(text, (chunk) => {
        output += chunk;

        ai.innerHTML = format(output) + `<span class="typing-cursor"></span>`;
        highlight();
        scrollBottom();
      });

      ai.innerHTML = output ? format(output) : "⚠️ AI tidak memberi jawaban.";
      highlight();

      chats.push({ role: "ai", text: output });
      saveChats();

    } catch (err) {
      console.error(err);
      ai.innerHTML = "⚠️ Error: API gagal atau koneksi bermasalah.";

    } finally {
      loading = false;
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
      scrollBottom();
    }
  }

  function renderChats() {
    if (chats.length === 0) return;

    if (welcome) welcome.style.display = "none";

    chats.forEach((chat) => {
      addMessage(chat.role, chat.text, false);
    });
  }

  sendBtn.onclick = sendMessage;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (menuBtn && sidebar && overlay) {
    menuBtn.onclick = () => {
      sidebar.classList.add("active");
      overlay.classList.add("active");
    };
  }

  if (closeSidebarBtn && sidebar && overlay) {
    closeSidebarBtn.onclick = () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  if (overlay && sidebar) {
    overlay.onclick = () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  if (moreBtn && moreMenu) {
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      moreMenu.classList.toggle("active");
      if (plusMenu) plusMenu.classList.remove("active");
    };
  }

  if (plusBtn && plusMenu) {
    plusBtn.onclick = (e) => {
      e.stopPropagation();
      plusMenu.classList.toggle("active");
      if (moreMenu) moreMenu.classList.remove("active");
    };
  }

  if (clearChatBtn) {
    clearChatBtn.onclick = () => {
      chats = [];
      saveChats();
      chatArea.innerHTML = "";
      if (welcome) {
        chatArea.appendChild(welcome);
        welcome.style.display = "flex";
      }
      if (moreMenu) moreMenu.classList.remove("active");
    };
  }

  document.addEventListener("click", (e) => {
    const pre = e.target.closest("pre");
    if (pre) {
      const code = pre.querySelector("code");
      navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
      pre.setAttribute("data-copy", "done");
      setTimeout(() => pre.removeAttribute("data-copy"), 1200);
    }

    if (moreMenu && !moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }

    if (plusMenu && !plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }
  });

  renderChats();
});
