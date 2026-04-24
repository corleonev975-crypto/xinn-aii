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

  let loading = false;

  if (!sendBtn || !input || !chatArea) {
    alert("ERROR: sendBtn / messageInput / chatArea tidak ditemukan");
    return;
  }

  sendBtn.disabled = false;

  function scrollBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function addMessage(role, text) {
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
    bubble.innerHTML = text;

    row.appendChild(bubble);

    if (role === "user") {
      const user = document.createElement("div");
      user.className = "user-avatar";
      user.textContent = "U";
      row.appendChild(user);
    }

    chatArea.appendChild(row);
    scrollBottom();
    return bubble;
  }

  function loadingBubble() {
    return addMessage("ai", `
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
    `);
  }

  async function getAI(text) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
      });

      const data = await res.text();

      if (!data || data.trim() === "") {
        return "⚠️ AI tidak mengembalikan jawaban.";
      }

      return data;
    } catch (err) {
      console.error(err);
      return "⚠️ Error koneksi API.";
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

    const response = await getAI(text);

    ai.innerHTML = "";

    let output = "";

    for (let i = 0; i < response.length; i++) {
      output += response[i];

      ai.innerHTML = output + `<span class="typing-cursor"></span>`;
      scrollBottom();

      let speed = 8;
      if (/[.,!?]/.test(response[i])) speed = 60;

      await new Promise(r => setTimeout(r, speed));
    }

    ai.innerHTML = output;

    loading = false;
    sendBtn.disabled = false;
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

  if (closeSidebarBtn) {
    closeSidebarBtn.onclick = () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  if (overlay) {
    overlay.onclick = () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  if (moreBtn && moreMenu) {
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      moreMenu.classList.toggle("active");
    };
  }

  if (plusBtn && plusMenu) {
    plusBtn.onclick = (e) => {
      e.stopPropagation();
      plusMenu.classList.toggle("active");
    };
  }

  console.log("Xinn AI script aktif");
});
