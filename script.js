const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");

// auto resize textarea
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

// enter kirim
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  welcome.style.display = "none";

  addMessage(text, "user");

  input.value = "";
  input.style.height = "auto";

  // loading bubble
  const loading = addMessage("...", "ai");

  setTimeout(() => {
    fakeAIResponse(text, loading);
  }, 500);
}

// =========================
// RENDER MESSAGE
// =========================
function addMessage(content, role) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.innerHTML = content;

  msg.appendChild(bubble);
  chatArea.appendChild(msg);

  scrollBottom();

  return bubble;
}

// =========================
// AI RESPONSE SIMULASI
// =========================
function fakeAIResponse(userText, bubble) {
  let response = "";

  if (userText.toLowerCase().includes("portofolio")) {
    response = `
Berikut contoh sederhana:

### index.html
\`\`\`html
<!DOCTYPE html>
<html>
<head>
<title>Portfolio</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Halo Dunia</h1>
</body>
</html>
\`\`\`

### style.css
\`\`\`css
body {
  background: black;
  color: white;
}
\`\`\`
`;
  } else {
    response = "Halo! Saya siap membantu kamu 🚀";
  }

  renderStreaming(response, bubble);
}

// =========================
// STREAMING + MARKDOWN FIX
// =========================
function renderStreaming(text, bubble) {
  bubble.innerHTML = "";

  let i = 0;

  const interval = setInterval(() => {
    bubble.innerHTML = marked.parse(text.slice(0, i));

    Prism.highlightAll();

    addCopyButton();

    scrollBottom();

    i += 3;

    if (i >= text.length) {
      clearInterval(interval);
    }
  }, 15);
}

// =========================
// COPY BUTTON FIX
// =========================
function addCopyButton() {
  document.querySelectorAll("pre").forEach((block) => {
    if (block.querySelector(".copy-btn")) return;

    const btn = document.createElement("button");
    btn.innerText = "Copy";
    btn.className = "copy-btn";

    btn.onclick = () => {
      navigator.clipboard.writeText(block.innerText);
      btn.innerText = "Copied!";
      setTimeout(() => (btn.innerText = "Copy"), 1500);
    };

    block.appendChild(btn);
  });
}

// =========================
// SCROLL SMOOTH
// =========================
function scrollBottom() {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior: "smooth"
  });
}

// auto focus
input.focus();
