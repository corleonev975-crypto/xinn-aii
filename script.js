let loading = false;
let currentId = localStorage.getItem("xinn_current") || Date.now().toString();
let sessions = JSON.parse(localStorage.getItem("xinn_sessions") || "{}");
if (!sessions[currentId]) sessions[currentId] = [];

const $ = (id) => document.getElementById(id);

const input = $("messageInput");
const chatArea = $("chatArea");
const welcome = $("welcome");
const sendBtn = $("sendBtn");
const sidebar = $("sidebar");
const overlay = $("overlay");
const moreMenu = $("moreMenu");
const plusMenu = $("plusMenu");
const historyList = $("historyList");

function chats() {
  return sessions[currentId] || [];
}

function save() {
  localStorage.setItem("xinn_sessions", JSON.stringify(sessions));
  localStorage.setItem("xinn_current", currentId);
  renderHistory();
}

function scrollBottom() {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior: "smooth"
  });
}

function render(text, live = false) {
  let t = (text || "").replace(/\n{3,}/g, "\n\n");
  if (live && ((t.match(/```/g) || []).length % 2 === 1)) {
    t += "\n```";
  }

  return window.marked ? marked.parse(t) : t.replace(/\n/g, "<br>");
}

function addCopyButtons() {
  if (window.Prism) Prism.highlightAll();

  document.querySelectorAll("pre").forEach((pre) => {
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

      setTimeout(() => {
        btn.textContent = "Copy";
      }, 1200);
    };

    pre.appendChild(btn);
  });
}

function addMessage(role, text, saveMsg = true) {
  if (welcome) welcome.style.display = "none";

  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  if (role === "ai") {
    const img = document.createElement("img");
    img.className = "chat-avatar";
    img.src = "./avatar.gif";
    img.alt = "Xinn AI";
    row.appendChild(img);
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

  addCopyButtons();
  scrollBottom();

  return bubble;
}

function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";

  Object.entries(sessions)
    .reverse()
    .forEach(([id, list]) => {
      const item = document.createElement("button");
      item.className = "history-item" + (id === currentId ? " active" : "");

      const title =
        list.find((m) => m.role === "user")?.text?.slice(0, 34) || "New Chat";

      item.textContent = title;

      item.onclick = () => {
        currentId = id;
        localStorage.setItem("xinn_current", id);
        renderChats();
        closeSidebar();
      };

      historyList.appendChild(item);
    });
}

function renderChats() {
  chatArea.innerHTML = "";

  const list = chats();

  if (list.length === 0) {
    chatArea.appendChild(welcome);
    welcome.style.display = "flex";
    return;
  }

  list.forEach((m) => {
    addMessage(m.role, m.text, false);
  });
}

async function askAI(message, onChunk) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      history: chats().slice(-10)
    })
  });

  if (!res.ok) {
    throw new Error("API error");
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

  input.value = "";
  input.style.height = "auto";

  addMessage("user", text);

  const aiBubble = addMessage(
    "ai",
    `<span class="typing-dots"><span></span><span></span><span></span></span>`,
    false
  );

  let output = "";
  let lastRender = 0;

  try {
    await new Promise((r) => setTimeout(r, 350));

    aiBubble.innerHTML = "";

    await askAI(text, (chunk) => {
      output += chunk;

      const now = Date.now();

      if (now - lastRender > 60 || /[.!?}\n]$/.test(output)) {
        aiBubble.innerHTML =
          render(output, true) + `<span class="typing-cursor"></span>`;

        addCopyButtons();
        scrollBottom();

        lastRender = now;
      }
    });

    aiBubble.innerHTML = output
      ? render(output)
      : "⚠️ AI tidak memberi jawaban.";

    addCopyButtons();

    sessions[currentId].push({
      role: "ai",
      text: output
    });

    save();
  } catch (err) {
    aiBubble.innerHTML = "⚠️ Error: API gagal atau koneksi bermasalah.";
  } finally {
    loading = false;
    sendBtn.disabled = false;
    scrollBottom();
  }
}

function openSidebar() {
  sidebar.classList.add("active");
  overlay.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
}

function toggleMore(e) {
  e.stopPropagation();
  moreMenu.classList.toggle("active");
  plusMenu.classList.remove("active");
}

function togglePlus(e) {
  e.stopPropagation();
  plusMenu.classList.toggle("active");
  moreMenu.classList.remove("active");
}

function newChat() {
  currentId = Date.now().toString();
  sessions[currentId] = [];
  save();
  renderChats();
  closeSidebar();
}

function clearChat() {
  sessions[currentId] = [];
  save();
  renderChats();
  moreMenu.classList.remove("active");
}

function exportChat() {
  const blob = new Blob([JSON.stringify(chats(), null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "xinn-ai-chat.json";
  a.click();

  URL.revokeObjectURL(url);
  moreMenu.classList.remove("active");
}

function toggleTheme() {
  document.body.classList.toggle("light");
  moreMenu.classList.remove("active");
}

function handleFile(file) {
  if (!file) return;

  addMessage("user", `File dipilih: **${file.name}**`);
  plusMenu.classList.remove("active");
}

function quickAsk(text) {
  input.value = text;
  sendMessage();
}

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

input.addEventListener("focus", () => {
  setTimeout(scrollBottom, 300);
});

document.addEventListener("click", (e) => {
  if (moreMenu && !moreMenu.contains(e.target)) {
    moreMenu.classList.remove("active");
  }

  if (plusMenu && !plusMenu.contains(e.target)) {
    plusMenu.classList.remove("active");
  }
});

window.sendMessage = sendMessage;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.toggleMore = toggleMore;
window.togglePlus = togglePlus;
window.newChat = newChat;
window.clearChat = clearChat;
window.exportChat = exportChat;
window.toggleTheme = toggleTheme;
window.handleFile = handleFile;
window.quickAsk = quickAsk;

renderHistory();
renderChats();
