// Ħżuż tal-Bini – app layer: tiers, Google Play purchases, ads, screenshot block, native file saving.
(function(){
"use strict";
window.HZ_APP=true;

// ===== SETTINGS TO CHANGE BEFORE RELEASE =====
const ADS_TEST=true;                                          // false when the real AdMob IDs below are filled in
const AD_BANNER_ID="ca-app-pub-3940256099942544/6300978111";  // Google's test banner – replace with your AdMob banner ID
// Product IDs – create these with the same IDs in Play Console → Monetise
const PRODUCTS={
  full_lifetime:"Full – darba waħda (€200)",
  pro_lifetime:"Pro – darba waħda (€300)",
  pro_upgrade_lifetime:"Pro – upgrade minn Full (€100)"
};
// subscriptions, each with one base plan billed every 4 months
const SUBS={sub_full:"Full – kull 4 xhur (€25)",sub_pro:"Pro – kull 4 xhur (€35)"};
const DEFAULT_PRICE={full_lifetime:"€200",pro_lifetime:"€300",pro_upgrade_lifetime:"€100",sub_full:"€25",sub_pro:"€35"};
// =============================================

const FREE_ARCH=["arkipjan","kumpass"];
const RANK={free:0,full:1,pro:2};
let storeEnt="free",ent="free";
try{storeEnt=localStorage.getItem("hzEnt")||"free";}catch(e){}
// test codes (5-day codes from the code generator) unlock Pro until they expire
function testInfo(){try{const c=localStorage.getItem("hzTest");if(!c||typeof checkCode!=="function")return null;const e=checkCode(c);return e!==null&&dayNum(Date.now())<=e?e:null;}catch(x){return null;}}
const best=()=>{const t=testInfo();return t!==null&&RANK[storeEnt]<2?"pro":storeEnt;};
ent=storeEnt;
window.HZ_ALLOW=f=>{
  if(f.startsWith("arch:"))return RANK[ent]>=1||FREE_ARCH.includes(f.slice(5));
  if(f==="pdf")return RANK[ent]>=1;
  if(f==="stairs"||f==="dxf")return RANK[ent]>=2;
  return true;
};
const PL=()=>(window.Capacitor&&window.Capacitor.Plugins)||{};
const isNative=()=>!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const $=id=>document.getElementById(id);

// ---- save PDF/DXF on the phone: ask "save" or "share"
function askSaveOrShare(filename){
  return new Promise(res=>{
    const d=document.createElement("div");d.id="hzSave";
    d.innerHTML=`<div class="hzbox" role="dialog" aria-modal="true" aria-labelledby="hzSaveT" style="gap:10px">
      <h2 id="hzSaveT" style="font-size:1.15rem">${filename}</h2>
      <button type="button" data-a="save">Salva fil-mowbajl (Documents › Hzuz tal-Bini)</button>
      <button type="button" class="hzalt" data-a="share">Ibgħat / Aqsam (WhatsApp, email, Drive…)</button>
      <button type="button" class="hzalt" data-a="">Ikkanċella</button></div>`;
    d.style.cssText="position:fixed;inset:0;z-index:31;background:rgba(10,16,18,.55);display:flex;align-items:flex-end;justify-content:center";
    d.addEventListener("click",e=>{const b=e.target.closest("button");if(b||e.target===d){d.remove();res(b?b.dataset.a:"");}});
    document.body.appendChild(d);
  });
}
window.HZ_SAVE={save:async({filename,data})=>{
  const {Filesystem,Share}=PL();
  if(!Filesystem||!Share)throw new Error("Ma setax jissejvja l-fajl.");
  const how=await askSaveOrShare(filename);
  if(!how){const e=new Error("");e.code="declined";throw e;}
  const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(data);});
  if(how==="share"){
    const w=await Filesystem.writeFile({path:filename,data:b64,directory:"CACHE"});
    await Share.share({title:filename,files:[w.uri],dialogTitle:"Ibgħat "+filename});
    return {status:"saved"};
  }
  try{const st=await Filesystem.checkPermissions();if(st.publicStorage!=="granted")await Filesystem.requestPermissions();}catch(e){}
  let name=filename;
  try{const ls=await Filesystem.readdir({path:"Hzuz tal-Bini",directory:"DOCUMENTS"});const have=new Set(ls.files.map(f=>f.name||f));
    if(have.has(name)){const dot=name.lastIndexOf(".");let k=2;while(have.has(name.slice(0,dot)+" ("+k+")"+name.slice(dot)))k++;name=name.slice(0,dot)+" ("+k+")"+name.slice(dot);}}catch(e){}
  await Filesystem.writeFile({path:"Hzuz tal-Bini/"+name,data:b64,directory:"DOCUMENTS",recursive:true});
  window.HZ_LAST_SAVED="Salvat f'Documents › Hzuz tal-Bini › "+name;
  return {status:"saved"};
}};

// ---- paywall UI
const css=document.createElement("style");
css.textContent=`
#hzPay{position:fixed;inset:0;z-index:30;background:rgba(10,16,18,.55);display:flex;align-items:flex-end;justify-content:center;padding:env(safe-area-inset-top,0px) 0 0}
#hzPay[hidden]{display:none}
.hzbox{background:var(--panel);color:var(--ink);width:100%;max-width:640px;max-height:92vh;overflow:auto;border-radius:12px 12px 0 0;padding:18px max(16px,env(safe-area-inset-left,0px)) calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;box-sizing:border-box}
.hzbox h2{margin:0;font-size:1.3rem;text-transform:none;letter-spacing:0}
.hzcards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.hzcard{border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
.hzcard.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
.hzcard h3{margin:0;font-size:1.15rem}
.hzcard ul{margin:0;padding-left:18px;color:var(--muted);font-size:.92rem}
.hzbuy{width:100%;text-align:left;display:flex;justify-content:space-between;gap:8px}
.hzbuy small{font-weight:400;opacity:.85}
.hzalt{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.hzrow{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
#hzAcct{background:transparent;color:var(--accent);border:1px solid var(--accent);padding:8px 14px}
#hzBadge{font-size:.8rem;color:var(--muted)}
body.hzads .wrap{padding-bottom:calc(80px + env(safe-area-inset-bottom,0px))}
`;
document.head.appendChild(css);
const box=document.createElement("div");box.id="hzPay";box.hidden=true;
box.innerHTML=`<div class="hzbox" role="dialog" aria-modal="true" aria-labelledby="hzT">
  <h2 id="hzT">Ħżuż tal-Bini – verżjoni sħiħa</h2>
  <p class="note" id="hzWhy" style="margin:0"></p>
  <div class="hzcards">
    <section class="hzcard" id="hzCardFull"><h3>Full</h3>
      <ul><li>Il-ħnejjiet kollha (11-il tip)</li><li>Mollijiet PDF 1:1</li><li>Bla reklami</li></ul>
      <button type="button" class="hzbuy hzalt" data-buy="full_month"><span>Kull 4 xhur</span><b data-p="full_month">€25</b></button>
      <button type="button" class="hzbuy" data-buy="full_once"><span>Darba waħda</span><b data-p="full_once">€200</b></button>
    </section>
    <section class="hzcard" id="hzCardPro"><h3>Pro</h3>
      <ul><li>Kollox li hemm f'Full</li><li>It-turġien kollha (5 tipi)</li><li>Fajls DXF għall-CAD u s-CNC</li></ul>
      <button type="button" class="hzbuy hzalt" data-buy="pro_month"><span>Kull 4 xhur</span><b data-p="pro_month">€35</b></button>
      <button type="button" class="hzbuy" data-buy="pro_once"><span>Darba waħda</span><b data-p="pro_once">€300</b></button>
    </section>
  </div>
  <p class="note" style="margin:0">"Kull 4 xhur": abbonament li jiġġedded waħdu kull 4 xhur. Tista' twaqqfu meta trid minn Google Play → Abbonamenti, u l-app terġa' ssir b'xejn. Min għandu Full u jgħaddi għal Pro iħallas biss id-differenza.</p>
  <div class="hzrow" style="justify-content:flex-start"><label for="hzCode" style="flex:1;min-width:150px">Kodiċi tat-test<input id="hzCode" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX"></label><button type="button" class="hzalt" id="hzCodeBtn" style="align-self:flex-end">Daħħal</button></div>
  <p class="note" id="hzMsg" style="margin:0;font-weight:600"></p>
  <div class="hzrow"><button type="button" class="hzalt" id="hzRestore">Irrestawra x-xiri</button><button type="button" id="hzClose">Agħlaq</button></div>
</div>`;
document.body.appendChild(box);
const msg=t=>{$("hzMsg").textContent=t||"";};
window.HZ_PAYWALL=why=>{
  $("hzWhy").textContent=why==="pro"?"It-turġien u l-fajls DXF huma fil-verżjoni Pro.":why==="full"?"Din il-ħaġa hija fil-verżjoni Full jew Pro. Il-verżjoni b'xejn fiha l-arkipjan u l-ħnejja kumpass.":"Agħżel verżjoni.";
  msg("");updatePaywall();box.hidden=false;
};
$("hzClose").addEventListener("click",()=>box.hidden=true);
box.addEventListener("click",e=>{if(e.target===box)box.hidden=true;});

// account button in the top bar
const top=document.querySelector(".topbar");
if(top){const w=document.createElement("div");w.className="hzrow";w.style.gap="8px";
  w.innerHTML='<span id="hzBadge"></span><button type="button" id="hzAcct">Ix-xiri</button>';top.appendChild(w);
  $("hzAcct").addEventListener("click",()=>window.HZ_PAYWALL(""));}

// ---- applying the tier: labels, ads, screenshot block
let adsOn=false,adsInit=false;
async function ads(show){
  const {AdMob}=PL();if(!AdMob||!isNative())return;
  try{
    if(show&&!adsOn){
      if(!adsInit){await AdMob.initialize({initializeForTesting:ADS_TEST});adsInit=true;
        try{const ci=await AdMob.requestConsentInfo();if(ci.isConsentFormAvailable&&ci.status==="REQUIRED")await AdMob.showConsentForm();}catch(e){}}
      await AdMob.showBanner({adId:AD_BANNER_ID,adSize:"ADAPTIVE_BANNER",position:"BOTTOM_CENTER",margin:0,isTesting:ADS_TEST});adsOn=true;
    }else if(!show&&adsOn){await AdMob.removeBanner();adsOn=false;}
  }catch(e){}
  document.body.classList.toggle("hzads",show);
}
function applyTier(){
  document.querySelectorAll("#type option").forEach(o=>{o.dataset.t=o.dataset.t||o.textContent;o.textContent=o.dataset.t+(window.HZ_ALLOW("arch:"+o.value)?"":"  · Full");});
  const ms=$("mStair");if(ms)ms.textContent=RANK[ent]>=2?"Taraġ":"Taraġ · Pro";
  const ti=testInfo(),bd=$("hzBadge");
  if(bd)bd.textContent=ti!==null&&RANK[storeEnt]<2?"Pro (test sal-"+dayStr(ti)+")":ent==="pro"?"Pro":ent==="full"?"Full":"B'xejn";
  const {PrivacyScreen}=PL();
  if(PrivacyScreen&&isNative()){(ent==="free"?PrivacyScreen.enable():PrivacyScreen.disable()).catch(()=>{});}
  ads(ent==="free");
}
function setEnt(e){
  storeEnt=e;try{localStorage.setItem("hzEnt",e);}catch(x){}
  const nb=best(),changed=nb!==ent;ent=nb;
  applyTier();
  if(changed&&window.HZ_REFRESH)window.HZ_REFRESH();
}

// ---- Google Play billing (cordova-plugin-purchase)
let store=null,ready=false;
const own=id=>{if(!store)return false;const p=store.get(id,CdvPurchase.Platform.GOOGLE_PLAY);return !!(p&&p.owned);};
function compute(){
  const pro=own("pro_lifetime")||(own("full_lifetime")&&own("pro_upgrade_lifetime"))||own("sub_pro");
  const full=pro||own("full_lifetime")||own("sub_full");
  return pro?"pro":full?"full":"free";
}
const price=id=>{try{const p=store&&store.get(id,CdvPurchase.Platform.GOOGLE_PLAY),o=p&&p.getOffer(),ph=o&&o.pricingPhases&&o.pricingPhases[0];return (ph&&ph.price)||DEFAULT_PRICE[id];}catch(e){return DEFAULT_PRICE[id];}};
function updatePaywall(){
  const fullL=own("full_lifetime"),subF=own("sub_full");
  $("hzCardFull").classList.toggle("on",ent==="full");$("hzCardPro").classList.toggle("on",ent==="pro");
  const set=(k,t,dis)=>{const b=document.querySelector(`[data-buy="${k}"]`);b.querySelector("b").textContent=t;b.disabled=!!dis;};
  const have=RANK[ent];
  set("full_once",have>=1?"Għandek":price("full_lifetime"),have>=1);
  set("full_month",have>=1?"Għandek":price("sub_full"),have>=1);
  set("pro_once",have>=2?"Għandek":fullL?price("pro_upgrade_lifetime")+" (upgrade)":price("pro_lifetime"),have>=2);
  set("pro_month",have>=2?"Għandek":price("sub_pro")+(subF?" (upgrade)":""),have>=2||(fullL&&!subF));
}
async function order(id,extra){
  const p=store&&store.get(id,CdvPurchase.Platform.GOOGLE_PLAY),o=p&&p.getOffer();
  if(!o){msg("Il-prodott mhux disponibbli bħalissa. Iċċekkja l-internet u erġa' pprova.");return;}
  const err=await o.order(extra);
  if(err&&err.code!==CdvPurchase.ErrorCode.PAYMENT_CANCELLED)msg("Ix-xiri ma sarx: "+(err.message||err.code));
}
document.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",async()=>{
  if(!ready){msg(isNative()?"Il-ħanut għadu qed jitgħabba. Erġa' pprova f'mument.":"Ix-xiri jaħdem biss fl-app minn Google Play.");return;}
  msg("");const k=b.dataset.buy;
  if(k==="full_once")return order("full_lifetime");
  if(k==="pro_once")return order(own("full_lifetime")?"pro_upgrade_lifetime":"pro_lifetime");
  if(k==="full_month")return order("sub_full");
  if(k==="pro_month"){
    // Full subscriber moving to Pro: Google swaps the plan and charges only the difference
    let extra;try{const tok=store.findInLocalReceipts&&store.findInLocalReceipts(store.get("sub_full",CdvPurchase.Platform.GOOGLE_PLAY));
      const t=tok&&tok.transaction&&tok.transaction.purchaseToken;
      if(own("sub_full")&&t)extra={googlePlay:{oldPurchaseToken:t,prorationMode:CdvPurchase.GooglePlay.ProrationMode.IMMEDIATE_AND_CHARGE_PRORATED_PRICE}};}catch(e){}
    return order("sub_pro",extra);}
}));
$("hzCodeBtn").addEventListener("click",()=>{
  const c=$("hzCode").value.trim();
  if(typeof checkCode!=="function"){msg("Erġa' pprova f'mument.");return;}
  const e=checkCode(c);
  if(e===null){msg("Dan il-kodiċi mhux validu. Iċċekkja li kitbitu sew.");return;}
  if(dayNum(Date.now())>e){msg("Dan il-kodiċi skada fil-"+dayStr(e)+".");return;}
  try{localStorage.setItem("hzTest",c);}catch(x){}
  setEnt(storeEnt);updatePaywall();msg("Kodiċi aċċettat: għandek Pro sal-"+dayStr(e)+".");
});
$("hzRestore").addEventListener("click",async()=>{
  if(!ready){msg("Ix-xiri jaħdem biss fl-app minn Google Play.");return;}
  msg("Qed infittex ix-xiri tiegħek…");
  try{await store.restorePurchases();}catch(e){}
  setEnt(compute());updatePaywall();msg(ent==="free"?"Ma nstab l-ebda xiri fuq dan il-kont ta' Google.":"Ix-xiri ġie rrestawrat: "+(ent==="pro"?"Pro":"Full")+".");
});

function initStore(){
  if(!window.CdvPurchase||!isNative())return;
  const {ProductType,Platform}=CdvPurchase;
  store=CdvPurchase.store;
  store.verbosity=CdvPurchase.LogLevel.WARNING;
  store.register(Object.keys(PRODUCTS).map(id=>({id,type:ProductType.NON_CONSUMABLE,platform:Platform.GOOGLE_PLAY}))
    .concat(Object.keys(SUBS).map(id=>({id,type:ProductType.PAID_SUBSCRIPTION,platform:Platform.GOOGLE_PLAY}))));
  store.when()
    .approved(t=>t.finish())
    .finished(t=>{
      setEnt(compute());updatePaywall();
      if(ent!=="free")msg("Grazzi! Issa għandek "+(ent==="pro"?"Pro":"Full")+".");
    })
    .productUpdated(()=>{if(ready){updatePaywall();}})
    .receiptUpdated(()=>{if(ready)setEnt(compute());});
  store.initialize([Platform.GOOGLE_PLAY]).then(()=>{ready=true;setEnt(compute());updatePaywall();});
}
applyTier();
window.addEventListener("load",()=>setEnt(storeEnt));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setEnt(storeEnt);});
document.addEventListener("deviceready",initStore,false);
})();
// open outside links (WhatsApp, email) in the phone's own apps
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest('a[target="_blank"]');if(a&&window.HZ_APP){e.preventDefault();window.location.href=a.href;}});
