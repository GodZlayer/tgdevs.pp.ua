import * as THREE from 'three';
import { lerp, seeded, TAU } from './motion.js';

export function createApiCycle(){
  const root=new THREE.Group();
  const count=360;
  const arr=new Float32Array(count*3);

  for(let i=0;i<count;i++){
    const t=i/(count-1);
    const a=Math.PI/2-t*TAU;
    arr[i*3]=Math.cos(a)*.625;
    arr[i*3+1]=Math.sin(a)*.625;
    arr[i*3+2]=.13;
  }

  const geo=new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(arr,3)
  );
  geo.setDrawRange(0,0);

  const mat=new THREE.PointsMaterial({
    color:0x00d8ff,
    size:.041,
    sizeAttenuation:true,
    transparent:true,
    opacity:0,
    blending:THREE.AdditiveBlending,
    depthWrite:false
  });

  mat.toneMapped=false;

  const path=new THREE.Points(geo,mat);
  path.renderOrder=23;
  root.add(path);

  const bubbles=[];

  for(let i=0;i<6;i++){
    const a=Math.PI/2-(i+.5)*Math.PI/3;
    const group=new THREE.Group();

    group.position.set(
      Math.cos(a)*.865,
      Math.sin(a)*.865,
      .15
    );

    const haloMat=new THREE.MeshBasicMaterial({
      color:i<3?0x00c9f4:0x00ed83,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });

    haloMat.toneMapped=false;

    const halo=new THREE.Mesh(
      new THREE.SphereGeometry(.16,18,12),
      haloMat
    );

    halo.scale.setScalar(.15);
    group.add(halo);

    bubbles.push({group,halo});
    root.add(group);
  }

  const runnerMat=new THREE.MeshBasicMaterial({
    color:0xecffff,
    transparent:true,
    opacity:0,
    blending:THREE.AdditiveBlending,
    depthWrite:false
  });

  runnerMat.toneMapped=false;

  const runner=new THREE.Mesh(
    new THREE.SphereGeometry(.050,16,10),
    runnerMat
  );

  runner.renderOrder=26;
  root.add(runner);

  root.userData={
    path,
    bubbles,
    runner,
    count
  };

  root.visible=false;
  return root;
}

export function createMatterMorph(source,count=15000){
  const cloud=new Float32Array(count*3);
  const prism=new Float32Array(count*3);
  const seed=new Float32Array(count);

  for(let i=0;i<count;i++){
    const u=seeded(i*2.317);
    const v=seeded(i*5.731+.31);
    const side=i%2;
    const sd=seeded(i*11.17+.7);

    seed[i]=sd;

    // Two opposing procedural wave sheets, centered behind the identity.
    // They deliberately reuse the same visual DNA as the opening cloud.
    const phase=(side?2.05:.28)+(sd-.5)*.72;

    const w1=Math.sin(
      u*(side?7.0:8.3)+
      v*3.1+
      phase
    );

    const w2=Math.sin(
      u*(side?15.0:16.2)-
      v*5.0+
      phase*.7
    );

    cloud[i*3]=
      lerp(-3.35,3.35,u)+
      (v-.5)*(side?-.82:.82);

    cloud[i*3+1]=
      (side?.18:-.18)+
      w1*.54+
      w2*.14+
      (v-.5)*.62;

    cloud[i*3+2]=
      -1.92+
      lerp(-.70,.32,v)+
      w2*.12;

    // Endless octagonal prism, formed by the same particle set.
    const face=Math.floor(sd*8.0)%8;
    const ft=v;
    const a0=face/8*TAU+Math.PI/8;
    const a1=(face+1)/8*TAU+Math.PI/8;
    const r=3.82+(seeded(i*4.71)-.5)*.16;

    prism[i*3]=
      lerp(Math.cos(a0),Math.cos(a1),ft)*r;

    prism[i*3+1]=
      lerp(Math.sin(a0),Math.sin(a1),ft)*r;

    prism[i*3+2]=
      lerp(-16.0,1.15,u);
  }

  const geo=new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(source,3)
  );

  geo.setAttribute(
    'aCloud',
    new THREE.BufferAttribute(cloud,3)
  );

  geo.setAttribute(
    'aPrism',
    new THREE.BufferAttribute(prism,3)
  );

  geo.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed,1)
  );

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uCloud:{value:0},
      uPrism:{value:0},
      uAlpha:{value:0},
      uBirth:{value:0},
      uFlow:{value:0},
      uCover:{value:0},
      uCoverCenter:{value:new THREE.Vector2(0,0)}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute vec3 aCloud;
      attribute vec3 aPrism;
      attribute float aSeed;

      uniform float uCloud;
      uniform float uPrism;
      uniform float uBirth;
      uniform float uFlow;
      uniform float uCover;
      uniform vec2 uCoverCenter;

      varying vec3 vColor;
      varying float vAlpha;
      varying float vCover;

      float sat(float x){
        return clamp(x,0.0,1.0);
      }

      void main(){
        float phase=aSeed*6.28318530718;
        float born=smoothstep(
          aSeed*.52,
          aSeed*.52+.34,
          uBirth
        );

        // Each particle detaches on its own schedule instead of the whole cloud
        // fading in as one PNG-like object.
        float localCloud=smoothstep(
          aSeed*.22,
          aSeed*.22+.68,
          uCloud
        );

        // Blender-like procedural drift: a deterministic pseudo turbulence field.
        // uFlow comes exclusively from scroll, so stopping the scroll freezes it.
        vec3 flowA=vec3(
          sin(uFlow*1.37+phase+aCloud.y*1.73),
          cos(uFlow*.91+phase*1.71+aCloud.x*1.31),
          sin(uFlow*.63+phase*2.13+aCloud.x*.72-aCloud.y*.48)
        );

        vec3 flowB=vec3(
          cos(uFlow*.47+phase*2.41+aCloud.z*2.8),
          sin(uFlow*1.11+phase*.83+aCloud.x*.91),
          cos(uFlow*.79+phase*1.27+aCloud.y*1.64)
        );

        vec3 turbulence=
          flowA*(.035+.090*aSeed)+
          flowB*(.018+.052*(1.0-aSeed));

        vec3 cloudPos=aCloud+turbulence;

        // The trip from the UI into the cloud is curved, never a straight lerp.
        vec3 travel=mix(position,cloudPos,localCloud);
        float arc=sin(localCloud*3.14159265);

        travel.xy+=
          vec2(cos(phase),sin(phase))*
          arc*
          (.08+.32*aSeed);

        travel.z+=
          arc*
          (.12+.58*aSeed);

        // During TGBC -> TGDesk the same cloud physically advances toward camera,
        // crosses the logo, then returns behind it. This creates the wipe from matter,
        // not from opacity.
        float veilRadius=.30+1.62*fract(aSeed*7.371);
        float veilAngle=
          phase+
          uFlow*1.28+
          sin(phase*1.9+uFlow*.72)*.30;

        vec3 veil=vec3(
          uCoverCenter+
          vec2(cos(veilAngle),sin(veilAngle))*veilRadius,
          .74+.52*aSeed
        );

        veil.xy+=vec2(
          sin(uFlow*2.03+phase*2.7),
          cos(uFlow*1.77+phase*1.8)
        )*.12;

        vec3 pos=mix(
          travel,
          veil,
          smoothstep(.0,1.0,uCover)
        );

        // Only after the foreground veil returns to the background does the
        // background itself harden into the prism.
        float prismLocal=smoothstep(
          aSeed*.08,
          aSeed*.08+.82,
          uPrism
        );

        vec3 prismPos=aPrism;

        // Tiny living electrical/granular motion survives while the prism forms.
        prismPos.xy+=vec2(
          sin(uFlow*.83+phase+aPrism.z*.42),
          cos(uFlow*.71+phase*1.3+aPrism.z*.31)
        )*(.018+.032*aSeed);

        pos=mix(pos,prismPos,prismLocal);

        vec4 mv=modelViewMatrix*vec4(pos,1.0);
        gl_Position=projectionMatrix*mv;

        float coverBoost=1.0+uCover*(.75+aSeed*.75);

        gl_PointSize=
          (.72+aSeed*1.42)*
          coverBoost*
          (86.0/max(4.0,-mv.z+9.0));

        vec3 blue=vec3(.043,.486,1.0);
        vec3 cyan=vec3(.00,.80,.90);
        vec3 green=vec3(.00,.92,.46);

        float ct=sat(
          .72*aSeed+
          .28*sat((cloudPos.x+3.4)/6.8)
        );

        vColor=ct<.55
          ? mix(blue,cyan,ct/.55)
          : mix(cyan,green,(ct-.55)/.45);

        vAlpha=
          born*
          (.040+aSeed*.145)*
          mix(1.0,2.65,uCover);

        vCover=uCover;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vCover;

      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float r=dot(q,q);

        if(r>1.0)discard;

        float soft=
          1.0-
          smoothstep(.30,1.0,r);

        float hot=
          (1.0-smoothstep(.0,.24,r))*
          vCover*.28;

        vec3 col=min(
          vec3(1.0),
          vColor+hot
        );

        gl_FragColor=
          vec4(
            col,
            uAlpha*vAlpha*soft
          );
      }
    `
  });

  mat.toneMapped=false;

  const pts=new THREE.Points(geo,mat);
  pts.renderOrder=-2;
  pts.frustumCulled=false;

  return pts;
}
