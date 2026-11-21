(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const cfg = window.GILLAHUB_CONFIG || {};
  const configured = cfg.supabaseUrl?.startsWith("https://") && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("IDE_");
  const client = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  let user = null, profile = null, currentChannel = "global", chatSubscription = null, lobbyCache = [], postCache = [];
  const toast = (msg) => { const el=$("#toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2800); };
  const open = id => $("#"+id).classList.add("open");
  const closeAll = () => $$(".modal-backdrop").forEach(x=>x.classList.remove("open"));
  $$("[data-close]").forEach(b=>b.addEventListener("click",closeAll));
  $$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeAll()}));
  $("#openAuth").onclick=()=>open("authModal"); $("#heroJoin").onclick=()=>user?open("profileModal"):open("authModal");
  $("#menuToggle").onclick=()=>document.querySelector(".topbar nav").classList.toggle("open");
  $$("nav a").forEach(a=>a.addEventListener("click",()=>{$$("nav a").forEach(n=>n.classList.remove("active"));a.classList.add("active");document.querySelector(".topbar nav").classList.remove("open")}));
  if(!client){toast("A Supabase beállítás még hiányzik. Nézd meg a README-t!");}
  const requireLogin=()=>{if(!user){open("authModal");toast("Ehhez előbb be kell jelentkezned.");return false}return true};
  const initials=n=>(n||"?").trim().slice(0,1).toUpperCase();
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=t=>new Date(t).toLocaleString("hu-HU",{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"});
  async function loadProfile(){
    if(!client||!user)return;
    const {data,error}=await client.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if(error){console.error(error);return}
    profile=data;
    if(!profile){$("#profileName").value=user.user_metadata?.full_name||user.email?.split("@")[0]||"";open("profileModal")}
    renderAccount();
  }
  function renderAccount(){
    const area=$("#accountArea");
    if(!user){area.innerHTML='<button class="btn btn-outline" id="openAuthAgain">Bejelentkezés</button>';$("#openAuthAgain").onclick=()=>open("authModal");return}
    area.innerHTML=`<button class="btn btn-outline" id="profileButton">${safe(profile?.display_name||user.email?.split("@")[0]||"Profil")} ▾</button>`;
    $("#profileButton").onclick=()=>{if(profile){$("#profileName").value=profile.display_name||"";$("#gameName").value=profile.game_name||"";$("#profileBio").value=profile.bio||""}open("profileModal")};
  }
  async function refreshSession(){
    if(!client){renderAccount();return}
    const {data}=await client.auth.getSession();user=data.session?.user||null;
    if(user){await loadProfile();$("#messageInput").disabled=false;$(".send-btn").disabled=false;await loadMessages();await loadLobbies();await loadPosts();}else{profile=null;renderAccount();$("#messageInput").disabled=true;$(".send-btn").disabled=true;}
  }
  $("#googleLogin").onclick=async()=>{if(!client)return toast("Előbb állítsd be a Supabase-t a config.js fájlban.");const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href.split("#")[0]}});if(error)toast(error.message)};
  $("#authForm").addEventListener("submit",async e=>{e.preventDefault();if(!client)return toast("Előbb állítsd be a Supabase-t.");const email=$("#authEmail").value.trim(),password=$("#authPassword").value;const {data,error}=await client.auth.signUp({email,password});if(error)return toast(error.message);toast(data.session?"Sikeres regisztráció!":"Ellenőrizd az e-mailjeidet a megerősítéshez.");if(data.session){closeAll();await refreshSession()}});
  $("#emailLogin").onclick=async()=>{if(!client)return toast("Előbb állítsd be a Supabase-t.");const {data,error}=await client.auth.signInWithPassword({email:$("#authEmail").value.trim(),password:$("#authPassword").value});if(error)return toast(error.message);closeAll();user=data.user;await refreshSession();toast("Sikeres belépés!")};
  $("#profileForm").onsubmit=async e=>{e.preventDefault();if(!requireLogin()||!client)return;const row={id:user.id,display_name:$("#profileName").value.trim(),game_name:$("#gameName").value.trim(),bio:$("#profileBio").value.trim(),updated_at:new Date().toISOString()};const {data,error}=await client.from("profiles").upsert(row).select().single();if(error)return toast(error.message);profile=data;closeAll();renderAccount();toast("Profil elmentve!")};
  async function loadMessages(){
    if(!client)return;const {data,error}=await client.from("messages").select("id,content,created_at,user_id,profiles(display_name)").eq("channel",currentChannel).order("created_at",{ascending:true}).limit(80);
    if(error){console.error(error);$("#messages").innerHTML='<div class="empty-state">A chat adatbázisa még nincs beállítva.</div>';return}
    renderMessages(data||[]);
    if(chatSubscription)client.removeChannel(chatSubscription);
    chatSubscription=client.channel("chat-"+currentChannel).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`channel=eq.${currentChannel}`},async payload=>{
      const {data:row}=await client.from("messages").select("id,content,created_at,user_id,profiles(display_name)").eq("id",payload.new.id).single();
      if(row)appendMessage(row);
    }).subscribe();
  }
  function renderMessages(rows){$("#messages").innerHTML="";if(!rows.length){$("#messages").innerHTML='<div class="empty-state"><div class="empty-symbol">⌁</div><b>Még nincs beszélgetés</b><p>Írd meg az első üzenetet!</p></div>';return}rows.forEach(appendMessage)}
  function appendMessage(m){const box=$("#messages");if(box.querySelector(".empty-state"))box.innerHTML="";if(box.querySelector(`[data-mid="${m.id}"]`))return;const name=m.profiles?.display_name||"Játékos";const el=document.createElement("div");el.className="message";el.dataset.mid=m.id;el.innerHTML=`<div class="avatar av2">${safe(initials(name))}</div><div class="message-content"><div class="message-meta"><b>${safe(name)}</b>${fmt(m.created_at)}</div><p>${safe(m.content)}</p></div>`;box.append(el);box.scrollTop=box.scrollHeight}
  $("#messageForm").onsubmit=async e=>{e.preventDefault();if(!requireLogin()||!client)return;const content=$("#messageInput").value.trim();if(!content)return;const {error}=await client.from("messages").insert({user_id:user.id,channel:currentChannel,content});if(error)return toast(error.message);$("#messageInput").value=""};
  $$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(t=>t.classList.remove("active"));b.classList.add("active");currentChannel=b.dataset.tab;$("#chatTitle").textContent="# "+(currentChannel==="global"?"általános":currentChannel);if(currentChannel==="friends"){if(!requireLogin())return;$("#messages").innerHTML='<div class="empty-state">A barátlista funkció a következő fejlesztési körben kapcsolható be.</div>';if(chatSubscription)client.removeChannel(chatSubscription)}else loadMessages()});
  $("#createLobby").onclick=()=>requireLogin()&&open("lobbyModal");
  $("#lobbyForm").onsubmit=async e=>{e.preventDefault();if(!requireLogin()||!client)return;const row={owner_id:user.id,title:$("#lobbyName").value.trim(),description:$("#lobbyDesc").value.trim(),max_players:Number($("#lobbySize").value),status:"open"};const {error}=await client.from("lobbies").insert(row);if(error)return toast(error.message);e.target.reset();closeAll();toast("Lobby létrehozva!");loadLobbies()};
  async function loadLobbies(){if(!client)return;const {data,error}=await client.from("lobbies").select("*,profiles(display_name)").order("created_at",{ascending:false}).limit(50);if(error){console.error(error);return}lobbyCache=data||[];renderLobbies()}
  function renderLobbies(){const term=$("#lobbySearch").value.toLowerCase(),filter=$("#lobbyFilter").value;const rows=lobbyCache.filter(x=>(x.title+" "+(x.description||"")).toLowerCase().includes(term)&&(filter==="all"||x.status==="open"));$("#lobbyList").innerHTML=rows.length?rows.map(x=>`<article class="lobby-card"><div class="eyebrow">◈ ${x.status==="open"?"NYITOTT":"LEZÁRT"} LOBBY</div><h3>${safe(x.title)}</h3><p>${safe(x.description||"Nincs leírás.")}</p><div class="lobby-meta"><span>Host: ${safe(x.profiles?.display_name||"Játékos")}</span><span>Max. ${x.max_players} fő</span></div><button class="btn btn-primary" data-join="${x.id}">Lobbykérés</button></article>`).join(""):'<div class="empty-card">Most nincs ilyen lobby. Hozz létre egyet!</div>';$$("[data-join]").forEach(b=>b.onclick=()=>requestLobby(b.dataset.join))}
  async function requestLobby(id){if(!requireLogin()||!client)return;const {error}=await client.from("lobby_requests").insert({lobby_id:id,requester_id:user.id});if(error){toast(error.code==="23505"?"Már elküldted ezt a kérést.":error.message);return}toast("Lobbykérés elküldve a hostnak!")};
  $("#lobbySearch").oninput=renderLobbies;$("#lobbyFilter").onchange=renderLobbies;
  $("#newPost").onclick=()=>requireLogin()&&open("postModal");
  $("#postForm").onsubmit=async e=>{e.preventDefault();if(!requireLogin()||!client)return;const {error}=await client.from("posts").insert({user_id:user.id,title:$("#postTitle").value.trim(),body:$("#postBody").value.trim()});if(error)return toast(error.message);e.target.reset();closeAll();toast("Poszt közzétéve!");loadPosts()};
  async function loadPosts(){if(!client)return;const {data,error}=await client.from("posts").select("*,profiles(display_name)").order("created_at",{ascending:false}).limit(30);if(error){console.error(error);return}postCache=data||[];renderPosts()}
  function renderPosts(){$("#postList").innerHTML=postCache.length?postCache.map(p=>`<article class="post-card"><div class="post-by">${safe(p.profiles?.display_name||"Játékos")} · ${fmt(p.created_at)}</div><h3>${safe(p.title)}</h3><p>${safe(p.body)}</p><button class="btn btn-ghost" data-report="${p.id}">Jelentés</button></article>`).join(""):'<div class="empty-card">Még nincsenek posztok. Legyél te az első!</div>';$$("[data-report]").forEach(b=>b.onclick=async()=>{if(!requireLogin()||!client)return;const reason=prompt("Miért szeretnéd jelenteni ezt a posztot?");if(!reason)return;const {error}=await client.from("reports").insert({reporter_id:user.id,content_type:"post",content_id:b.dataset.report,reason:reason.slice(0,300)});toast(error?error.message:"Jelentés elküldve. Köszönjük!")})}
  if(client){client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setTimeout(refreshSession,0)});refreshSession()}
})();