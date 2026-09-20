import { TGWorld3D } from './world3d-r2.js';

const LANDSCAPE={w:1440,h:900};
const PORTRAIT={w:900,h:1440};
const SCROLL_DISTANCE=9600;

let DESIGN_W=LANDSCAPE.w;
let DESIGN_H=LANDSCAPE.h;

const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const mix=(p,a,b)=>smooth(clamp((p-a)/(b-a)));

const canvas=document.getElementById('particleWaves');
const world=canvas?new TGWorld3D(canvas):null;

const scrollCue=document.getElementById('scrollCue');
const phrases=[...document.querySelectorAll('[data-phrase]')];
const introCopy=document.querySelector('.intro-copy');
const grid=document.querySelector('.space-grid');
const tgbcReveal=document.getElementById('tgbcReveal');
const tgbcLead=document.querySelector('.tgbc-lead');
const tgbcLeadLine=document.querySelector('.tgbc-lead i');
const wipe=document.getElementById('brandWipe');

const laterCopies=[
  document.querySelector('.tgbc-copy'),
  document.querySelector('.tgdesk-copy'),
  document.querySelector('.partner-copy'),
  document.querySelector('.demos-copy')
];

function setSceneScale(){
  const portrait=innerHeight>innerWidth;
  const preset=portrait?PORTRAIT:LANDSCAPE;
  DESIGN_W=preset.w;
  DESIGN_H=preset.h;

  document.documentElement.classList.toggle('is-portrait',portrait);
  document.documentElement.style.setProperty('--design-w',DESIGN_W+'px');
  document.documentElement.style.setProperty('--design-h',DESIGN_H+'px');

  const scale=Math.min(innerWidth/DESIGN_W,innerHeight/DESIGN_H);
  document.documentElement.style.setProperty('--scene-scale',String(scale));
  if(world)world.resize(DESIGN_W,DESIGN_H);
}

function phraseOpacity(p,start,end){
  const fade=.006;
  return Math.min(mix(p,start,start+fade),1-mix(p,end-fade,end));
}

let ticking=false;

function render(){
  ticking=false;
  const p=clamp(scrollY/SCROLL_DISTANCE);
  const portrait=document.documentElement.classList.contains('is-portrait');

  if(scrollCue){
    const cueOut=mix(p,.004,.028);
    scrollCue.style.opacity=String(1-cueOut);
    scrollCue.style.transform='translateX(-50%) translateY('+lerp(0,14,cueOut)+'px)';
  }

  const build=mix(p,.005,.13);
  const wordIn=mix(build,.54,.96);

  const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.185]];
  phrases.forEach((el,i)=>{
    const op=phraseOpacity(p,ranges[i][0],ranges[i][1])*(1-mix(p,.185,.225));
    el.style.opacity=String(op);
    el.style.transform='translateY('+lerp(18,0,op)+'px)';
  });
  if(introCopy)introCopy.style.opacity=String(1-mix(p,.185,.225));

  const orb=mix(p,.18,.265);
  const orbExpand=mix(p,.275,.365);
  const cloudVisible=1-mix(p,.34,.405);
  const gradient=mix(p,.285,.365);

  const logoCloud=mix(p,.275,.305);
  const logoMorph=mix(p,.305,.395);
  const targetSolid=mix(p,.385,.415);
  const stageShift=mix(p,.30,.40);

  if(world){
    world.render({
      width:DESIGN_W,
      height:DESIGN_H,
      portrait,
      build,
      wordIn,
      gearRotation:lerp(0,Math.PI*4,build),
      cloudVisible,
      flow:mix(p,.005,.36),
      orb,
      orbExpand,
      gradient,
      logoCloud,
      logoMorph,
      targetSolid,
      stageShift
    });
  }

  const leadIn=mix(p,.35,.415);
  const lineIn=mix(p,.37,.435);
  if(tgbcReveal)tgbcReveal.style.opacity=String(leadIn);
  if(tgbcLead){
    tgbcLead.style.opacity=String(leadIn);
    tgbcLead.style.transform=portrait
      ? 'translateY('+lerp(24,0,leadIn)+'px)'
      : 'translateY(-50%) translateX('+lerp(-30,0,leadIn)+'px)';
  }
  if(tgbcLeadLine)tgbcLeadLine.style.width=lerp(0,260,lineIn)+'px';

  laterCopies.forEach(el=>{if(el)el.style.opacity='0';});
  if(wipe){wipe.style.opacity='0';wipe.style.transform='scaleX(0)';}

  if(grid){
    const gridOut=1-mix(p,.23,.34);
    grid.style.opacity=String(.08*gridOut);
  }
}

function request(){
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(render);
}

window.addEventListener('tgworldready',request);
window.addEventListener('scroll',request,{passive:true});
window.addEventListener('resize',()=>{setSceneScale();request();});

setSceneScale();
render();
