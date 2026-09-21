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

    // Same two wave families as the opening cloud,
    // but both are now centered behind the logo.
    const wave1=Math.sin(
      u*(side?7.0:8.3)+
      v*3.1+
      (side?2.05:.28)
    );

    const wave2=Math.sin(
      u*(side?15.0:16.2)-
      v*5.0+
      sd*2.1
    );

    cloud[i*3]=
      lerp(-3.05,3.05,u)+
      (v-.5)*(side?-.72:.72);

    cloud[i*3+1]=
      (side?.24:-.18)+
      wave1*.48+
      wave2*.13+
      (v-.5)*.58;

    cloud[i*3+2]=
      -1.80+
      lerp(-.78,.35,v)+
      wave2*.10;

    // An endless octagonal prism: no visible end cap,
    // just matter continuing through depth.
    const face=Math.floor(sd*8.0)%8;
    const ft=v;
    const a0=face/8*TAU+Math.PI/8;
    const a1=(face+1)/8*TAU+Math.PI/8;
    const r=3.75+(seeded(i*4.71)-.5)*.12;

    prism[i*3]=
      lerp(Math.cos(a0),Math.cos(a1),ft)*r;

    prism[i*3+1]=
      lerp(Math.sin(a0),Math.sin(a1),ft)*r;

    prism[i*3+2]=
      lerp(-15.0,1.1,u);
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
      uAlpha:{value:0}
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

      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        vec3 p=mix(
          position,
          aCloud,
          smoothstep(0.0,1.0,uCloud)
        );

        p=mix(
          p,
          aPrism,
          smoothstep(0.0,1.0,uPrism)
        );

        vec4 mv=modelViewMatrix*vec4(p,1.0);

        gl_Position=projectionMatrix*mv;

        // Keep the cloud visibly particulate. The previous scale turned
        // thousands of particles into one opaque cyan slab.
        gl_PointSize=
          (.72+aSeed*1.35)*
          (82.0/max(4.0,-mv.z+9.0));

        vec3 blue=vec3(.043,.486,1.0);
        vec3 cyan=vec3(.00,.80,.90);
        vec3 green=vec3(.00,.92,.46);

        float t=aSeed;

        vColor=t<.55
          ? mix(blue,cyan,t/.55)
          : mix(cyan,green,(t-.55)/.45);

        vAlpha=.045+aSeed*.135;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float r=dot(q,q);

        if(r>1.0)discard;

        float soft=
          1.0-
          smoothstep(.25,1.0,r);

        gl_FragColor=
          vec4(
            vColor,
            uAlpha*vAlpha*soft
          );
      }
    `
  });

  mat.toneMapped=false;

  const pts=new THREE.Points(geo,mat);
  pts.renderOrder=-1;
  pts.frustumCulled=false;
  return pts;
}
