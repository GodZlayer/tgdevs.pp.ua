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
  // Canonical particle grammar copied from the opening TGDevs scene:
  // small points, staggered birth, two-frequency flow, deterministic motion,
  // and no glowing ribbons / tetrahedron fragments.
  const geo=new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(from,3)
  );

  geo.setAttribute(
    'aTo',
    new THREE.BufferAttribute(to,3)
  );

  const seed=new Float32Array(count);
  const order=new Float32Array(count);

  for(let i=0;i<count;i++){
    const sd=seeded(i*8.71);
    seed[i]=sd;

    const x=from[i*3];
    const tx=to[i*3];
    const ty=to[i*3+1];
    const y=from[i*3+1];

    const angle=Math.atan2(
      ty-y,
      tx-x
    );

    order[i]=ui
      ? clamp(
          (x+6.0)/12.0+
          sd*.055
        )
      : (
          (
            Math.PI/2-
            angle+
            TAU
          )%TAU
        )/TAU*.88+
        sd*.045;
  }

  geo.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed,1)
  );

  geo.setAttribute(
    'aOrder',
    new THREE.BufferAttribute(order,1)
  );

  const pointScale=
    clamp(
      size/.012,
      .72,
      1.22
    );

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uProgress:{value:0},
      uAlpha:{value:0},
      uFlow:{value:0},
      uPointScale:{value:pointScale},
      uUi:{value:ui?1:0}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute vec3 aTo;
      attribute float aSeed;
      attribute float aOrder;

      uniform float uProgress;
      uniform float uAlpha;
      uniform float uFlow;
      uniform float uPointScale;
      uniform float uUi;

      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        float local=smoothstep(
          aOrder-.12,
          aOrder+.19,
          uProgress
        );

        float phase=
          aSeed*6.28318530718;

        vec3 base=
          mix(
            position,
            aTo,
            local
          );

        float life=
          sin(local*3.14159265);

        // Same visual DNA as the original TGDevs cloud:
        // two frequencies crossing each other instead of one obvious spiral.
        float w1=sin(
          base.x*1.41+
          base.y*.77+
          phase+
          uFlow*1.30
        );

        float w2=sin(
          base.x*2.63-
          base.y*1.17+
          phase*.70-
          uFlow*.72
        );

        vec3 flow=vec3(
          w1,
          w2,
          sin(
            phase*1.73+
            uFlow*.84+
            base.x*.54
          )
        );

        // Mid-flight turbulence, exact endpoints.
        base+=
          flow*
          life*
          (.018+.082*aSeed)*
          mix(1.0,.64,uUi);

        base.z+=
          life*
          (.035+.14*aSeed);

        vec4 mv=
          modelViewMatrix*
          vec4(base,1.0);

        gl_Position=
          projectionMatrix*
          mv;

        gl_PointSize=
          (1.00+aSeed*1.85)*
          uPointScale*
          (1.0+life*.28);

        vec3 blue=
          vec3(.043,.486,1.0);

        vec3 cyan=
          vec3(.00,.78,.85);

        vec3 green=
          vec3(.00,.90,.42);

        float ct=
          clamp(
            aSeed*.70+
            .30*
            clamp(
              (base.x+4.0)/8.0,
              0.0,
              1.0
            ),
            0.0,
            1.0
          );

        vec3 brand=
          ct<.55
          ? mix(
              blue,
              cyan,
              ct/.55
            )
          : mix(
              cyan,
              green,
              (ct-.55)/.45
            );

        vec3 uiColor=
          mix(
            vec3(.70,.90,.96),
            brand,
            .72
          );

        vColor=
          mix(
            brand,
            uiColor,
            uUi
          );

        // Small independent points; no thick additive line.
        vAlpha=
          uAlpha*
          (.10+aSeed*.34)*
          (.72+life*.28);
      }
    `,
    fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        vec2 q=
          gl_PointCoord*2.0-1.0;

        float r=
          dot(q,q);

        if(r>1.0)discard;

        float soft=
          1.0-
          smoothstep(
            .40,
            1.0,
            r
          );

        gl_FragColor=
          vec4(
            vColor,
            vAlpha*soft
          );
      }
    `
  });

  mat.toneMapped=false;

  const points=
    new THREE.Points(
      geo,
      mat
    );

  points.frustumCulled=false;
  points.renderOrder=24;
  return points;
}

export function setMorph(mesh,progress,alpha){
  if(!mesh)return;

  const t=clamp(progress);

  mesh.visible=
    alpha>.001;

  mesh.material.uniforms
    .uProgress.value=t;

  mesh.material.uniforms
    .uAlpha.value=
      clamp(alpha);

  if(mesh.material.uniforms.uFlow){
    mesh.material.uniforms
      .uFlow.value=
        t*3.35;
  }
}
