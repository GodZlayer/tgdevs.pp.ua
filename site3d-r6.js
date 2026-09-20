import { TGWorld3D } from './world3d-r6.js';

const LANDSCAPE={w:1440,h:900};
const PORTRAIT={w:900,h:1440};
const SCROLL_DISTANCE=9600;

let width=LANDSCAPE.w;
let height=LANDSCAPE.h;
let portrait=false;
let ticking=false;

const canvas=document.getElementById('worldCanvas');
const world=new TGWorld3D(canvas);

function layout(){
  portrait=innerHeight>innerWidth;
  const preset=portrait?PORTRAIT:LANDSCAPE;
  width=preset.w;
  height=preset.h;

  document.documentElement.classList.toggle('is-portrait',portrait);
  document.documentElement.style.setProperty('--design-w',width+'px');
  document.documentElement.style.setProperty('--design-h',height+'px');

  const scale=Math.min(innerWidth/width,innerHeight/height);
  document.documentElement.style.setProperty('--scene-scale',String(scale));
}

function render(){
  ticking=false;
  const p=Math.min(1,Math.max(0,scrollY/SCROLL_DISTANCE));
  world.render({p,width,height,portrait});
}

function request(){
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(render);
}

layout();
render();

addEventListener('scroll',request,{passive:true});
addEventListener('resize',()=>{layout();request();},{passive:true});
addEventListener('orientationchange',()=>{setTimeout(()=>{layout();request();},80);},{passive:true});
addEventListener('pageshow',request);
addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
addEventListener('tgworldready',request);
