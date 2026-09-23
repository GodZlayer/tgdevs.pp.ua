import { TGWorld3D } from './world3d-r32.js';
import { getResponsiveProfile } from './r32/responsive-layout.js';

const SCROLL_DISTANCE=12000;

let width=Math.max(1,innerWidth);
let height=Math.max(1,innerHeight);
let profile=getResponsiveProfile(width,height);
let ticking=false;

const canvas=document.getElementById('worldCanvas');
const world=new TGWorld3D(canvas);

function layout(){
  width=Math.max(1,innerWidth);
  height=Math.max(1,innerHeight);
  profile=getResponsiveProfile(width,height);
  document.documentElement.classList.toggle(
    'is-portrait',
    profile.compatibilityPortrait
  );
  document.documentElement.style.setProperty(
    '--world-aspect',
    String(profile.aspect)
  );
  document.documentElement.style.setProperty(
    '--world-vertical',
    String(profile.vertical)
  );
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

layout();
render();

addEventListener('scroll',request,{passive:true});
addEventListener('resize',()=>{layout();request();},{passive:true});
addEventListener('orientationchange',()=>{setTimeout(()=>{layout();request();},80);},{passive:true});
addEventListener('pageshow',request);
addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
addEventListener('tgworldready',request);
