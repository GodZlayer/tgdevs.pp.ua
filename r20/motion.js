import * as THREE from 'three';

export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const smooth=t=>t*t*(3-2*t);
export const mix=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const TAU=Math.PI*2;

export function seeded(n){
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function eachMaterial(root,fn){
  if(!root)return;
  root.traverse(o=>{
    if(!o.isMesh && !o.isPoints && !o.isLine)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>m&&fn(m,o));
  });
}

export function opacity(root,a){
  if(!root)return;
  const v=clamp(a);
  root.visible=v>.001;
  eachMaterial(root,m=>{
    m.transparent=true;
    if(m.uniforms?.uAlpha)m.uniforms.uAlpha.value=v;
    else if(typeof m.opacity==='number')m.opacity=v;
    m.depthWrite=false;
  });
}

export function copyTransform(o){
  return {
    position:o.position.clone(),
    scale:o.scale.clone(),
    quaternion:o.quaternion.clone(),
    visible:o.visible
  };
}

export function restoreTransform(o,s){
  if(!o||!s)return;
  o.position.copy(s.position);
  o.scale.copy(s.scale);
  o.quaternion.copy(s.quaternion);
  o.visible=s.visible;
}

export function sampleWorldRoots(roots,count){
  const entries=[];
  let total=0;
  const world=new THREE.Matrix4();

  for(const root of roots.filter(Boolean)){
    root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(!o.isMesh || !o.geometry?.getAttribute('position'))return;
      const pos=o.geometry.getAttribute('position');
      if(!pos?.count)return;
      world.copy(o.matrixWorld);
      total+=Math.max(1,pos.count);
      entries.push({pos,matrix:world.clone(),cumulative:total});
    });
  }

  const out=new Float32Array(count*3);
  if(!entries.length)return out;
  const v=new THREE.Vector3();

  for(let i=0;i<count;i++){
    const pick=seeded(i*17.113+.91)*total;
    let entry=entries[entries.length-1];
    for(let j=0;j<entries.length;j++){
      if(pick<=entries[j].cumulative){entry=entries[j];break;}
    }
    const idx=Math.min(
      entry.pos.count-1,
      Math.floor(seeded(i*29.731+3.17)*entry.pos.count)
    );
    v.fromBufferAttribute(entry.pos,idx).applyMatrix4(entry.matrix);
    out[i*3]=v.x;
    out[i*3+1]=v.y;
    out[i*3+2]=v.z+(seeded(i*7.37+.2)-.5)*.006;
  }
  return out;
}

export function createMorph(from,to,count,size=.012,{ui=false}={}){
  const base=new THREE.TetrahedronGeometry(size,0);
  const geo=new THREE.InstancedBufferGeometry();
  geo.index=base.index;
  geo.setAttribute('position',base.getAttribute('position'));
  geo.setAttribute('normal',base.getAttribute('normal'));
  geo.instanceCount=count;
  geo.setAttribute('iFrom',new THREE.InstancedBufferAttribute(from,3));
  geo.setAttribute('iTo',new THREE.InstancedBufferAttribute(to,3));

  const seed=new Float32Array(count);
  const order=new Float32Array(count);

  for(let i=0;i<count;i++){
    const sd=seeded(i*8.71);
    seed[i]=sd;
    const x=from[i*3],y=from[i*3+1];
    const tx=to[i*3],ty=to[i*3+1];
    const angle=Math.atan2(ty-y,tx-x);
    order[i]=ui
      ? clamp((x+6.0)/12.0+sd*.08)
      : ((Math.PI/2-angle+TAU)%TAU)/TAU*.88+sd*.05;
  }

  geo.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));
  geo.setAttribute('iOrder',new THREE.InstancedBufferAttribute(order,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uProgress:{value:0},
      uAlpha:{value:0},
      uUi:{value:ui?1:0}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.NormalBlending,
    vertexShader:`
      attribute vec3 iFrom;
      attribute vec3 iTo;
      attribute float iSeed;
      attribute float iOrder;
      uniform float uProgress;
      varying vec3 vP;
      varying vec3 vN;
      varying float vSeed;

      void main(){
        float local=smoothstep(iOrder-.10,iOrder+.17,uProgress);
        float phase=iSeed*6.28318530718;
        vec3 arc=vec3(cos(phase),sin(phase),sin(phase*1.73));
        vec3 c=mix(iFrom,iTo,local);
        float lift=sin(local*3.14159265);
        c+=arc*lift*(.055+.18*iSeed);
        c.z+=lift*(.08+.22*iSeed);

        vec3 p=c+position*(1.0+lift*.50);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);

        vP=c;
        vN=normalize(normalMatrix*normal);
        vSeed=iSeed;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      uniform float uUi;
      varying vec3 vP;
      varying vec3 vN;
      varying float vSeed;

      void main(){
        vec3 blue=vec3(.035,.42,1.0);
        vec3 cyan=vec3(.00,.82,.96);
        vec3 green=vec3(.00,.91,.49);
        float t=clamp(vSeed*.80+(vP.x+5.0)/10.0*.20,0.0,1.0);

        vec3 brand=t<.55
          ? mix(blue,cyan,t/.55)
          : mix(cyan,green,(t-.55)/.45);

        vec3 uiCol=mix(vec3(.78,.92,.98),brand,.58);
        vec3 col=mix(brand,uiCol,uUi);

        vec3 L=normalize(vec3(-.35,.72,1.0));
        float lit=.72+.35*max(0.0,dot(normalize(vN),L));
        gl_FragColor=vec4(min(col*lit,vec3(1.0)),uAlpha);
      }
    `
  });

  mat.toneMapped=false;
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=24;
  return mesh;
}

export function setMorph(mesh,progress,alpha){
  if(!mesh)return;
  mesh.visible=alpha>.001;
  mesh.material.uniforms.uProgress.value=clamp(progress);
  mesh.material.uniforms.uAlpha.value=clamp(alpha);
}
