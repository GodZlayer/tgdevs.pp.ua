const DESIGN_W=1440;
const DESIGN_H=900;
const SCROLL_DISTANCE=9600;
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const mix=(p,a,b)=>smooth(clamp((p-a)/(b-a)));

const designSpace=document.getElementById("designSpace");
const brandStage=document.getElementById("brandStage");
const logoBuild=document.getElementById("logoBuild");
const gearWindow=document.querySelector(".gear-window");
const brandWord=document.getElementById("brandWord");
const logoProgress=document.getElementById("logoProgress");
const wipe=document.getElementById("brandWipe");
const phrases=[...document.querySelectorAll("[data-phrase]")];
const frame=document.getElementById("frame");
const worldObject=document.getElementById("worldObject");
const grid=document.querySelector(".space-grid");
const layers={
  tgbc:document.querySelector(".tgbc-layer"),
  desk:document.querySelector(".desk-layer"),
  browser:document.querySelector(".browser-layer"),
  demos:document.querySelector(".demos-layer")
};
const copies={
  tgbc:document.querySelector(".tgbc-copy"),
  desk:document.querySelector(".tgdesk-copy"),
  partner:document.querySelector(".partner-copy"),
  demos:document.querySelector(".demos-copy")
};
const frames=[...document.querySelectorAll(".browser-pages iframe")];
const partnerName=document.getElementById("partnerName");
const partnerIndex=document.getElementById("partnerIndex");
const browserAddress=document.getElementById("browserAddress");
const browserOpen=document.getElementById("browserOpen");
const circumference=2*Math.PI*52;
const partnerUrls=[
  "https://invoga.tgdevs.pp.ua/",
  "https://jvl.tgdevs.pp.ua/",
  "https://maxine.pp.ua/",
  "https://endodontia.pp.ua/",
  "https://profissionalcapilar.tgdevs.pp.ua/",
  "https://cosmedamiaofestas.com.br/"
];

logoProgress.style.strokeDasharray=String(circumference);

function setSceneScale(){
  const scale=Math.min(innerWidth/DESIGN_W,innerHeight/DESIGN_H);
  document.documentElement.style.setProperty("--scene-scale",String(scale));
}
function setOpacity(el,v){if(el)el.style.opacity=String(clamp(v))}
function setCopy(el,v,x=0,y=0,ry=0){
  if(!el)return;
  el.style.opacity=String(clamp(v));
  el.style.transform=`translate3d(${x}px,${y}px,0) rotateY(${ry}deg)`;
}
function phraseOpacity(p,start,end){
  const fade=.006;
  return Math.min(mix(p,start,start+fade),1-mix(p,end-fade,end));
}
function blendOpacity(p,start,hold,end){
  return Math.min(mix(p,start,hold),1-mix(p,hold,end));
}

let ticking=false;
function render(){
  ticking=false;
  const p=clamp(scrollY/SCROLL_DISTANCE);

  /* SCENE 01 — same timing and geometry on every device */
  const build=mix(p,.005,.145);
  const complete=mix(p,.115,.16);
  const navMove=mix(p,.145,.205);
  const word=mix(p,.035,.14);

  logoProgress.style.strokeDashoffset=String(circumference*(1-build));
  logoBuild.style.transform=`rotate(${lerp(0,760,build)}deg)`;
  gearWindow.style.inset=`${lerp(18,0,complete)}px`;
  gearWindow.querySelector("img").style.transform=`scale(${lerp(1.42,1,complete)})`;
  logoProgress.style.opacity=String(1-complete*.92);

  brandWord.style.opacity=String(word);
  brandWord.style.transform=`translateX(${lerp(-46,0,word)}px)`;
  brandWord.style.clipPath=`inset(0 ${lerp(100,0,word)}% 0 0)`;

  const stageWidth=330;
  const targetScale=.50;
  const targetX=-DESIGN_W/2+22+(stageWidth*targetScale)/2;
  const targetY=-DESIGN_H/2+36;
  brandStage.style.transform=`translate(-50%,-50%) translate3d(${lerp(0,targetX,navMove)}px,${lerp(0,targetY,navMove)}px,0) scale(${lerp(1,targetScale,navMove)})`;

  const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.155]];
  phrases.forEach((el,i)=>{
    const op=phraseOpacity(p,ranges[i][0],ranges[i][1]);
    el.style.opacity=String(op);
    el.style.transform=`translateY(${lerp(16,0,op)}px)`;
  });
  document.querySelector(".intro-copy").style.opacity=String(1-mix(p,.145,.19));

  const wipeIn=mix(p,.185,.225);
  const wipeOut=mix(p,.225,.255);
  wipe.style.transform=`scaleX(${wipeIn})`;
  wipe.style.opacity=String(1-wipeOut);

  /* existing later scenes — fixed to the same 1440x900 coordinate system */
  const q=clamp((p-.235)/.765);
  const revealWorld=mix(p,.235,.265);
  frame.style.opacity=String(revealWorld);

  const tgbc=blendOpacity(q,.00,.09,.27);
  const desk=blendOpacity(q,.23,.36,.50);
  const partners=blendOpacity(q,.46,.63,.82);
  const demos=blendOpacity(q,.78,.90,1);

  setCopy(copies.tgbc,tgbc,lerp(-35,0,tgbc),0,lerp(-8,0,tgbc));
  setCopy(copies.desk,desk,lerp(35,0,desk),0,lerp(8,0,desk));
  setCopy(copies.partner,partners,lerp(-35,0,partners),0,0);
  setCopy(copies.demos,demos,lerp(-35,0,demos),0,0);

  let fw=360,fh=360,fr=180,fx=DESIGN_W*.18,fy=0,ry=12;
  if(q<.27){
    const t=mix(q,.02,.27);
    fw=lerp(360,390,t);fh=lerp(360,390,t);fr=lerp(180,195,t);fx=DESIGN_W*.18;ry=lerp(12,7,t);
  }else if(q<.50){
    const t=mix(q,.27,.50);
    fw=lerp(390,720,t);fh=lerp(390,430,t);fr=lerp(195,28,t);fx=lerp(DESIGN_W*.18,-DESIGN_W*.17,t);ry=lerp(7,-9,t);
  }else if(q<.82){
    const t=mix(q,.50,.62);
    fw=lerp(720,1120,t);fh=lerp(430,648,t);fr=lerp(28,22,t);fx=lerp(-DESIGN_W*.17,DESIGN_W*.11,t);ry=lerp(-9,4,t);
  }else{
    const t=mix(q,.82,.94);
    fw=lerp(1120,1240,t);fh=lerp(648,666,t);fr=lerp(22,18,t);fx=DESIGN_W*.10;ry=lerp(4,-3,t);
  }

  frame.style.width=`${fw}px`;
  frame.style.height=`${fh}px`;
  frame.style.borderRadius=`${fr}px`;
  worldObject.style.transform=`translate3d(${fx}px,${fy}px,0) rotateY(${ry}deg)`;

  const tgbcIn=mix(q,.00,.09),tgbcOut=1-mix(q,.23,.31);
  const deskIn=mix(q,.24,.34),deskOut=1-mix(q,.46,.54);
  const browserIn=mix(q,.47,.58),browserOut=1-mix(q,.79,.86);
  const demosIn=mix(q,.80,.90);
  setOpacity(layers.tgbc,Math.min(tgbcIn,tgbcOut));
  setOpacity(layers.desk,Math.min(deskIn,deskOut));
  setOpacity(layers.browser,Math.min(browserIn,browserOut));
  setOpacity(layers.demos,demosIn);

  grid.style.transform=`perspective(1200px) rotateX(${lerp(63,50,p)}deg) rotateZ(${lerp(0,-7,p)}deg) translateY(${lerp(27,11,p)}%) scale(${lerp(1.35,1.08,p)})`;
  grid.style.opacity=String(lerp(.13,.30,p));

  if(q>=.50&&q<.86){
    const local=clamp((q-.52)/.30);
    const raw=local*frames.length;
    const idx=Math.min(frames.length-1,Math.floor(raw));
    const frac=raw-idx;
    frames.forEach((f,i)=>{
      let op=0;
      if(i===idx)op=1-clamp((frac-.58)/.42);
      if(i===idx+1)op=clamp((frac-.38)/.42);
      if(idx===frames.length-1&&i===idx)op=1;
      f.style.opacity=String(op);
    });
    const url=partnerUrls[idx];
    partnerName.textContent=frames[idx]?.dataset.partner||"";
    partnerIndex.textContent=`${String(idx+1).padStart(2,"0")} / 06`;
    browserAddress.textContent=url.replace("https://","").replace(/\/$/,"");
    browserOpen.href=url;
  }
}
function request(){if(!ticking){ticking=true;requestAnimationFrame(render)}}

setSceneScale();
render();
addEventListener("scroll",request,{passive:true});
addEventListener("resize",()=>{setSceneScale();request()});
