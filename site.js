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
const gearSpin=document.querySelector(".gear-spin");
const markFinal=document.getElementById("markFinal");
const brandWordmark=document.getElementById("brandWordmark");
const logoLoader=document.getElementById("logoLoader");
const logoProgress=document.getElementById("logoProgress");
const loaderTracks=[...document.querySelectorAll(".loader-track")];
const wipe=document.getElementById("brandWipe");
const scrollCue=document.getElementById("scrollCue");
const phrases=[...document.querySelectorAll("[data-phrase]")];
const introCopy=document.querySelector(".intro-copy");
const grid=document.querySelector(".space-grid");
const particleCanvas=document.getElementById("particleWaves");
const world3d=window.TGWorld3D&&particleCanvas?new window.TGWorld3D(particleCanvas):null;

const copies={
  tgbc:document.querySelector(".tgbc-copy"),
  desk:document.querySelector(".tgdesk-copy"),
  partner:document.querySelector(".partner-copy"),
  demos:document.querySelector(".demos-copy")
};

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

  if(world3d)world3d.resize(DESIGN_W,DESIGN_H);
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

let ticking=false;

function render(){
  ticking=false;

  const p=clamp(scrollY/SCROLL_DISTANCE);
  const portrait=document.documentElement.classList.contains("is-portrait");

  if(scrollCue){
    const cueOut=mix(p,.004,.028);
    scrollCue.style.opacity=String(1-cueOut);
    scrollCue.style.transform=`translateX(-50%) translateY(${lerp(0,14,cueOut)}px)`;
  }

  /* SCENE 01 — deterministic logo build */
  const build=mix(p,.005,.13);
  const word=mix(build,.54,.96);

  const finalIn=mix(p,.15,.158);
  const vectorOut=mix(p,.16,.168);
  const navMove=mix(p,.19,.235);
  const waveFade=1-mix(p,.17,.245);

  logoProgress.style.strokeDasharray="1 1";
  logoProgress.style.strokeDashoffset=String(1-build);
  logoProgress.style.opacity=build<=.001?"0":"1";

  loaderTracks.forEach(track=>track.style.opacity=".52");
  logoLoader.style.opacity=String(1-vectorOut);

  if(gearSpin)gearSpin.setAttribute("transform",`rotate(${lerp(0,720,build)} 205 203.5)`);
  gearCore.style.opacity=String(1-vectorOut);
  markFinal.style.opacity=String(finalIn);

  brandWordmark.style.opacity=String(word);
  brandWordmark.style.transform=`translateX(${lerp(-96,0,word)}px)`;
  brandWordmark.style.clipPath=`inset(0 ${lerp(100,0,word)}% 0 0)`;

  const baseX=portrait?450:720;
  const baseY=portrait?800:450;
  const targetX=portrait?72:74;
  const targetY=portrait?76:62;
  const targetScale=portrait ? .38 : .36;

  brandStage.style.transform=`translate3d(${lerp(0,targetX-baseX,navMove)}px,${lerp(0,targetY-baseY,navMove)}px,0) scale(${lerp(1,targetScale,navMove)})`;

  const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.155]];
  phrases.forEach((el,i)=>{
    const op=phraseOpacity(p,ranges[i][0],ranges[i][1]);
    el.style.opacity=String(op);
    el.style.transform=`translateY(${lerp(18,0,op)}px)`;
  });
  introCopy.style.opacity=String(1-mix(p,.145,.19));

  const wipeIn=mix(p,.215,.255);
  const wipeOut=mix(p,.255,.285);
  wipe.style.transform=`scaleX(${wipeIn})`;
  wipe.style.opacity=String(1-wipeOut);

  /* TOUR — one 3D world, continuously reorganized */
  const q=clamp((p-.235)/.765);
  const cloudFlow=mix(p,.005,.245);

  if(world3d){
    world3d.render({
      width:DESIGN_W,
      height:DESIGN_H,
      introBuild:build,
      introVisibility:waveFade,
      flow:cloudFlow,
      tour:q,
      portrait
    });
  }

  const tgbc=blendOpacity(q,.00,.07,.29);
  const desk=blendOpacity(q,.23,.35,.55);
  const partners=blendOpacity(q,.49,.63,.83);
  const demos=mix(q,.78,.90);

  setCopy(copies.tgbc,tgbc,lerp(-26,0,tgbc),0,lerp(-6,0,tgbc));
  setCopy(copies.desk,desk,lerp(26,0,desk),0,lerp(6,0,desk));
  setCopy(copies.partner,partners,lerp(-24,0,partners),0,0);
  setCopy(copies.demos,demos,lerp(-24,0,demos),0,0);

  const tourGrid=mix(p,.24,.34);
  grid.style.transform=`perspective(1200px) rotateX(${lerp(63,54,tourGrid)}deg) rotateZ(${lerp(0,-4,tourGrid)}deg) translateY(${lerp(27,14,tourGrid)}%) scale(${lerp(1.35,1.12,tourGrid)})`;
  grid.style.opacity=String(lerp(.08,.045,tourGrid));
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