import * as THREE from 'three';
import { clamp, seeded, TAU } from '../r20/motion.js';

export function createSurfaceParticlePhase(surface,count=5200){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(surface,3)
  );

  const seed=new Float32Array(count);
  const order=new Float32Array(count);
  const dir=new Float32Array(count*3);

  for(let i=0;i<count;i++){
    const s=seeded(i*8.71+.13);
    const a=seeded(i*3.17+.71)*TAU;
    const z=seeded(i*5.63+.37)*2-1;
    const r=Math.sqrt(Math.max(0,1-z*z));

    seed[i]=s;
    order[i]=
      clamp(
        .58*seeded(i*2.41+.2)+
        .42*s
      );

    dir[i*3]=Math.cos(a)*r;
    dir[i*3+1]=Math.sin(a)*r;
    dir[i*3+2]=z;
  }

  geo.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed,1)
  );

  geo.setAttribute(
    'aOrder',
    new THREE.BufferAttribute(order,1)
  );

  geo.setAttribute(
    'aDir',
    new THREE.BufferAttribute(dir,3)
  );

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uPhase:{value:0},
      uAlpha:{value:0},
      uFlow:{value:0},
      uPointScale:{value:1}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute float aSeed;
      attribute float aOrder;
      attribute vec3 aDir;

      uniform float uPhase;
      uniform float uAlpha;
      uniform float uFlow;
      uniform float uPointScale;

      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        float phase=
          clamp(uPhase,0.0,1.0);

        // Every point waits for its own threshold. This is the key difference
        // from a global fade: the solid genuinely appears to granulate.
        float local=
          smoothstep(
            aOrder-.20,
            aOrder+.18,
            phase
          );

        vec3 p=position;

        float curlA=
          sin(
            p.x*2.17+
            p.y*1.31+
            aSeed*6.2831853+
            uFlow*1.07
          );

        float curlB=
          cos(
            p.x*.91-
            p.y*2.43+
            aSeed*9.71-
            uFlow*.73
          );

        vec3 tangent=normalize(
          vec3(
            curlA,
            curlB,
            sin(
              aSeed*13.11+
              uFlow*.61
            )
          )+
          aDir*.35
        );

        // At phase=0 particles are pinned exactly to the object surface.
        // As phase rises they peel off naturally along deterministic local flow.
        float peel=
          local*local;

        p+=
          tangent*
          peel*
          (.025+.155*aSeed);

        p+=
          aDir*
          peel*
          (.008+.050*(1.0-aSeed));

        p.z+=
          sin(
            aSeed*TAU+
            uFlow+
            p.x*1.7
          )*
          peel*
          .024;

        vec4 mv=
          modelViewMatrix*
          vec4(p,1.0);

        gl_Position=
          projectionMatrix*
          mv;

        float settle=
          1.0-local;

        gl_PointSize=
          (1.05+aSeed*2.15)*
          uPointScale*
          (1.0+.24*peel);

        vec3 blue=vec3(.02,.30,.92);
        vec3 cyan=vec3(.05,.84,.98);
        vec3 green=vec3(.04,.88,.60);

        float ct=
          clamp(
            .65*aSeed+
            .35*clamp(
              (p.x+1.2)/2.4,
              0.0,
              1.0
            ),
            0.0,
            1.0
          );

        vColor=
          ct<.58
          ? mix(
              blue,
              cyan,
              ct/.58
            )
          : mix(
              cyan,
              green,
              (ct-.58)/.42
            );

        // Surface particles are strongest while the mesh is exchanging state
        // with them; they never pop in from zero as a separate object.
        float bridge=
          .42+
          .58*sin(
            clamp(
              phase,
              0.0,
              1.0
            )*
            3.14159265
          );

        vAlpha=
          uAlpha*
          bridge*
          (.18+.52*aSeed)*
          (.82+.18*settle);
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
            .34,
            1.0,
            r
          );

        float core=
          1.0-
          smoothstep(
            0.0,
            .16,
            r
          );

        gl_FragColor=
          vec4(
            min(
              vec3(1.0),
              vColor+
              core*.12
            ),
            vAlpha*soft
          );
      }
    `
  });

  mat.toneMapped=false;

  const pts=
    new THREE.Points(
      geo,
      mat
    );

  pts.visible=false;
  pts.frustumCulled=false;
  pts.renderOrder=66;

  return pts;
}

export function setSurfaceParticlePhase(
  points,
  {
    phase=0,
    alpha=0,
    flow=0,
    pointScale=1,
    foreground=true
  }={}
){
  if(!points)return;

  const u=
    points.material.uniforms;

  u.uPhase.value=
    clamp(phase);

  u.uAlpha.value=
    clamp(alpha);

  u.uFlow.value=
    flow;

  u.uPointScale.value=
    pointScale;

  points.renderOrder=
    foreground?66:30;

  points.visible=
    alpha>.001;
}

export function staggeredResolve(
  root,
  resolve,
  opacityFn
){
  if(!root)return;

  const r=clamp(resolve);
  const ud=root.userData||{};

  const parts=[];

  if(ud.first)parts.push(ud.first);
  if(Array.isArray(ud.steps))parts.push(...ud.steps);
  if(ud.center)parts.push(ud.center);

  if(!parts.length){
    opacityFn(root,r);
    return;
  }

  const n=
    Math.max(
      1,
      parts.length-1
    );

  parts.forEach(
    (part,i)=>{
      const center=i/n;
      const local=
        clamp(
          (r-(center*.46))/.54
        );

      // smoothstep without importing another helper
      const s=
        local*local*(3-2*local);

      opacityFn(
        part,
        s
      );
    }
  );
}
