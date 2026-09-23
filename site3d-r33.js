import { TGWorld3D } from './world3d-r33.js';
import { getResponsiveProfile } from './r33/responsive-layout.js';

const SCROLL_DISTANCE=12000;

let width=1;
let height=1;
let profile=getResponsiveProfile(1,1);
let ticking=false;

const canvas=document.getElementById('worldCanvas');
const world=new TGWorld3D(canvas);

function readViewport(){
  const vv=globalThis.visualViewport;
  return {
    width:Math.max(1,Math.round(vv?.width||innerWidth||1)),
    height:Math.max(1,Math.round(vv?.height||innerHeight||1))
  };
}

function layout(){
  const viewport=readViewport();
  width=viewport.width;
  height=viewport.height;
  profile=getResponsiveProfile(width,height);

  document.documentElement.classList.toggle(
    'is-portrait',
    profile.compatibilityPortrait
  );
  document.documentElement.style.setProperty('--world-aspect',String(profile.aspect));
  document.documentElement.style.setProperty('--world-vertical',String(profile.vertical));
  document.documentElement.style.setProperty('--world-dpr',String(profile.dpr));
}

function render(){
  ticking=false;
  const p=Math.max(0,scrollY/SCROLL_DISTANCE);
  world.render({
    p,
    width,
    height,
    portrait:profile.compatibilityPortrait,
    responsive:profile
  });
}

function request(){
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(render);
}

function relayout(){
  layout();
  request();
}

layout();
render();

addEventListener('scroll',request,{passive:true});
addEventListener('resize',relayout,{passive:true});
addEventListener('orientationchange',()=>setTimeout(relayout,60),{passive:true});
addEventListener('pageshow',relayout);
addEventListener('visibilitychange',()=>{if(!document.hidden)relayout();});
addEventListener('tgworldready',request);

if(globalThis.visualViewport){
  visualViewport.addEventListener('resize',relayout,{passive:true});
  visualViewport.addEventListener('scroll',relayout,{passive:true});
}
