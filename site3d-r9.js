import { TGWorld3D } from './world3d-r9.js';

const SCROLL_DISTANCE=9600;

let width=Math.max(1,innerWidth);
let height=Math.max(1,innerHeight);
let portrait=height>width;
let ticking=false;

const canvas=document.getElementById('worldCanvas');
const world=new TGWorld3D(canvas);

function layout(){
  width=Math.max(1,innerWidth);
  height=Math.max(1,innerHeight);
  portrait=height>width;

  document.documentElement.classList.toggle('is-portrait',portrait);
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
