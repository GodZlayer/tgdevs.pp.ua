const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
let frame=0;
function update(){
  frame=0;
  const h=window.innerHeight||1;
  document.querySelectorAll('[data-timeline]').forEach(el=>{
    const r=el.getBoundingClientRect();
    const travel=Math.max(1,r.height-h);
    el.style.setProperty('--p',String(clamp(-r.top/travel)));
  });
}
function request(){if(!frame)frame=requestAnimationFrame(update)}
update();
addEventListener('scroll',request,{passive:true});
addEventListener('resize',request);
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href'); const t=id&&document.querySelector(id);
  if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
}));