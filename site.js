const LANDSCAPE={w:1440,h:900};
const PORTRAIT={w:900,h:1440};
const SCROLL_DISTANCE=9600;

let DESIGN_W=LANDSCAPE.w;
let DESIGN_H=LANDSCAPE.h;

const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const mix=(p,a,b)=>smooth(clamp((p-a)/(b-a)));
const blendOpacity=(p,start,hold,end)=>Math.min(mix(p,start,hold),1-mix(p,hold,end));

const brandStage=document.getElementById("brandStage");
const gearCore=document.getElementById("gearCore");
const markFinal=document.getElementById("markFinal");
const brandWordmark=document.getElementById("brandWordmark");
const logoLoader=document.getElementById("logoLoader");
const logoProgress=document.getElementById("logoProgress");
const loaderTrack=document.querySelector(".loader-track");
const wipe=document.getElementById("brandWipe");
const phrases=[...document.querySelectorAll("[data-phrase]")];
const frame=document.getElementById("frame");
const worldObject=document.getElementById("worldObject");
const grid=document.querySelector(".space-grid");
const particleCanvas=document.getElementById("particleWaves");
const particleCtx=particleCanvas?.getContext("2d");

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

const partnerUrls=[
  "https://invoga.tgdevs.pp.ua/",
  "https://jvl.tgdevs.pp.ua/",
  "https://maxine.pp.ua/",
  "https://endodontia.pp.ua/",
  "https://profissionalcapilar.tgdevs.pp.ua/",
  "https://cosmedamiaofestas.com.br/"
];

const RING_SPAN=.972;

function setSceneScale(){
  const portrait=innerHeight>innerWidth;
  const preset=portrait?PORTRAIT:LANDSCAPE;

  DESIGN_W=preset.w;
  DESIGN_H=preset.h;

  document.documentElement.classList.toggle("is-portrait",portrait);
  document.documentElement.style.setProperty("--design-w",DESIGN_W+"px");
  document.documentElement.style.setProperty("--design-h",DESIGN_H+"px");

  const scale=Math.min(innerWidth/DESIGN_W,innerHeight/DESIGN_H);
  document.documentElement.style.setProperty("--scene-scale",String(scale));

  if(particleCanvas){
    particleCanvas.width=DESIGN_W;
    particleCanvas.height=DESIGN_H;
  }
}

function setOpacity(el,v){
  if(el)el.style.opacity=String(clamp(v));
}

function setCopy(el,v,x=0,y=0,ry=0){
  if(!el)return;
  el.style.opacity=String(clamp(v));
  el.style.transform=`translate3d(${x}px,${y}px,0) rotateY(${ry}deg)`;
}

function phraseOpacity(p,start,end){
  const fade=.006;
  return Math.min(mix(p,start,start+fade),1-mix(p,end-fade,end));
}

function rgbMix(a,b,t){
  return [
    Math.round(lerp(a[0],b[0],t)),
    Math.round(lerp(a[1],b[1],t)),
    Math.round(lerp(a[2],b[2],t))
  ];
}

function gradient3(c1,c2,c3,t){
  return t<.5?rgbMix(c1,c2,t*2):rgbMix(c2,c3,(t-.5)*2);
}

function drawParticleSurface(cfg,build,visibility,portrait){
  if(!particleCtx||build<=.001||visibility<=.001)return;

  const cols=portrait?84:124;
  const rows=portrait?50:40;
  const c1=cfg.colors[0];
  const c2=cfg.colors[1];
  const c3=cfg.colors[2];

  for(let row=0;row<rows;row++){
    const depth=row/(rows-1);
    const depthEase=.18+depth*.82;
    const depthShift=(depth-.5)*cfg.shear;
    const perspectiveDrop=(depth-.5)*cfg.depthDrop;

    for(let col=0;col<cols;col++){
      const u=col/(cols-1);
      const reveal=cfg.reverse?(1-u):u;
      if(reveal>build*1.06)continue;

      const wave1=Math.sin(u*cfg.freq1+depth*3.2+cfg.phase);
      const wave2=Math.sin(u*cfg.freq2-depth*5.1+cfg.phase*.7);
      const wave3=Math.cos(u*9.5+depth*6.4+cfg.phase*.5);

      const x=u*DESIGN_W+depthShift+wave3*8;
      const y=cfg.baseY
        +wave1*cfg.amp
        +wave2*cfg.amp*.24
        +perspectiveDrop;

      if(x<-20||x>DESIGN_W+20||y<-20||y>DESIGN_H+20)continue;

      const edgeFade=Math.sin(Math.PI*clamp(u));
      const colorT=clamp(cfg.reverse?1-u:u);
      const [r,g,b]=gradient3(c1,c2,c3,colorT);
      const alpha=(.055+depth*.24)*visibility*edgeFade*(.35+build*.65);
      const radius=.72+depthEase*1.55;

      particleCtx.beginPath();
      particleCtx.fillStyle=`rgba(${r},${g},${b},${alpha.toFixed(4)})`;
      particleCtx.arc(x,y,radius,0,Math.PI*2);
      particleCtx.fill();
    }
  }
}

function drawParticleWaves(build,visibility){
  if(!particleCtx)return;

  particleCtx.clearRect(0,0,DESIGN_W,DESIGN_H);
  if(visibility<=.001)return;

  const portrait=document.documentElement.classList.contains("is-portrait");

  particleCtx.save();
  particleCtx.globalCompositeOperation="lighter";

  drawParticleSurface({
    baseY:portrait?860:555,
    amp:portrait?118:92,
    shear:portrait?120:170,
    depthDrop:portrait?210:145,
    freq1:8.4,
    freq2:16.8,
    phase:.3,
    reverse:false,
    colors:[[11,124,255],[0,199,217],[0,230,177]]
  },build,visibility,portrait);

  drawParticleSurface({
    baseY:portrait?1010:645,
    amp:portrait?132:104,
    shear:portrait?-135:-190,
    depthDrop:portrait?235:160,
    freq1:7.1,
    freq2:15.2,
    phase:2.05,
    reverse:true,
    colors:[[0,230,107],[0,199,217],[27,118,255]]
  },build,visibility*.92,portrait);

  particleCtx.restore();
}

let ticking=false;

function render(){
  ticking=false;

  const p=clamp(scrollY/SCROLL_DISTANCE);

  /* SCENE 01 — the mark builds itself. No textual loading. */
  const build=mix(p,.005,.145);
  const complete=mix(p,.118,.155);
  const word=mix(build,.54,.96);
  const navMove=mix(p,.145,.205);
  const waveFade=1-mix(p,.16,.225);

  const ringVisible=1-complete;
  const ringProgress=RING_SPAN*build;

  logoProgress.style.strokeDasharray=`${ringProgress} ${Math.max(.0001,1-ringProgress)}`;
  logoProgress.style.strokeDashoffset="0";
  logoProgress.style.opacity=String(ringVisible);
  loaderTrack.style.opacity=String(.8*ringVisible);

  gearCore.style.transform=`rotate(${lerp(0,720,build)}deg)`;
  gearCore.style.opacity=String(1-complete*.95);

  markFinal.style.opacity=String(complete);

  brandWordmark.style.opacity=String(word);
  brandWordmark.style.transform=`translateX(${lerp(-96,0,word)}px)`;
  brandWordmark.style.clipPath=`inset(0 ${lerp(100,0,word)}% 0 0)`;

  drawParticleWaves(build,waveFade);

  const portrait=document.documentElement.classList.contains("is-portrait");
  const baseX=portrait?450:720;
  const baseY=portrait?800:450;
  const targetX=portrait?72:74;
  const targetY=portrait?76:62;
  const targetScale=portrait?.38:.36;

  brandStage.style.transform=`translate3d(${lerp(0,targetX-baseX,navMove)}px,${lerp(0,targetY-baseY,navMove)}px,0) scale(${lerp(1,targetScale,navMove)})`;

  const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.155]];
  phrases.forEach((el,i)=>{
    const op=phraseOpacity(p,ranges[i][0],ranges[i][1]);
    el.style.opacity=String(op);
    el.style.transform=`translateY(${lerp(18,0,op)}px)`;
  });

  document.querySelector(".intro-copy").style.opacity=String(1-mix(p,.145,.19));

  const wipeIn=mix(p,.185,.225);
  const wipeOut=mix(p,.225,.255);
  wipe.style.transform=`scaleX(${wipeIn})`;
  wipe.style.opacity=String(1-wipeOut);

  /* Existing later scenes stay provisional until scene 02 is redesigned. */
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
    fw=lerp(360,390,t);
    fh=lerp(360,390,t);
    fr=lerp(180,195,t);
    fx=DESIGN_W*.18;
    ry=lerp(12,7,t);
  }else if(q<.50){
    const t=mix(q,.27,.50);
    fw=lerp(390,720,t);
    fh=lerp(390,430,t);
    fr=lerp(195,28,t);
    fx=lerp(DESIGN_W*.18,-DESIGN_W*.17,t);
    ry=lerp(7,-9,t);
  }else if(q<.82){
    const t=mix(q,.50,.62);
    fw=lerp(720,1120,t);
    fh=lerp(430,648,t);
    fr=lerp(28,22,t);
    fx=lerp(-DESIGN_W*.17,DESIGN_W*.11,t);
    ry=lerp(-9,4,t);
  }else{
    const t=mix(q,.82,.94);
    fw=lerp(1120,1240,t);
    fh=lerp(648,666,t);
    fr=lerp(22,18,t);
    fx=DESIGN_W*.10;
    ry=lerp(4,-3,t);
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
  grid.style.opacity=String(lerp(.08,.20,p));

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

function request(){
  if(!ticking){
    ticking=true;
    requestAnimationFrame(render);
  }
}

setSceneScale();
render();

addEventListener("scroll",request,{passive:true});
addEventListener("resize",()=>{
  setSceneScale();
  request();
});
