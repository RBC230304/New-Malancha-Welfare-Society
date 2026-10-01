const DEFAULT = {
  notices:[
    {id:1,title:"NMWS Website Launch",date:"2026-10-01",type:"Important",text:"Our new official NMWS website is now being prepared with notices, programs, albums, members and public interaction."},
    {id:2,title:"Upcoming Welfare Programme",date:"2026-10-15",type:"Event",text:"Details of the upcoming NMWS welfare programme will be published here."}
  ],
  programs:[
    {id:1,title:"Community Welfare Programme",date:"2026-10-15",location:"Agartala, Tripura",status:"Upcoming",desc:"A community-focused welfare initiative by NMWS."},
    {id:2,title:"Awareness Programme",date:"2026-08-20",location:"Tripura",status:"Completed",desc:"Awareness and community participation programme."}
  ],
  members:[
    {id:1,name:"Member Name",role:"President",phone:"+91 00000 00000",email:"member@nmws.org",photo:"assets/nmws-logo.png",bio:"NMWS executive member."}
  ],
  contacts:[
    {id:1,label:"Office",value:"New Malancha Welfare Society, Agartala, Tripura"},
    {id:2,label:"Phone",value:"+91 00000 00000"},
    {id:3,label:"Email",value:"info@nmws.org"},
    {id:4,label:"Facebook",value:"NMWS Official"}
  ],
  album:[
    {id:1,type:"image",src:"assets/nmws-logo.png",title:"NMWS Official Logo",description:"Official New Malancha Welfare Society logo.",category:"General",eventName:"NMWS"}
  ],
  developer:{name:"SOFT_TECH Technical Space",person:"Website Developer",image:"assets/nmws-logo.png",description:"Website design and development partner for NMWS."},
  slider:[
    {id:1,src:"assets/nmws-logo.png",title:"NEW MALANCHA WELFARE SOCIETY",subtitle:"TOGETHER WE CARE, TOGETHER WE GROW"}
  ],
  messages:[]
};

const MEDIA_DB_NAME="nmwsMediaDB";
const MEDIA_STORE="media";
let mediaUrlCache={};
let nmwsDataCache = null;
let nmwsCloudStarted = false;
let nmwsCloudListener = null;

function normalizeData(d){
  d=d||{};
  d.notices=Array.isArray(d.notices)?d.notices:[];
  d.programs=Array.isArray(d.programs)?d.programs:[];
  d.members=Array.isArray(d.members)?d.members:[];
  d.contacts=Array.isArray(d.contacts)?d.contacts:[];
  d.album=Array.isArray(d.album)?d.album:[];
  d.messages=Array.isArray(d.messages)?d.messages:[];
  d.album=d.album.map(x=>({...x,category:x.category||"General",eventName:x.eventName||"NMWS Program"}));
  d.slider=Array.isArray(d.slider)?d.slider:structuredClone(DEFAULT.slider);
  d.developer=d.developer&&typeof d.developer==='object'?d.developer:structuredClone(DEFAULT.developer);
  return d;
}

function data(){
  if(nmwsDataCache) return nmwsDataCache;
  try{
    const raw=localStorage.getItem("nmwsData");
    nmwsDataCache=normalizeData(raw?JSON.parse(raw):structuredClone(DEFAULT));
    if(!raw) localStorage.setItem("nmwsData",JSON.stringify(nmwsDataCache));
  }catch(e){ nmwsDataCache=normalizeData(structuredClone(DEFAULT)); }
  return nmwsDataCache;
}

function save(x){
  nmwsDataCache=normalizeData(x);
  try{localStorage.setItem("nmwsData",JSON.stringify(nmwsDataCache));}catch(e){console.error(e);toast("Data saved locally, but browser storage is full.");return false}
  // Cloud save is deliberately fire-and-forget so existing buttons/forms keep working.
  if(window.nmwsDB){
    window.nmwsDB.collection("nmws").doc("siteData").set(nmwsDataCache)
      .catch(e=>{console.error("Firestore save failed",e);toast("Saved on this computer, but Firebase save failed.")});
  }
  return true;
}

function startFirebaseSync(){
  if(nmwsCloudStarted) return;
  nmwsCloudStarted=true;
  if(!window.firebase || !window.NMWS_FIREBASE_CONFIG) return;
  try{
    if(!firebase.apps.length) firebase.initializeApp(window.NMWS_FIREBASE_CONFIG);
    window.nmwsDB=firebase.firestore();
    const ref=window.nmwsDB.collection("nmws").doc("siteData");
    ref.get().then(snap=>{
      if(snap.exists){
        nmwsDataCache=normalizeData(snap.data());
        try{localStorage.setItem("nmwsData",JSON.stringify(nmwsDataCache));}catch(e){}
        refreshPageAfterCloud();
      }else{
        ref.set(data()).catch(console.error);
      }
      if(nmwsCloudListener) nmwsCloudListener();
      nmwsCloudListener=ref.onSnapshot(s=>{
        if(!s.exists) return;
        nmwsDataCache=normalizeData(s.data());
        try{localStorage.setItem("nmwsData",JSON.stringify(nmwsDataCache));}catch(e){}
        refreshPageAfterCloud();
      },e=>console.error("Firestore listener failed",e));
    }).catch(e=>console.error("Firestore connection failed",e));
  }catch(e){console.error("Firebase initialization failed",e)}
}

function refreshPageAfterCloud(){
  try{
    const p=location.pathname.toLowerCase();
    if(p.endsWith("index.html")||p.endsWith("/")){renderNotices(document.getElementById("noticeList")?.dataset.limit);renderPrograms();renderHeroSlider()}
    else if(p.includes("programs.html")&&!p.includes("admin-"))renderPrograms();
    else if(p.includes("notices.html")&&!p.includes("admin-"))renderNotices(document.getElementById("noticeList")?.dataset.limit);
    else if(p.includes("members.html")&&!p.includes("admin-"))renderMembers();
    else if(p.includes("contact.html")&&!p.includes("admin-"))renderContacts();
    else if(p.includes("developer.html")&&!p.includes("admin-"))renderDeveloper();
    else if(p.includes("album.html")&&!p.includes("admin-"))renderAlbum(window.currentAlbumCategory);
    else if(p.includes("admin-dashboard"))adminDashboard();
    else if(p.includes("admin-notices"))renderNoticeAdmin();
    else if(p.includes("admin-programs"))renderAdminTable("programs");
    else if(p.includes("admin-members"))renderMembersAdmin();
    else if(p.includes("admin-messages"))renderAdminTable("messages");
    else if(p.includes("admin-album"))renderAlbumAdmin();
    else if(p.includes("admin-slider"))renderSliderAdmin();
    else if(p.includes("admin-contact"))renderContactAdmin();
    else if(p.includes("admin-developer"))renderDeveloperAdmin();
  }catch(e){console.error("Cloud refresh failed",e)}
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmt(d){try{return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}catch{return d}}
function toast(t){const e=document.getElementById("toast");if(e){e.textContent=t;e.style.display="block";clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.style.display="none",2800)}}
function setupNav(){const b=document.querySelector(".menu"),n=document.querySelector("nav");if(b)b.onclick=()=>n.classList.toggle("open")}

// ---------- Cloudinary media storage ----------
// Images/videos are uploaded to Cloudinary so they are available on every device.
// The unsigned upload preset is safe to use in browser code; never put an API secret here.
const CLOUDINARY_CLOUD_NAME = "rcaihswf";
const CLOUDINARY_UPLOAD_PRESET = "nmws_upload";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

async function mediaPut(file){
  if(!file) throw new Error("No file selected");
  const form=new FormData();
  form.append("file",file);
  form.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  form.append("folder","nmws");
  const res=await fetch(CLOUDINARY_UPLOAD_URL,{method:"POST",body:form});
  let result={};
  try{result=await res.json()}catch(e){}
  if(!res.ok || !result.secure_url){
    console.error("Cloudinary upload error",result);
    throw new Error(result?.error?.message||"Cloudinary upload failed");
  }
  return result.secure_url;
}

async function mediaGet(ref){
  if(!ref)return "";
  // New Cloudinary URLs are already directly usable by img/video elements.
  if(/^https?:\/\//i.test(ref))return ref;
  // Keep support for older local IndexedDB uploads on this browser.
  if(!ref.startsWith("idb:"))return ref;
  try{
    if(!window.indexedDB)return "";
    const db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open("nmwsMediaDB",1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("media"))r.result.createObjectStore("media")};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error("DB error"));
    });
    const key=ref.slice(4);
    const blob=await new Promise((resolve,reject)=>{
      const tx=db.transaction("media","readonly");
      const req=tx.objectStore("media").get(key);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Read failed"));
    });
    db.close();
    if(!blob)return "";
    if(mediaUrlCache[ref])return mediaUrlCache[ref];
    const url=URL.createObjectURL(blob);mediaUrlCache[ref]=url;return url;
  }catch(e){console.error("Legacy local media read failed",e);return ""}
}

// Cloudinary assets cannot be deleted securely from browser code. Firestore records
// are removed normally; old assets can be cleaned from Cloudinary Media Library later.
async function mediaDelete(ref){
  if(!ref || !ref.startsWith("idb:"))return;
  try{
    if(!window.indexedDB)return;
    const db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open("nmwsMediaDB",1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("media"))r.result.createObjectStore("media")};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error("DB error"));
    });
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("media","readwrite");
      tx.objectStore("media").delete(ref.slice(4));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("Delete failed"));
    });
    db.close();delete mediaUrlCache[ref];
  }catch(e){console.error(e)}
}
async function setImageSource(img,ref){const url=await mediaGet(ref);if(url)img.src=url}
async function setVideoSource(video,ref){const url=await mediaGet(ref);if(url){video.src=url;video.load()}}

// ---------- Public rendering ----------
function renderNotices(limit){const d=data(),box=document.getElementById("noticeList");if(!box)return;let a=d.notices.slice().sort((x,y)=>y.date.localeCompare(x.date));if(limit)a=a.slice(0,limit);box.innerHTML=a.length?a.map(x=>`<div class="notice"><div class="notice-date"><b>${new Date(x.date+"T00:00:00").getDate()}</b><small>${new Date(x.date+"T00:00:00").toLocaleDateString("en",{month:"short"})}</small></div><div><span class="tag">${esc(x.type)}</span><h3>${esc(x.title)}</h3><p class="muted">${esc(x.text)}</p></div></div>`).join(""):`<p class="muted">No notices published.</p>`}
function renderPrograms(){const d=data(),box=document.getElementById("programGrid");if(!box)return;box.innerHTML=d.programs.map(x=>`<article class="card"><div class="card-body"><span class="tag">${esc(x.status)}</span><h3>${esc(x.title)}</h3><p><b>📅</b> ${fmt(x.date)}</p><p><b>📍</b> ${esc(x.location)}</p><p class="muted">${esc(x.desc)}</p><a class="btn btn-primary" href="contact.html?program=${encodeURIComponent(x.title)}" style="margin-top:12px">Know More</a></div></article>`).join("")}
async function renderMembers(){const d=data(),box=document.getElementById("memberGrid");if(!box)return;box.innerHTML=d.members.map(x=>`<article class="card member-card"><img data-media="${esc(x.photo||"assets/nmws-logo.png")}" alt="${esc(x.name)}"><div class="card-body"><h3>${esc(x.name)}</h3><div class="role">${esc(x.role)}</div><p>📞 ${esc(x.phone)}</p><p>✉️ ${esc(x.email)}</p><p class="muted">${esc(x.bio)}</p></div></article>`).join("");for(const img of box.querySelectorAll("img[data-media]"))await setImageSource(img,img.dataset.media)}
function renderContacts(){const d=data(),box=document.getElementById("contactInfo");if(!box)return;box.innerHTML=d.contacts.map(x=>`<div class="info-row"><b>${esc(x.label)}</b><div class="muted">${esc(x.value)}</div></div>`).join("")}
async function renderDeveloper(){const d=data(),e=document.getElementById("developerBox");if(!e)return; e.innerHTML=`<div class="card"><div class="card-body" style="text-align:center"><img id="publicDeveloperImage" style="width:150px;height:150px;object-fit:contain;margin:0 auto 15px"><h2>${esc(d.developer.name)}</h2><p class="role">${esc(d.developer.person)}</p><p class="muted">${esc(d.developer.description)}</p></div></div>`;await setImageSource(document.getElementById("publicDeveloperImage"),d.developer.image||"assets/nmws-logo.png")}
function getAlbumGroups(){
  const items=data().album||[], groups={};
  items.forEach(x=>{
    const cat=x.category||"General";
    (groups[cat] ||= []).push(x);
  });
  return groups;
}
async function renderAlbum(category){
  const box=document.getElementById("albumGrid");
  if(!box)return;
  const groups=getAlbumGroups(), cats=Object.keys(groups);
  if(!cats.length){
    box.innerHTML='<p class="muted">No photos or videos have been added yet.</p>';
    return;
  }
  const selected=category && groups[category] ? category : null;

  if(!selected){
    box.innerHTML=`<div class="album-category-picker"><div class="section-head" style="margin-bottom:20px"><div><h2>Choose a Category</h2><p class="muted">Click a category to open its complete photo gallery.</p></div></div>
      <div class="album-category-cards">${cats.map(cat=>{
        const cover=groups[cat].find(x=>x.type==="image") || groups[cat][0];
        return `<button class="album-category-card" type="button" data-category="${encodeURIComponent(cat)}">
          <div class="album-category-cover">${cover.type==="video"?`<video data-media="${esc(cover.src)}" muted></video>`:`<img data-media="${esc(cover.src)}" alt="${esc(cat)}">`}</div>
          <div class="album-category-info"><span class="tag">${esc(cat)}</span><h3>${esc(cat)}</h3><p class="muted">${groups[cat].length} item${groups[cat].length===1?"":"s"}</p></div>
        </button>`;
      }).join("")}</div></div>`;
    for(const el of box.querySelectorAll("[data-media]")){
      if(el.tagName==="VIDEO") await setVideoSource(el,el.dataset.media); else await setImageSource(el,el.dataset.media);
    }
    box.querySelectorAll(".album-category-card").forEach(btn=>{
      btn.addEventListener("click",()=>renderAlbum(decodeURIComponent(btn.dataset.category)));
    });
    return;
  }

  window.currentAlbumCategory=selected;
  const items=groups[selected];
  const events={};
  items.forEach(x=>{const ev=x.eventName||"NMWS Program";(events[ev] ||= []).push(x)});
  box.innerHTML=`<div class="album-gallery-view">
    <div class="album-gallery-top"><div><button class="btn btn-light" id="albumBackButton">← All Categories</button><span class="tag" style="margin-left:8px">${esc(selected)}</span>
    <h2 style="margin-top:8px">${esc(selected)}</h2><p class="muted">All photos and videos in this category.</p></div></div>
    ${Object.entries(events).map(([event,arr])=>`<section class="album-event">
      <div class="album-event-head"><div><h3>${esc(event)}</h3><p class="muted">${arr.length} item${arr.length===1?"":"s"}</p></div></div>
      <div class="gallery">${arr.map(x=>`<div class="gallery-item album-media-item" data-album-id="${x.id}">
        ${x.type==="video"?`<video data-media="${esc(x.src)}" controls preload="metadata"></video>`:`<img data-media="${esc(x.src)}" alt="${esc(x.title||event)}">`}
        <div class="caption"><b>${esc(x.title||event)}</b>${x.description?`<br><small>${esc(x.description)}</small>`:""}</div>
      </div>`).join("")}</div>
    </section>`).join("")}
  </div>`;

  if(document.getElementById("albumBackButton")) document.getElementById("albumBackButton").onclick=()=>renderAlbum();
  for(const el of box.querySelectorAll("[data-media]")){
    if(el.tagName==="VIDEO") await setVideoSource(el,el.dataset.media); else await setImageSource(el,el.dataset.media);
  }
  box.querySelectorAll(".album-media-item").forEach(card=>{
    const id=Number(card.dataset.albumId), item=items.find(x=>x.id===id);
    if(item && item.type==="image"){
      card.addEventListener("click",e=>{
        if(e.target.tagName==="BUTTON"||e.target.tagName==="VIDEO"||e.target.closest("video"))return;
        openAlbumLightbox(id,selected);
      });
    }
  });
}
async function openAlbumLightbox(id,category){
  const groups=getAlbumGroups(),items=(groups[category]||[]).filter(x=>x.type==="image");
  const index=Math.max(0,items.findIndex(x=>x.id===id));
  window.albumLightboxItems=items;window.albumLightboxIndex=index;
  const modal=document.getElementById("albumLightbox");if(!modal)return;
  modal.style.display="grid";document.body.classList.add("lightbox-open");
  await updateAlbumLightbox();
}
async function updateAlbumLightbox(){
  const modal=document.getElementById("albumLightbox"),items=window.albumLightboxItems||[];
  if(!modal||!items.length)return;
  const item=items[window.albumLightboxIndex]||items[0];
  const img=modal.querySelector("#albumLightboxImage"),title=modal.querySelector("#albumLightboxTitle"),count=modal.querySelector("#albumLightboxCount");
  title.textContent=item.title||"NMWS Photo";count.textContent=`${window.albumLightboxIndex+1} / ${items.length}`;
  img.src=await mediaGet(item.src);
}
function closeAlbumLightbox(){const m=document.getElementById("albumLightbox");if(m)m.style.display="none";document.body.classList.remove("lightbox-open")}
async function albumLightboxMove(step){
  const items=window.albumLightboxItems||[];if(!items.length)return;
  window.albumLightboxIndex=(window.albumLightboxIndex+step+items.length)%items.length;
  await updateAlbumLightbox();
}
function renderHeroSlider(){
  const root=document.getElementById("homeFeatureSlider");if(!root)return;const slides=data().slider||[];
  if(!slides.length){root.innerHTML='<div class="hero-slide empty"><p>No featured photos added yet.</p></div>';return}
  root.innerHTML=slides.map((x,i)=>`<div class="hero-slide ${i===0?"active":""}"><img data-media="${esc(x.src)}" alt="${esc(x.title||"NMWS")}"><div class="hero-slide-overlay"><strong>${esc(x.title||"")}</strong><small>${esc(x.subtitle||"")}</small></div></div>`).join("")+(slides.length>1?`<button class="slider-arrow prev" onclick="moveHeroSlide(-1)" aria-label="Previous">‹</button><button class="slider-arrow next" onclick="moveHeroSlide(1)" aria-label="Next">›</button><div class="slider-dots">${slides.map((x,i)=>`<button class="slider-dot ${i===0?"active":""}" onclick="showHeroSlide(${i})"></button>`).join("")}</div>`:"");
  root.querySelectorAll("img[data-media]").forEach(img=>setImageSource(img,img.dataset.media));window.heroIndex=0;if(window.heroTimer)clearInterval(window.heroTimer);if(slides.length>1)window.heroTimer=setInterval(()=>moveHeroSlide(1),5000)
}
function showHeroSlide(index){const slides=[...document.querySelectorAll("#homeFeatureSlider .hero-slide")],dots=[...document.querySelectorAll("#homeFeatureSlider .slider-dot")];if(!slides.length)return;window.heroIndex=(index+slides.length)%slides.length;slides.forEach((s,i)=>s.classList.toggle("active",i===window.heroIndex));dots.forEach((d,i)=>d.classList.toggle("active",i===window.heroIndex))}
function moveHeroSlide(step){showHeroSlide((window.heroIndex||0)+step)}

// ---------- Contact/public ----------
function setupContactForm(){const f=document.getElementById("contactForm");if(!f)return;const q=new URLSearchParams(location.search).get("program");if(q&&f.subject)f.subject.value="Enquiry about: "+q;f.onsubmit=e=>{e.preventDefault();let d=data();d.messages.push({id:Date.now(),name:f.name.value,email:f.email.value,subject:f.subject.value,message:f.message.value,date:new Date().toISOString()});if(save(d)){f.reset();if(q&&f.subject)f.subject.value="Enquiry about: "+q;toast("Message sent to NMWS administration.")}}}
function initPublic(){setupNav();renderNotices(document.getElementById("noticeList")?.dataset.limit);renderPrograms();renderMembers();renderContacts();renderDeveloper();renderAlbum();renderHeroSlider();setupContactForm()}

// ---------- Admin ----------
function adminGuard(){if(localStorage.getItem("nmwsAdmin")!=="1"){location.href="admin.html";return false}return true}
function adminLogin(){const f=document.getElementById("loginForm");if(!f)return;f.onsubmit=e=>{e.preventDefault();const p=f.password.value,stored=localStorage.getItem("nmwsPassword")||"nmws123";if(p===stored){localStorage.setItem("nmwsAdmin","1");location.href="admin-dashboard.html"}else toast("Incorrect password.")};const r=document.getElementById("resetForm");if(r)r.onsubmit=e=>{e.preventDefault();localStorage.setItem("nmwsPassword",r.newpass.value);toast("Password reset locally. Use the new password.");setTimeout(()=>location.reload(),900)}}
function adminDashboard(){if(!adminGuard())return;const d=data();["nNotices","nPrograms","nMembers","nMessages"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent={nNotices:d.notices.length,nPrograms:d.programs.length,nMembers:d.members.length,nMessages:d.messages.length}[id]})}
function logout(){localStorage.removeItem("nmwsAdmin");location.href="admin.html"}

// Professional notice manager
function renderNoticeAdmin(){if(!adminGuard())return;const d=data(),box=document.getElementById("noticeAdminList");if(!box)return;const a=d.notices.slice().sort((x,y)=>y.date.localeCompare(x.date));box.innerHTML=a.map(x=>`<div class="card" style="margin-bottom:14px"><div class="card-body"><div style="display:flex;justify-content:space-between;gap:15px;align-items:flex-start"><div><span class="tag">${esc(x.type)}</span><h3>${esc(x.title)}</h3><p class="muted">${fmt(x.date)}</p><p style="margin-top:6px">${esc(x.text)}</p></div><div style="white-space:nowrap"><button class="btn btn-light" onclick="loadNotice(${x.id})">Edit</button> <button class="btn btn-light" onclick="deleteNotice(${x.id})">Delete</button></div></div></div></div>`).join("")||'<p class="muted">No notices yet.</p>'}
function resetNoticeForm(){const f=document.getElementById("noticeForm");if(!f)return;f.reset();f.id.value="";f.date.value=new Date().toISOString().slice(0,10);f.type.value="General";document.getElementById("noticeFormTitle").textContent="Add Notice";document.getElementById("noticeCancel").style.display="none"}
function loadNotice(id){const x=data().notices.find(v=>v.id===id),f=document.getElementById("noticeForm");if(!x||!f)return;f.id.value=x.id;f.title.value=x.title;f.date.value=x.date;f.type.value=x.type;f.text.value=x.text;document.getElementById("noticeFormTitle").textContent="Edit Notice";document.getElementById("noticeCancel").style.display="inline-flex";window.scrollTo({top:0,behavior:"smooth"})}
function saveNoticeForm(){const f=document.getElementById("noticeForm");if(!f)return;let d=data();const id=f.id.value?Number(f.id.value):Date.now();const item={id,title:f.title.value.trim(),date:f.date.value,type:f.type.value,text:f.text.value.trim()};if(!item.title||!item.date||!item.text){toast("Please fill all notice fields.");return}const i=d.notices.findIndex(x=>x.id===id);if(i>=0)d.notices[i]=item;else d.notices.push(item);save(d);toast(i>=0?"Notice updated successfully.":"Notice added successfully.");resetNoticeForm();renderNoticeAdmin()}
function deleteNotice(id){if(!confirm("Delete this notice?"))return;let d=data();d.notices=d.notices.filter(x=>x.id!==id);save(d);toast("Notice deleted.");renderNoticeAdmin()}

// Generic simple text managers retained for programs/members dashboard tables
function renderAdminTable(type){
  if(!adminGuard())return;
  const d=data(),box=document.getElementById("adminTable");if(!box)return;

  if(type==="programs"){
    const rows=d.programs.slice().sort((a,b)=>a.date.localeCompare(b.date));
    box.innerHTML=`<div class="table-wrap"><table class="table admin-data-table"><thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Location</th><th>Actions</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td><b>${esc(x.title)}</b><div class="muted table-desc">${esc(x.desc||"")}</div></td><td>${fmt(x.date)}</td><td><span class="tag">${esc(x.status)}</span></td><td>${esc(x.location)}</td><td><div class="action-buttons"><button class="btn btn-edit" type="button" onclick="editProgram(${x.id})">✏️ Edit</button><button class="btn btn-delete" type="button" onclick="deleteProgram(${x.id})">🗑️ Delete</button></div></td></tr>`).join("")}
    </tbody></table></div>`;
    return;
  }

  if(type==="messages"){
    const rows=d.messages.slice().reverse();
    box.innerHTML=`<div class="table-wrap"><table class="table admin-data-table"><thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Actions</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.subject)}</td><td class="message-cell">${esc(x.message)}</td><td><button class="btn btn-delete" type="button" onclick="deleteMessage(${x.id})">🗑️ Delete</button></td></tr>`).join("")}
    </tbody></table></div>`;
    return;
  }

  if(type==="members"){
    const rows=d.members;
    box.innerHTML=`<div class="table-wrap"><table class="table admin-data-table"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td><div class="action-buttons"><button class="btn btn-edit" type="button" onclick="editMember(${x.id})">✏️ Edit</button><button class="btn btn-delete" type="button" onclick="deleteMember(${x.id})">🗑️ Delete</button></div></td></tr>`).join("")}
    </tbody></table></div>`;
  }
}
function editProgram(id){
  const d=data(),x=d.programs.find(v=>v.id===id);if(!x)return;
  const title=prompt("Program title:",x.title);if(title===null)return;
  const date=prompt("Date (YYYY-MM-DD):",x.date);if(date===null)return;
  const location=prompt("Location:",x.location);if(location===null)return;
  const status=prompt("Status (Upcoming/Completed):",x.status);if(status===null)return;
  const desc=prompt("Program description:",x.desc||"");if(desc===null)return;
  x.title=title.trim();x.date=date.trim();x.location=location.trim();x.status=status.trim()||"Upcoming";x.desc=desc.trim();
  save(d);toast("Program updated successfully.");renderAdminTable("programs");
}
function deleteProgram(id){
  if(!confirm("Delete this program?"))return;
  const d=data();d.programs=d.programs.filter(x=>x.id!==id);save(d);toast("Program deleted.");renderAdminTable("programs");
}
function deleteMessage(id){
  if(!confirm("Delete this public message?"))return;
  const d=data();d.messages=d.messages.filter(x=>x.id!==id);save(d);toast("Message deleted.");renderAdminTable("messages");
}
function delItem(type,id){let d=data();d[type]=d[type].filter(x=>x.id!==id);save(d);location.reload()}
function editItem(type,id){if(type==="programs"){editProgram(id);return}let d=data(),x=d[type].find(v=>v.id===id);if(!x)return;let title=prompt("Name:",x.name||"");if(title===null)return;x.name=title;save(d);location.reload()}
function addItem(type){let d=data();if(type==="programs"){let title=prompt("Program title:");if(!title)return;d.programs.push({id:Date.now(),title,date:new Date().toISOString().slice(0,10),location:"Tripura",status:"Upcoming",desc:prompt("Description:")||""})}else if(type==="members"){let name=prompt("Member name:");if(!name)return;d.members.push({id:Date.now(),name,role:prompt("Role:")||"Member",phone:prompt("Phone:")||"",email:prompt("Email:")||"",photo:"assets/nmws-logo.png",bio:""})}save(d);location.reload()}

// Contact editor
function renderContactAdmin(){if(!adminGuard())return;const d=data(),box=document.getElementById("contactAdminList");if(!box)return;box.innerHTML=d.contacts.map(x=>`<div class="info-row" style="display:flex;justify-content:space-between;gap:15px;align-items:center"><div><b>${esc(x.label)}</b><div class="muted">${esc(x.value)}</div></div><div><button class="btn btn-light" onclick="editContact(${x.id})">Edit</button><button class="btn btn-light" onclick="deleteContact(${x.id})">Delete</button></div></div>`).join("")||'<p class="muted">No contact details yet.</p>'}
function addContact(){let d=data(),label=prompt("Contact label:");if(!label)return;let value=prompt("Contact value:");if(value===null)return;d.contacts.push({id:Date.now(),label,value});save(d);location.reload()}
function editContact(id){let d=data(),x=d.contacts.find(v=>v.id===id);if(!x)return;let label=prompt("Contact label:",x.label);if(label===null)return;let value=prompt("Contact value:",x.value);if(value===null)return;x.label=label;x.value=value;save(d);location.reload()}
function deleteContact(id){if(!confirm("Delete this contact detail?"))return;let d=data();d.contacts=d.contacts.filter(x=>x.id!==id);save(d);location.reload()}

// Developer editor with Cloudinary-backed image upload
async function renderDeveloperAdmin(){if(!adminGuard())return;const d=data(),x=d.developer||{};const n=document.getElementById("devCompanyName"),p=document.getElementById("devPersonTitle"),t=document.getElementById("devDescription"),pr=document.getElementById("developerPreview");if(n)n.value=x.name||"";if(p)p.value=x.person||"";if(t)t.value=x.description||"";if(pr)await setImageSource(pr,x.image||"assets/nmws-logo.png")}
async function saveDeveloper(){if(!adminGuard())return;const n=document.getElementById("devCompanyName"),p=document.getElementById("devPersonTitle"),t=document.getElementById("devDescription"),file=document.getElementById("devImage")?.files?.[0];if(!n||!p||!t)return;const d=data();d.developer=d.developer||{};d.developer.name=n.value.trim();d.developer.person=p.value.trim();d.developer.description=t.value.trim();if(!d.developer.name||!d.developer.person||!d.developer.description){toast("Please fill all developer fields.");return}try{if(file){if(!file.type.startsWith("image/")){toast("Please select an image file.");return}if(file.size>8*1024*1024){toast("Developer image must be under 8 MB.");return}const old=d.developer.image;d.developer.image=await mediaPut(file);if(old&&old.startsWith("idb:"))await mediaDelete(old)}save(d);toast("Developer information saved successfully.");setTimeout(()=>location.href="developer.html?updated="+Date.now(),700)}catch(e){console.error(e);toast("Could not save the developer image. Please try again.")}}
function previewDeveloperImage(input){const p=document.getElementById("developerPreview");const f=input.files?.[0];if(p&&f)p.src=URL.createObjectURL(f)}

// Album media upload with multi-select, Cloudinary, category + event
async function addAlbumItem(){if(!adminGuard())return;const f=document.getElementById("albumForm"),files=[...(f?.files?.files||[])];if(!files.length){toast("Select one or more photos/videos first.");return}if(files.length>30){toast("Maximum 30 files per upload.");return}const bad=files.find(file=>!(file.type.startsWith("image/")||file.type.startsWith("video/"))||file.size>8*1024*1024);if(bad){toast("Each selected file must be an image/video under 8 MB.");return}const cat=f.category.value.trim()||"General",eventName=f.eventName.value.trim()||"NMWS Program",description=f.description.value.trim();const btn=f.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Uploading..."}try{let d=data();d.album=d.album||[];for(let i=0;i<files.length;i++){const file=files[i],ref=await mediaPut(file);d.album.push({id:Date.now()+i+Math.floor(Math.random()*1000000),type:file.type.startsWith("video/")?"video":"image",src:ref,title:file.name,description,category:cat,eventName})}save(d);toast(files.length+" media item"+(files.length===1?"":"s")+" uploaded successfully.");f.reset();if(btn){btn.disabled=false;btn.textContent="Upload to Album"}renderAlbumAdmin()}catch(e){console.error(e);toast("Upload failed. Please try smaller files.");if(btn){btn.disabled=false;btn.textContent="Upload to Album"}}}
async function renderAlbumAdmin(){if(!adminGuard())return;const d=data(),box=document.getElementById("albumAdminGrid");if(!box)return;const items=d.album||[];const groups={};items.forEach(x=>{const key=(x.category||"General")+"|||"+(x.eventName||"NMWS Program");(groups[key] ||= []).push(x)});box.innerHTML=Object.entries(groups).map(([key,arr])=>{const [cat,eventName]=key.split("|||");return `<div class="album-admin-group" style="grid-column:1/-1"><div class="card-body" style="padding:8px 0"><span class="tag">${esc(cat)}</span><h2>${esc(eventName)}</h2></div><div class="grid">${arr.map(x=>`<div class="card"><div style="aspect-ratio:4/3;background:#eee;overflow:hidden">${x.type==="video"?`<video data-media="${esc(x.src)}" controls style="width:100%;height:100%;object-fit:cover"></video>`:`<img data-media="${esc(x.src)}" style="width:100%;height:100%;object-fit:cover">`}</div><div class="card-body"><h3>${esc(x.title||eventName)}</h3><p class="muted">${esc(x.description||"")}</p><button class="btn btn-light" onclick="deleteAlbumItem(${x.id})">Delete</button></div></div>`).join("")}</div></div>`}).join("")||'<p class="muted">Album is empty.</p>';for(const el of box.querySelectorAll("[data-media]")){if(el.tagName==="VIDEO")await setVideoSource(el,el.dataset.media);else await setImageSource(el,el.dataset.media)}}
async function deleteAlbumItem(id){if(!confirm("Delete this album item?"))return;let d=data(),x=d.album.find(v=>v.id===id);d.album=d.album.filter(v=>v.id!==id);save(d);if(x)await mediaDelete(x.src);renderAlbumAdmin()}

// Home slider media upload
async function addSlider(){if(!adminGuard())return;const f=document.getElementById("sliderForm"),files=[...(f?.file?.files||[])];if(!files.length){toast("Select one or more slider photos.");return}if(files.length>20){toast("Maximum 20 photos at a time.");return}const bad=files.find(file=>!file.type.startsWith("image/")||file.size>8*1024*1024);if(bad){toast("Each slider photo must be an image under 8 MB.");return}const btn=f.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Uploading..."}try{let d=data();d.slider=d.slider||[];for(let i=0;i<files.length;i++){const file=files[i],ref=await mediaPut(file);d.slider.push({id:Date.now()+i+Math.floor(Math.random()*100000),src:ref,title:f.title.value.trim()||"NEW MALANCHA WELFARE SOCIETY",subtitle:f.subtitle.value.trim()||"TOGETHER WE CARE, TOGETHER WE GROW"})}save(d);toast(files.length+" slider photo"+(files.length===1?"":"s")+" added successfully.");f.reset();if(btn){btn.disabled=false;btn.textContent="Add Photos to Slider"}renderSliderAdmin()}catch(e){console.error(e);toast("Slider upload failed. Please try a smaller image.");if(btn){btn.disabled=false;btn.textContent="Add Photos to Slider"}}}
async function renderSliderAdmin(){if(!adminGuard())return;const d=data(),box=document.getElementById("sliderAdminList");if(!box)return;box.innerHTML=(d.slider||[]).map((x,i)=>`<div class="card"><div class="slider-admin-img"><img data-media="${esc(x.src)}"></div><div class="card-body"><span class="tag">Slide ${i+1}</span><h3>${esc(x.title||"")}</h3><p class="muted">${esc(x.subtitle||"")}</p><button class="btn btn-light" onclick="editSlider(${x.id})">Edit Text</button> <button class="btn btn-light" onclick="changeSliderImage(${x.id})">Change Photo</button> <button class="btn btn-light" onclick="deleteSlider(${x.id})">Delete</button></div></div>`).join("")||'<p class="muted">No slider photos yet.</p>';for(const img of box.querySelectorAll("img[data-media]"))await setImageSource(img,img.dataset.media)}
function editSlider(id){let d=data(),x=d.slider.find(v=>v.id===id);if(!x)return;let title=prompt("Slide title:",x.title||"");if(title===null)return;let subtitle=prompt("Slide subtitle:",x.subtitle||"");if(subtitle===null)return;x.title=title;x.subtitle=subtitle;save(d);renderSliderAdmin()}
async function changeSliderImage(id){const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){toast("Please select an image.");return}if(file.size>8*1024*1024){toast("Please use an image under 8 MB.");return}try{let d=data(),x=d.slider.find(v=>v.id===id);if(!x)return;const old=x.src;x.src=await mediaPut(file);save(d);if(old&&old.startsWith("idb:"))await mediaDelete(old);toast("Slider photo changed.");renderSliderAdmin()}catch(e){console.error(e);toast("Could not change the slider photo.")}};input.click()}
async function deleteSlider(id){if(!confirm("Delete this slider photo?"))return;let d=data(),x=d.slider.find(v=>v.id===id);d.slider=d.slider.filter(v=>v.id!==id);save(d);if(x)await mediaDelete(x.src);renderSliderAdmin()}

// Members admin with image upload
async function renderMembersAdmin(){if(!adminGuard())return;const d=data(),box=document.getElementById("memberAdminList");if(!box)return;box.innerHTML=d.members.map(x=>`<div class="card"><div class="card-body" style="display:flex;gap:16px;align-items:center"><img data-media="${esc(x.photo||"assets/nmws-logo.png")}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:3px solid #fff0c7"><div style="flex:1"><h3>${esc(x.name)}</h3><p class="role">${esc(x.role)}</p><p class="muted">${esc(x.phone)} • ${esc(x.email)}</p></div><div><button class="btn btn-light" onclick="editMember(${x.id})">Edit</button><button class="btn btn-light" onclick="deleteMember(${x.id})">Delete</button></div></div></div>`).join("")||'<p class="muted">No members yet.</p>';for(const img of box.querySelectorAll("img[data-media]"))await setImageSource(img,img.dataset.media)}
function openMemberEditor(id){const d=data(),x=id?d.members.find(v=>v.id===id):null,f=document.getElementById("memberForm");if(!f)return;f.reset();f.id.value=x?x.id:"";f.name.value=x?.name||"";f.role.value=x?.role||"Member";f.phone.value=x?.phone||"";f.email.value=x?.email||"";f.bio.value=x?.bio||"";f.dataset.currentPhoto=x?.photo||"assets/nmws-logo.png";document.getElementById("memberFormTitle").textContent=x?"Edit Member":"Add Member";document.getElementById("memberCancel").style.display=x?"inline-flex":"none";window.scrollTo({top:0,behavior:"smooth"})}
async function saveMemberForm(){const f=document.getElementById("memberForm");if(!f)return;const d=data();const id=f.id.value?Number(f.id.value):Date.now();const item={id,name:f.name.value.trim(),role:f.role.value.trim()||"Member",phone:f.phone.value.trim(),email:f.email.value.trim(),bio:f.bio.value.trim(),photo:f.dataset.currentPhoto||"assets/nmws-logo.png"};if(!item.name){toast("Member name is required.");return}try{const file=f.photo.files?.[0];if(file){if(!file.type.startsWith("image/")){toast("Please select a member image.");return}if(file.size>8*1024*1024){toast("Member image must be under 8 MB.");return}const old=item.photo;item.photo=await mediaPut(file);if(old&&old.startsWith("idb:"))await mediaDelete(old)}const i=d.members.findIndex(v=>v.id===id);if(i>=0)d.members[i]=item;else d.members.push(item);save(d);toast(i>=0?"Member updated.":"Member added.");resetMemberForm();renderMembersAdmin()}catch(e){console.error(e);toast("Could not save member image.")}}
function resetMemberForm(){const f=document.getElementById("memberForm");if(!f)return;f.reset();f.id.value="";f.dataset.currentPhoto="assets/nmws-logo.png";document.getElementById("memberFormTitle").textContent="Add Member";document.getElementById("memberCancel").style.display="none"}
function editMember(id){openMemberEditor(id)}
async function deleteMember(id){if(!confirm("Delete this member?"))return;let d=data(),x=d.members.find(v=>v.id===id);d.members=d.members.filter(v=>v.id!==id);save(d);if(x)await mediaDelete(x.photo);renderMembersAdmin()}

window.addEventListener("DOMContentLoaded",()=>{startFirebaseSync();});
