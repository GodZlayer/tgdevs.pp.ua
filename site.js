const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const mix=(p,a,b)=>smooth(clamp((p-a)/(b-a)));

const frame=document.getElementById("frame");
const worldObject=document.getElementById("worldObject");
const grid=document.querySelector(".space-grid");
const layers={
  brand:document.querySelector(".brand-layer"),
  tgbc:document.querySelector(".tgbc-layer"),
  desk:document.querySelector(".desk-layer"),
  browser:document.querySelector(".browser-layer"),
  demos:document.querySelector(".demos-layer")
};
const copies={
  intro:document.querySelector(".intro-copy"),
  tgbc:document.querySelector(".tgbc-copy"),
  desk:document.querySelector(".tgdesk-copy"),
  partner:document.querySelector(".partner-copy"),
  demos:document.querySelector(".demos-copy")
};
const orbits=[...document.querySelectorAll(".orbit")];
const frames=[...document.querySelectorAll(".browser-pages iframe")];
const address=document.getElementById("browserAddress");
const browserOpen=document.getElementById("browserOpen");
const partnerName=document.getElementById("partnerName");
const partnerIndex=document.getElementById("partnerIndex");
const progressLine=document.getElementById("progressLine");
const sceneNumber=document.getElementById("sceneNumber");

const partnerUrls=[
"https://invoga.tgdevs.pp.ua/",
"https://jvl.tgdevs.pp.ua/",
"https://maxine.pp.ua/",
"https://endodontia.pp.ua/",
"https://profissionalcapilar.tgdevs.pp.ua/",
"https://cosmedamiaofestas.com.br/"
];

function setOpacity(el,v){if(el)el.style.opacity=clamp(v)}
function setCopy(el,v,x=0,y=0,z=0,ry=0){
  if(!el)return;
  el.style.opacity=clamp(v);
  el.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg)`;
}
function blendOpacity(p,start,hold,end){
  const a=mix(p,start,hold), b=1-mix(p,hold,end);
  return Math.min(a,b);
}

let ticking=false;
function render(){
  ticking=false;
  const max=document.documentElement.scrollHeight-innerHeight;
  const p=max>0?clamp(scrollY/max):0;

  progressLine.style.width=`${p*100}%`;

  const intro=blendOpacity(p,0,.03,.13);
  const tgbc=blendOpacity(p,.09,.18,.34);
  const desk=blendOpacity(p,.30,.40,.52);
  const partners=blendOpacity(p,.49,.62,.83);
  const demos=blendOpacity(p,.80,.90,1);

  setCopy(copies.intro,intro,0,lerp(36,0,intro));
  setCopy(copies.tgbc,tgbc,lerp(-40,0,tgbc),0,0,lerp(-10,0,tgbc));
  setCopy(copies.desk,desk,lerp(40,0,desk),0,0,lerp(10,0,desk));
  setCopy(copies.partner,partners,lerp(-45,0,partners),0);
  setCopy(copies.demos,demos,lerp(-45,0,demos),0);

  const viewportW=innerWidth, viewportH=innerHeight;

  // persistent object morph: logo -> TGBC core -> TGDesk window -> live partner browser -> two demos
  let w=260,h=260,r=130,x=0,y=-8,z=0,rx=0,ry=0,rz=0,scale=1;
  if(p<.14){
    const t=mix(p,.02,.14);
    w=lerp(260,320,t);h=lerp(260,320,t);r=h/2;
    y=lerp(-8,-20,t);z=lerp(0,60,t);ry=lerp(0,-12,t);
  }else if(p<.34){
    const t=mix(p,.14,.34);
    w=lerp(320,360,t);h=lerp(320,360,t);r=lerp(160,180,t);
    x=lerp(viewportW*.18,viewportW*.19,t);y=lerp(-20,0,t);z=lerp(60,20,t);ry=lerp(-12,13,t);
  }else if(p<.53){
    const t=mix(p,.34,.53);
    w=lerp(360,Math.min(viewportW*.50,720),t);
    h=lerp(360,Math.min(viewportH*.55,430),t);
    r=lerp(180,28,t);
    x=lerp(viewportW*.19,-viewportW*.17,t);
    y=lerp(0,-10,t);z=lerp(20,95,t);ry=lerp(13,-10,t);
  }else if(p<.83){
    const t=mix(p,.53,.64);
    w=lerp(Math.min(viewportW*.50,720),Math.min(viewportW*.78,1180),t);
    h=lerp(Math.min(viewportH*.55,430),Math.min(viewportH*.72,720),t);
    r=lerp(28,22,t);
    x=lerp(-viewportW*.17,viewportW*.11,t);
    y=lerp(-10,20,t);z=lerp(95,25,t);ry=lerp(-10,4,t);
  }else{
    const t=mix(p,.83,.94);
    w=lerp(Math.min(viewportW*.78,1180),Math.min(viewportW*.86,1320),t);
    h=lerp(Math.min(viewportH*.72,720),Math.min(viewportH*.74,760),t);
    r=lerp(22,18,t);
    x=lerp(viewportW*.11,viewportW*.10,t);
    y=lerp(20,12,t);z=lerp(25,0,t);ry=lerp(4,-3,t);
  }

  if(viewportW<900){
    w=Math.min(w,viewportW*.92);
    h=Math.min(h,viewportH*.70);
    if(p>.34&&p<.53)x=0;
    if(p>.53)x=0;
  }

  frame.style.width=`${w}px`;
  frame.style.height=`${h}px`;
  frame.style.borderRadius=`${r}px`;
  worldObject.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`;

  const brandOut=1-mix(p,.07,.16);
  const tgbcIn=mix(p,.10,.18), tgbcOut=1-mix(p,.30,.40);
  const deskIn=mix(p,.32,.41), deskOut=1-mix(p,.49,.58);
  const browserIn=mix(p,.50,.60), browserOut=1-mix(p,.80,.87);
  const demosIn=mix(p,.81,.90);

  setOpacity(layers.brand,brandOut);
  setOpacity(layers.tgbc,Math.min(tgbcIn,tgbcOut));
  setOpacity(layers.desk,Math.min(deskIn,deskOut));
  setOpacity(layers.browser,Math.min(browserIn,browserOut));
  setOpacity(layers.demos,demosIn);

  layers.brand.style.transform=`scale(${lerp(1,.72,mix(p,.07,.16))}) translateZ(${lerp(0,-100,mix(p,.07,.16))}px)`;
  layers.tgbc.style.transform=`scale(${lerp(.72,1,tgbcIn)}) rotateZ(${lerp(-12,0,tgbcIn)}deg)`;
  layers.desk.style.transform=`scale(${lerp(.84,1,deskIn)}) rotateY(${lerp(14,0,deskIn)}deg)`;
  layers.browser.style.transform=`scale(${lerp(.88,1,browserIn)}) translateZ(${lerp(-120,0,browserIn)}px)`;
  layers.demos.style.transform=`scale(${lerp(.91,1,demosIn)}) rotateY(${lerp(-8,0,demosIn)}deg)`;

  const orb=Math.min(tgbcIn,tgbcOut);
  orbits.forEach((o,i)=>{
    o.style.opacity=orb*.8;
    o.style.transform=`translate(-50%,-50%) rotate(${(p*420*(i%2? -1:1)) + i*33}deg) scale(${1+orb*.18*i})`;
  });

  grid.style.transform=`perspective(1200px) rotateX(${lerp(63,49,p)}deg) rotateZ(${lerp(0,-8,p)}deg) translate3d(${lerp(0,-3,p)}%,${lerp(26,10,p)}%,${lerp(-200,120,p)}px) scale(${lerp(1.35,1.08,p)})`;
  grid.style.opacity=String(lerp(.18,.38,Math.sin(p*Math.PI)));

  document.querySelectorAll(".depth-field i").forEach((dot,i)=>{
    const dx=Math.sin(p*9+i)*18,dy=Math.cos(p*7+i*.7)*14;
    dot.style.transform=`translate3d(${dx}px,${dy}px,${lerp(-260,260,(i+1)/9)+p*120}px)`;
  });

  // partner pages occupy a single physical browser, changing with scroll instead of separate cards
  if(p>=.55&&p<.86){
    const local=clamp((p-.56)/.27);
    const raw=local*frames.length;
    const idx=Math.min(frames.length-1,Math.floor(raw));
    const frac=raw-idx;
    frames.forEach((f,i)=>{
      let op=0;
      if(i===idx)op=1-clamp((frac-.55)/.45);
      if(i===idx+1)op=clamp((frac-.35)/.45);
      if(idx===frames.length-1&&i===idx)op=1;
      f.style.opacity=op;
    });
    const current=frames[idx];
    const url=partnerUrls[idx];
    partnerName.textContent=current?.dataset.partner||"";
    partnerIndex.textContent=`${String(idx+1).padStart(2,"0")} / ${String(frames.length).padStart(2,"0")}`;
    address.textContent=url.replace("https://","").replace(/\/$/,"");
    browserOpen.href=url;
  }else{
    frames.forEach((f,i)=>f.style.opacity=i===0?1:0);
  }

  let scene="01";
  if(p>=.13)scene="02";
  if(p>=.34)scene="03";
  if(p>=.53)scene="04";
  if(p>=.83)scene="05";
  sceneNumber.textContent=scene;
}

function request(){
  if(!ticking){ticking=true;requestAnimationFrame(render)}
}
render();
addEventListener("scroll",request,{passive:true});
addEventListener("resize",request);
