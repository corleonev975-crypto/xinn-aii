let loading=false;
let currentId=localStorage.getItem("xinn_current")||Date.now().toString();
let sessions=JSON.parse(localStorage.getItem("xinn_sessions")||"{}");
if(!sessions[currentId]) sessions[currentId]=[];

const $=id=>document.getElementById(id);
const input=$("messageInput"),chatArea=$("chatArea"),welcome=$("welcome"),sendBtn=$("sendBtn");
const sidebar=$("sidebar"),overlay=$("overlay"),moreMenu=$("moreMenu"),plusMenu=$("plusMenu"),historyList=$("historyList");

function chats(){return sessions[currentId]||[]}
function save(){localStorage.setItem("xinn_sessions",JSON.stringify(sessions));localStorage.setItem("xinn_current",currentId);renderHistory()}
function scrollBottom(){chatArea.scrollTo({top:chatArea.scrollHeight,behavior:"smooth"})}

function render(text,live=false){
  let t=(text||"").replace(/\n{3,}/g,"\n\n");
  if(live&&((t.match(/```/g)||[]).length%2===1))t+="\n```";
  return window.marked?marked.parse(t):t.replace(/\n/g,"<br>");
}

function addCopy(){
  if(window.Prism) Prism.highlightAll();
  document.querySelectorAll("pre").forEach(pre=>{
    if(pre.querySelector(".copy-code-btn"))return;
    const b=document.createElement("button");
    b.className="copy-code-btn";b.textContent="Copy";b.type="button";
    b.onclick=async e=>{
      e.stopPropagation();
      await navigator.clipboard.writeText(pre.querySelector("code")?.innerText||pre.innerText);
      b.textContent="Copied!";setTimeout(()=>b.textContent="Copy",1200);
    };
    pre.appendChild(b);
  });
}

function addMessage(role,text,saveMsg=true){
  if(welcome)welcome.style.display="none";
  const row=document.createElement("div");row.className=`message-row ${role}`;
  if(role==="ai"){const img=document.createElement("img");img.className="chat-avatar";img.src="./avatar.gif";row.appendChild(img)}
  const bubble=document.createElement("div");bubble.className=`message ${role}`;bubble.innerHTML=render(text);row.appendChild(bubble);
  chatArea.appendChild(row);
  if(saveMsg){sessions[currentId].push({role,text});save()}
  addCopy();scrollBottom();return bubble;
}

function renderHistory(){
  if(!historyList)return;
  historyList.innerHTML="";
  Object.entries(sessions).reverse().forEach(([id,list])=>{
    const b=document.createElement("button");b.className="history-item"+(id===currentId?" active":"");
    b.textContent=list.find(x=>x.role==="user")?.text?.slice(0,32)||"New Chat";
    b.onclick=()=>{currentId=id;localStorage.setItem("xinn_current",id);renderChats();closeSidebar()};
    historyList.appendChild(b);
  });
}

function renderChats(){
  chatArea.innerHTML="";
  if(chats().length===0){chatArea.appendChild(welcome);welcome.style.display="flex";return}
  chats().forEach(m=>addMessage(m.role,m.text,false));
}

async function askAI(message,onChunk){
  const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,history:chats().slice(-10)})});
  if(!res.ok)throw new Error("API error");
  const reader=res.body.getReader(),decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;const chunk=decoder.decode(value,{stream:true});if(chunk)onChunk(chunk)}
}

async function sendMessage(){
  if(loading)return;
  const text=input.value.trim();if(!text)return;
  loading=true;sendBtn.disabled=true;input.value="";
  addMessage("user",text);
  const ai=addMessage("ai",`<span class="typing-dots"><span></span><span></span><span></span></span>`,false);
  let out="",last=0;
  try{
    await new Promise(r=>setTimeout(r,300));ai.innerHTML="";
    await askAI(text,chunk=>{
      out+=chunk;const now=Date.now();
      if(now-last>60||/[.!?}\n]$/.test(out)){ai.innerHTML=render(out,true)+`<span class="typing-cursor"></span>`;addCopy();scrollBottom();last=now}
    });
    ai.innerHTML=out?render(out):"⚠️ AI tidak memberi jawaban.";addCopy();
    sessions[currentId].push({role:"ai",text:out});save();
  }catch(e){ai.innerHTML="⚠️ Error: API gagal atau koneksi bermasalah."}
  finally{loading=false;sendBtn.disabled=false;scrollBottom()}
}

function openSidebar(){sidebar.classList.add("active");overlay.classList.add("active")}
function closeSidebar(){sidebar.classList.remove("active");overlay.classList.remove("active")}
function toggleMore(e){e.stopPropagation();moreMenu.classList.toggle("active");plusMenu.classList.remove("active")}
function togglePlus(e){e.stopPropagation();plusMenu.classList.toggle("active");moreMenu.classList.remove("active")}
function newChat(){currentId=Date.now().toString();sessions[currentId]=[];save();renderChats();closeSidebar()}
function clearChat(){sessions[currentId]=[];save();renderChats();moreMenu.classList.remove("active")}
function exportChat(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(chats(),null,2)]));a.download="xinn-ai-chat.json";a.click()}
function toggleTheme(){document.body.classList.toggle("light")}
function handleFile(file){if(file)addMessage("user",`File dipilih: **${file.name}**`)}

input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,140)+"px"});
document.addEventListener("click",e=>{if(moreMenu&&!moreMenu.contains(e.target))moreMenu.classList.remove("active");if(plusMenu&&!plusMenu.contains(e.target))plusMenu.classList.remove("active")});

window.sendMessage=sendMessage;window.openSidebar=openSidebar;window.closeSidebar=closeSidebar;window.toggleMore=toggleMore;window.togglePlus=togglePlus;window.newChat=newChat;window.clearChat=clearChat;window.exportChat=exportChat;window.toggleTheme=toggleTheme;window.handleFile=handleFile;

renderHistory();renderChats();
