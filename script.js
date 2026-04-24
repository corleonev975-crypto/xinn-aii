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
  const newChatBtn = document.getElementById("newChatBtn");
  const exportChatBtn = document.getElementById("exportChatBtn");
  const themeBtn = document.getElementById("themeBtn");
  const aboutBtn = document.getElementById("aboutBtn");

  const photoInput = document.getElementById("photoInput");
  const cameraInput = document.getElementById("cameraInput");
  const fileInput = document.getElementById("fileInput");

  let loading = false;
  let chats = JSON.parse(localStorage.getItem("xinn_chats")) || [];

  function saveChats(){
    localStorage.setItem("xinn_chats", JSON.stringify(chats));
  }

  function scrollBottom(){
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
  }

  function normalize(text){
    return (text || "").replace(/\n{3,}/g, "\n\n");
  }

  function render(text, live = false){
    let t = normalize(text);
    if (live && ((t.match(/```/g) || []).length % 2 === 1)) t += "\n```";
    return window.marked ? marked.parse(t) : t.replace(/\n/g, "<br>");
  }

  function highlight(){
    if (window.Prism) requestAnimationFrame(() => Prism.highlightAll());

    setTimeout(() => {
      document.querySelectorAll("pre").forEach(pre => {
        if (pre.querySelector(".copy-code-btn")) return;

        const btn = document.createElement("button");
        btn.className = "copy-code-btn";
        btn.textContent = "Copy";
        btn.type = "button";

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

  function addMessage(role, text, save = true){
    if (welcome) welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    if (role === "ai") {
      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = "./avatar.gif";
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.innerHTML = render(text);
    row.appendChild(bubble);

    if (role === "user") {
      const u = document.createElement("div");
      u.className = "user-avatar";
      u.textContent = "U";
      row.appendChild(u);
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

  function loadingBubble(){
    return addMessage("ai", `<span class="typing-dots"><span></span><span></span><span></span></span>`, false);
  }

  async function streamAI(message, onChunk){
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: chats.slice(-10) })
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

  async function sendMessage(){
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
      await new Promise(r => setTimeout(r, 350));
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

      chats.push({ role: "ai", text: output });
      saveChats();

    } catch {
      ai.innerHTML = "⚠️ Error: API gagal atau koneksi bermasalah.";
    } finally {
      loading = false;
      sendBtn.disabled = false;
      scrollBottom();
    }
  }

  function clearChat(){
    chats = [];
    saveChats();
    chatArea.innerHTML = "";

    if (welcome) {
      chatArea.appendChild(welcome);
      welcome.style.display = "flex";
    }

    loading = false;
    sendBtn.disabled = false;
    closePanels();
  }

  function closePanels(){
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

  clearChatBtn.onclick = clearChat;
  newChatBtn.onclick = clearChat;

  exportChatBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(chats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xinn-ai-chat.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  themeBtn.onclick = () => {
    document.body.classList.toggle("light");
    themeBtn.textContent = document.body.classList.contains("light")
      ? "🌙 Mode Gelap"
      : "🌙 Mode Terang";
  };

  aboutBtn.onclick = () => alert("Xinn AI — AI Assistant buatan kamu sendiri.");

  function handleFile(file){
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
});
