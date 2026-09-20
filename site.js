const LANDSCAPE={w:1440,h:900};
const PORTRAIT={w:900,h:1440};
const SCROLL_DISTANCE=9600;

let DESIGN_W=LANDSCAPE.w;
let DESIGN_H=LANDSCAPE.h;

const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const mix=(p,a,b)=>smooth(clamp((p-a)/(b-a)));

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

const tgbcGradientBg=document.getElementById("tgbcGradientBg");
const tgbcReveal=document.getElementById("tgbcReveal");
const tgbcLead=document.querySelector(".tgbc-lead");
const tgbcLeadLine=document.querySelector(".tgbc-lead i");
const tgbcFav=document.getElementById("tgbcFav");
const tgbcWord=document.querySelector(".tgbc-word");

const laterCopies=[
  document.querySelector(".tgbc-copy"),
  document.querySelector(".tgdesk-copy"),
  document.querySelector(".partner-copy"),
  document.querySelector(".demos-copy")
];

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

  /* 01 — TGDevs builds. */
  const build=mix(p,.005,.13);
  const wordBuild=mix(build,.54,.96);
  const finalIn=mix(p,.15,.158);
  const vectorOut=mix(p,.16,.168);

  logoProgress.style.strokeDasharray="1 1";
  logoProgress.style.strokeDashoffset=String(1-build);
  logoProgress.style.opacity=build<=.001?"0":"1";
  loaderTracks.forEach(track=>track.style.opacity=".52");
  logoLoader.style.opacity=String(1-vectorOut);

  if(gearSpin)gearSpin.setAttribute("transform",`rotate(${lerp(0,720,build)} 205 203.5)`);
  gearCore.style.opacity=String(1-vectorOut);

  const wordOut=1-mix(p,.19,.235);
  const tgMarkOut=1-mix(p,.285,.33);

  markFinal.style.opacity=String(finalIn*tgMarkOut);
  brandWordmark.style.opacity=String(wordBuild*wordOut);
  brandWordmark.style.transform=`translateX(${lerp(-96,0,wordBuild)}px)`;
  brandWordmark.style.clipPath=`inset(0 ${lerp(100,0,wordBuild)}% 0 0)`;

  /* Keep the TGDevs mark fixed in the center while the world folds around it. */
  brandStage.style.transform="translate3d(0,0,0) scale(1)";

  const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.185]];
  phrases.forEach((el,i)=>{
    const op=phraseOpacity(p,ranges[i][0],ranges[i][1])*(1-mix(p,.185,.225));
    el.style.opacity=String(op);
    el.style.transform=`translateY(${lerp(18,0,op)}px)`;
  });
  introCopy.style.opacity=String(1-mix(p,.185,.225));

  /* 02 — the particle world becomes a sphere around the TGDevs favicon. */
  const orbMorph=mix(p,.18,.265);
  const orbExpand=mix(p,.275,.365);
  const particleLife=1-mix(p,.34,.395);
  const flow=mix(p,.005,.36);

  if(world3d){
    world3d.render({
      width:DESIGN_W,
      height:DESIGN_H,
      introBuild:build,
      introVisibility:particleLife,
      flow,
      orbMorph,
      orbExpand,
      tour:0,
      portrait
    });
  }

  /* 03 — sphere expands into the full-screen TGBC gradient. */
  const gradientIn=mix(p,.285,.365);
  if(tgbcGradientBg){
    tgbcGradientBg.style.opacity=String(gradientIn);
    tgbcGradientBg.style.transform=`scale(${lerp(.16,1.24,gradientIn)})`;
    tgbcGradientBg.style.filter=`saturate(${lerp(1.0,1.16,gradientIn)}) brightness(${lerp(.86,1,gradientIn)})`;
  }

  /* 04 — TGDevs becomes TGBC. */
  const tgbcIconIn=mix(p,.295,.35);
  const tgbcWordIn=mix(p,.335,.395);
  const leadIn=mix(p,.35,.415);
  const lineIn=mix(p,.37,.435);

  if(tgbcReveal)tgbcReveal.style.opacity=String(Math.max(tgbcIconIn,leadIn));
  if(tgbcFav){
    tgbcFav.style.opacity=String(tgbcIconIn);
    tgbcFav.style.transform=`scale(${lerp(.84,1,tgbcIconIn)})`;
  }
  if(tgbcWord){
    tgbcWord.style.opacity=String(tgbcWordIn);
    tgbcWord.style.transform=`translateX(${lerp(-42,0,tgbcWordIn)}px)`;
  }
  if(tgbcLead){
    tgbcLead.style.opacity=String(leadIn);
    tgbcLead.style.transform=portrait
      ? `translateY(${lerp(24,0,leadIn)}px)`
      : `translateY(-50%) translateX(${lerp(-30,0,leadIn)}px)`;
  }
  if(tgbcLeadLine)tgbcLeadLine.style.width=`${lerp(0,260,lineIn)}px`;

  /* Stop here for now: this is the keyframe we refine before continuing the tour. */
  laterCopies.forEach(el=>{if(el)el.style.opacity="0";});
  wipe.style.opacity="0";
  wipe.style.transform="scaleX(0)";

  const gridOut=1-mix(p,.23,.34);
  grid.style.opacity=String(.08*gridOut);
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
addEventListener("resize",()=>{setSceneScale();request();});