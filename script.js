const $=id=>document.getElementById(id);
const input=$("messageInput"),chat=$("chatArea"),welcome=$("welcome"),sendBtn=$("sendBtn");
const sidebar=$("sidebar"),overlay=$("overlay"),moreMenu=$("moreMenu"),plusMenu=$("plusMenu"),historyList=$("historyList");
let chats=JSON.parse(localStorage.getItem("xinn_chats")||"[]");
let loading=false;

function save(){localStorage.setItem("xinn_chats",JSON.stringify(chats));renderHistory()}
function scrollBottom(){chat.scrollTo({top:chat.scrollHeight,behavior:"smooth"})}
function md(t){return window.marked?marked.parse(t||""):(t||"").replace(/\n/g,"<br>")}

function copyBtns(){
  document.querySelectorAll("pre").forEach(pre=>{
    if(pre.querySelector(".copy-code-btn"))return;
    const b=document.createElement("button");
    b.className="copy-code-btn";b.textContent="Copy";
    b.onclick=async e=>{
      e.stopPropagation();
      await navigator.clipboard.writeText(pre.querySelector("code")?.innerText||pre.innerText);
      b.textContent="Copied!";
      setTimeout(()=>b.textContent="Copy",1200);
    };
    pre.appendChild(b);
  });
}

function addMessage(role,text,saveIt=true){
  if(welcome)welcome.style.display="none";
  const row=document.createElement("div");
  row.className=`msg ${role}`;
  if(role==="ai"){
    const img=document.createElement("img");
    img.src="./avatar.gif";
    img.className="chat-avatar";
    row.appendChild(img);
  }
  const bubble=document.createElement("div");
  bubble.className="bubble";
  bubble.innerHTML=md(text);
  row.appendChild(bubble);
  chat.appendChild(row);
  if(saveIt){chats.push({role,text});save()}
  copyBtns();scrollBottom();
  return bubble;
}

async function sendMessage(){
  if(loading)return;
  const text=input.value.trim();
  if(!text)return;

  loading=true;sendBtn.disabled=true;input.value="";input.style.height="auto";
  addMessage("user",text);
  const ai=addMessage("ai",`<span class="typing-dots"><span></span><span></span><span></span></span>`,false);
  let out="";

  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,history:chats.slice(-10)})});
    if(!res.ok)throw new Error("API");
    ai.innerHTML="";
    const reader=res.body.getReader(),decoder=new TextDecoder();
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      out+=decoder.decode(value,{stream:true});
      ai.innerHTML=md(out)+`<span class="typing-cursor"></span>`;
      copyBtns();scrollBottom();
    }
    ai.innerHTML=md(out||"⚠️ AI tidak memberi jawaban.");
    chats.push({role:"ai",text:out});save();
  }catch{
    ai.innerHTML="⚠️ Error: API gagal atau koneksi bermasalah.";
  }finally{
    loading=false;sendBtn.disabled=false;scrollBottom();
  }
}

function renderHistory(){
  if(!historyList)return;
  historyList.innerHTML="";
  const first=chats.find(c=>c.role==="user");
  if(first){
    const b=document.createElement("button");
    b.className="history-item";
    b.textContent=first.text.slice(0,32);
    b.onclick=()=>closeSidebar();
    historyList.appendChild(b);
  }
}

function loadChat(){
  if(!chats.length)return;
  if(welcome)welcome.style.display="none";
  chats.forEach(c=>addMessage(c.role,c.text,false));
  renderHistory();
}

function openSidebar(){sidebar.classList.add("active");overlay.classList.add("active")}
function closeSidebar(){sidebar.classList.remove("active");overlay.classList.remove("active")}
function toggleMore(e){e.stopPropagation();moreMenu.classList.toggle("active");plusMenu.classList.remove("active")}
function togglePlus(e){e.stopPropagation();plusMenu.classList.toggle("active");moreMenu.classList.remove("active")}
function newChat(){chats=[];localStorage.removeItem("xinn_chats");chat.innerHTML="";chat.appendChild(welcome);welcome.style.display="flex";renderHistory();closeSidebar()}
function clearChat(){newChat();moreMenu.classList.remove("active")}
function exportChat(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(chats,null,2)]));a.download="xinn-chat.json";a.click()}
function toggleTheme(){document.body.classList.toggle("light");moreMenu.classList.remove("active")}
function quickAsk(t){input.value=t;sendMessage()}
function handleFile(f){if(f)addMessage("user",`File dipilih: **${f.name}**`);plusMenu.classList.remove("active")}

input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,130)+"px"});
document.addEventListener("click",e=>{
  if(!e.target.closest("#moreMenu")&&!e.target.closest(".top-btn"))moreMenu.classList.remove("active");
  if(!e.target.closest("#plusMenu")&&!e.target.closest(".plus-btn"))plusMenu.classList.remove("active");
});

window.sendMessage=sendMessage;window.openSidebar=openSidebar;window.closeSidebar=closeSidebar;window.toggleMore=toggleMore;window.togglePlus=togglePlus;window.newChat=newChat;window.clearChat=clearChat;window.exportChat=exportChat;window.toggleTheme=toggleTheme;window.quickAsk=quickAsk;window.handleFile=handleFile;
loadChat();
