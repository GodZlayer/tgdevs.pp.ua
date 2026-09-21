import * as THREE from 'three';
import { clamp, lerp, seeded, TAU } from '../r20/motion.js';

function trianglePoint(t,r=.94){
  const verts=[
    new THREE.Vector2(0,r),
    new THREE.Vector2(Math.cos(-Math.PI/6)*r,Math.sin(-Math.PI/6)*r),
    new THREE.Vector2(Math.cos(-5*Math.PI/6)*r,Math.sin(-5*Math.PI/6)*r)
  ];

  const s=((t%1)+1)%1*3;
  const i=Math.floor(s)%3;
  const f=s-Math.floor(s);
  const a=verts[i];
  const b=verts[(i+1)%3];

  const x=lerp(a.x,b.x,f);
  const y=lerp(a.y,b.y,f);

  const mx=(a.x+b.x)*.5;
  const my=(a.y+b.y)*.5;
  const ml=Math.max(.001,Math.hypot(mx,my));
  const bow=Math.sin(f*Math.PI)*.16;

  return new THREE.Vector2(
    x+mx/ml*bow,
    y+my/ml*bow
  );
}

function makeBubblePattern(i,count){
  const seed=seeded(i*13.71+.17);
  const seed2=seeded(i*7.91+.43);
  const seed3=seeded(i*3.37+.83);
  const bubble=i%11;
  const chain=bubble/10;

  const cx=lerp(-3.45,3.45,chain)+Math.sin(chain*TAU*1.7)*.38;
  const cy=Math.sin(chain*TAU*1.28+.55)*.72;

  const rx=.46+.44*seeded(bubble*5.71+.8);
  const ry=.34+.40*seeded(bubble*2.19+.4);

  const theta=seed2*TAU;
  const phi=(seed3-.5)*Math.PI*.92;

  const shell=.80+.20*Math.sin(theta*3.0+bubble*.8);

  return [
    cx+Math.cos(theta)*Math.cos(phi)*rx*shell,
    cy+Math.sin(phi)*ry*shell,
    -1.85+Math.sin(theta)*Math.cos(phi)*.24+(seed-.5)*.18
  ];
}

function makeRibbonPattern(i,count){
  const u=(i%220)/219;
  const band=Math.floor(i/220)%4;
  const v=seeded(i*7.13+.2)-.5;
  const phase=band*.74;

  const x=lerp(-3.75,3.75,u);
  const center=
    Math.sin(u*TAU*1.22+phase)*.60+
    Math.sin(u*TAU*2.73-phase*.6)*.18;

  const twist=Math.sin(u*TAU*1.9+phase);
  const width=.42+.30*Math.sin(u*Math.PI);

  return [
    x,
    center+v*width,
    -1.92+
      twist*.34+
      Math.cos(u*TAU*1.36+phase)*v*.42
  ];
}

function makeTriPattern(i,count){
  const t=(i%600)/599;
  const cross=seeded(i*9.73+.11)-.5;
  const p=trianglePoint(t,.98+cross*.22);
  const l=Math.max(.001,Math.hypot(p.x,p.y));

  return [
    p.x*(2.05+cross*.16),
    p.y*(2.05+cross*.16),
    -1.42+
      Math.sin(t*TAU*3.0)*.22+
      cross*.34
  ];
}

function makePrismPattern(i,count){
  const seed=seeded(i*4.71+.91);
  const u=(i%240)/239;
  const v=seeded(i*5.83+.28);
  const face=Math.floor(seed*8)%8;
  const a0=face/8*TAU+Math.PI/8;
  const a1=(face+1)/8*TAU+Math.PI/8;
  const r=3.82+(seeded(i*3.17)-.5)*.15;

  return [
    lerp(Math.cos(a0),Math.cos(a1),v)*r,
    lerp(Math.sin(a0),Math.sin(a1),v)*r,
    lerp(-16.0,1.05,u)
  ];
}

export function createContinuityField({
  source,
  tgbc,
  desk,
  count,
  logoFraction=.34
}){
  const bubble=new Float32Array(count*3);
  const ribbon=new Float32Array(count*3);
  const tri=new Float32Array(count*3);
  const prism=new Float32Array(count*3);
  const seed=new Float32Array(count);
  const role=new Float32Array(count);
  const order=new Float32Array(count);

  for(let i=0;i<count;i++){
    const s=seeded(i*8.71+.19);
    const r=seeded(i*2.93+.61);
    seed[i]=s;
    role[i]=r;

    const x=source[i*3];
    const y=source[i*3+1];

    order[i]=clamp(
      ((x+5.5)/11.0)*.62+
      ((y+3.2)/6.4)*.18+
      s*.20
    );

    const b=makeBubblePattern(i,count);
    const rb=makeRibbonPattern(i,count);
    const tr=makeTriPattern(i,count);
    const pr=makePrismPattern(i,count);

    bubble.set(b,i*3);
    ribbon.set(rb,i*3);
    tri.set(tr,i*3);
    prism.set(pr,i*3);
  }

  const geo=new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(source,3)
  );

  geo.setAttribute(
    'aTGBC',
    new THREE.BufferAttribute(tgbc,3)
  );

  geo.setAttribute(
    'aDesk',
    new THREE.BufferAttribute(desk,3)
  );

  geo.setAttribute(
    'aBubble',
    new THREE.BufferAttribute(bubble,3)
  );

  geo.setAttribute(
    'aRibbon',
    new THREE.BufferAttribute(ribbon,3)
  );

  geo.setAttribute(
    'aTri',
    new THREE.BufferAttribute(tri,3)
  );

  geo.setAttribute(
    'aPrism',
    new THREE.BufferAttribute(prism,3)
  );

  geo.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed,1)
  );

  geo.setAttribute(
    'aRole',
    new THREE.BufferAttribute(role,1)
  );

  geo.setAttribute(
    'aOrder',
    new THREE.BufferAttribute(order,1)
  );

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uBuild:{value:0},
      uPattern:{value:0},
      uDesk:{value:0},
      uPrism:{value:0},
      uVeil:{value:0},
      uFlow:{value:0},
      uAlpha:{value:0},
      uLogoAlpha:{value:1},
      uLogoFraction:{value:logoFraction}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute vec3 aTGBC;
      attribute vec3 aDesk;
      attribute vec3 aBubble;
      attribute vec3 aRibbon;
      attribute vec3 aTri;
      attribute vec3 aPrism;
      attribute float aSeed;
      attribute float aRole;
      attribute float aOrder;

      uniform float uBuild;
      uniform float uPattern;
      uniform float uDesk;
      uniform float uPrism;
      uniform float uVeil;
      uniform float uFlow;
      uniform float uAlpha;
      uniform float uLogoAlpha;
      uniform float uLogoFraction;

      varying vec3 vColor;
      varying float vAlpha;

      vec3 patternAt(float stage){
        if(stage<1.0){
          return mix(
            aBubble,
            aRibbon,
            smoothstep(0.0,1.0,stage)
          );
        }

        return mix(
          aRibbon,
          aTri,
          smoothstep(1.0,2.0,stage)
        );
      }

      void main(){
        float isLogo=
          1.0-
          step(
            uLogoFraction,
            aRole
          );

        float local=
          smoothstep(
            aOrder-.11,
            aOrder+.21,
            uBuild
          );

        float phase=
          aSeed*6.28318530718;

        vec3 bgTarget=
          patternAt(
            uPattern
          );

        vec3 logoTarget=
          mix(
            aTGBC,
            aDesk,
            smoothstep(
              0.0,
              1.0,
              uDesk
            )
          );

        vec3 target=
          mix(
            bgTarget,
            logoTarget,
            isLogo
          );

        vec3 p=
          mix(
            position,
            target,
            local
          );

        // Procedural motion exists in every state, but settles to tiny deviations
        // when particles are carrying the logo silhouette.
        float amp=
          mix(
            .038+.085*aSeed,
            .006+.018*aSeed,
            isLogo
          );

        vec3 field=vec3(
          sin(
            p.x*1.29+
            p.y*.61+
            phase+
            uFlow*1.17
          ),
          cos(
            p.x*.74-
            p.y*1.58+
            phase*1.31+
            uFlow*.83
          ),
          sin(
            p.x*.47+
            p.y*.92+
            phase*1.77-
            uFlow*.69
          )
        );

        p+=
          field*
          amp*
          (.40+.60*local);

        // Structured particle veil: the CURRENT pattern folds forward.
        // Nothing new is spawned and nothing becomes a neon arc.
        float veil=
          uVeil*
          (1.0-isLogo);

        vec3 veilP=p;
        veilP.xy*=mix(1.0,.48,veil);
        veilP.y+=
          sin(
            p.x*1.4+
            phase+
            uFlow*.61
          )*
          veil*
          .13;

        veilP.z=
          mix(
            p.z,
            .54+
            (aSeed-.5)*.24,
            veil
          );

        p=mix(
          p,
          veilP,
          veil
        );

        float prismLocal=
          smoothstep(
            aOrder*.66,
            aOrder*.66+.31,
            uPrism
          )*
          (1.0-isLogo);

        p=mix(
          p,
          aPrism,
          prismLocal
        );

        vec4 mv=
          modelViewMatrix*
          vec4(p,1.0);

        gl_Position=
          projectionMatrix*
          mv;

        float travel=
          sin(
            local*3.14159265
          );

        gl_PointSize=
          (1.00+aSeed*2.25)*
          (1.0+travel*.18)*
          (1.0+veil*.10);

        vec3 blue=
          vec3(.035,.42,1.0);

        vec3 cyan=
          vec3(.00,.79,.92);

        vec3 green=
          vec3(.00,.90,.48);

        float ct=
          clamp(
            .72*aSeed+
            .28*
            clamp(
              (p.x+4.0)/8.0,
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

        vColor=
          mix(
            brand*.78,
            brand,
            isLogo
          );

        float roleAlpha=
          mix(
            1.0,
            uLogoAlpha,
            isLogo
          );

        vAlpha=
          uAlpha*
          roleAlpha*
          local*
          (
            isLogo>.5
            ? (.18+aSeed*.48)
            : (.07+aSeed*.30)
          );
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
            .42,
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
  points.renderOrder=28;
  points.visible=false;

  return points;
}

export function setContinuity(
  field,
  {
    build=0,
    pattern=0,
    desk=0,
    prism=0,
    veil=0,
    flow=0,
    alpha=1,
    foreground=false,
    logoAlpha=1
  }={}
){
  if(!field)return;

  const u=
    field.material.uniforms;

  u.uBuild.value=clamp(build);
  u.uPattern.value=clamp(pattern,0,2);
  u.uDesk.value=clamp(desk);
  u.uPrism.value=clamp(prism);
  u.uVeil.value=clamp(veil);
  u.uFlow.value=flow;
  u.uAlpha.value=clamp(alpha);
  u.uLogoAlpha.value=clamp(logoAlpha);

  field.renderOrder=
    foreground?70:28;

  field.visible=
    alpha>.001;
}
