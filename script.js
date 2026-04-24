document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("messageInput");
  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");

  const menuBtn = document.getElementById("menuBtn");
  const moreBtn = document.getElementById("moreBtn");
  const plusBtn = document.getElementById("plusBtn");

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  const moreMenu = document.getElementById("moreMenu");
  const plusMenu = document.getElementById("plusMenu");

  if (!sendBtn || !input || !chatArea) {
    alert("ERROR: sendBtn / messageInput / chatArea tidak ditemukan");
    return;
  }

  function hideWelcome() {
    if (welcome) welcome.style.display = "none";
  }

  function scrollBottom() {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: "smooth"
    });
  }

  function addMessage(role, text) {
    hideWelcome();

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.textContent = text;

    row.appendChild(bubble);
    chatArea.appendChild(row);
    scrollBottom();
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMessage("user", text);

    setTimeout(() => {
      addMessage("ai", "Halo! Saya siap membantu kamu.");
    }, 400);
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.add("active");
      overlay.classList.add("active");
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    });
  }

  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moreMenu.classList.toggle("active");
      if (plusMenu) plusMenu.classList.remove("active");
    });
  }

  if (plusBtn && plusMenu) {
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      plusMenu.classList.toggle("active");
      if (moreMenu) moreMenu.classList.remove("active");
    });
  }

  document.addEventListener("click", (e) => {
    if (moreMenu && moreBtn && !moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove("active");
    }

    if (plusMenu && plusBtn && !plusMenu.contains(e.target) && e.target !== plusBtn) {
      plusMenu.classList.remove("active");
    }
  });

  console.log("Xinn AI script aktif");
});
