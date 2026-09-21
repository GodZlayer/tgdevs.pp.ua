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
  // This field intentionally follows the exact grammar of createCloud()
  // from the opening TGDevs scene: two structured wave sheets, reveal order,
  // two sine frequencies, tiny circular points and scroll-driven flow.
  const data=new Float32Array(count*4);
  const prism=new Float32Array(count*3);

  for(let i=0;i<count;i++){
    const surface=i%2;
    const pair=i>>1;
    const u=(pair%180)/179;
    const d=(Math.floor(pair/180)%45)/44;
    const seed=seeded(i*1.73);

    data[i*4]=u;
    data[i*4+1]=d;
    data[i*4+2]=surface;
    data[i*4+3]=seed;

    const face=Math.floor(seed*8.0)%8;
    const a0=face/8*TAU+Math.PI/8;
    const a1=(face+1)/8*TAU+Math.PI/8;
    const r=3.82+(seeded(i*4.71)-.5)*.15;

    prism[i*3]=
      lerp(
        Math.cos(a0),
        Math.cos(a1),
        d
      )*r;

    prism[i*3+1]=
      lerp(
        Math.sin(a0),
        Math.sin(a1),
        d
      )*r;

    prism[i*3+2]=
      lerp(
        -16.0,
        1.10,
        u
      );
  }

  const geo=new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(source,3)
  );

  geo.setAttribute(
    'aData',
    new THREE.BufferAttribute(data,4)
  );

  geo.setAttribute(
    'aPrism',
    new THREE.BufferAttribute(prism,3)
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
      attribute vec4 aData;
      attribute vec3 aPrism;

      uniform float uCloud;
      uniform float uPrism;
      uniform float uAlpha;
      uniform float uBirth;
      uniform float uFlow;
      uniform float uCover;
      uniform vec2 uCoverCenter;

      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        float u=aData.x;
        float d=aData.y;
        float s=aData.z;
        float seed=aData.w;

        float reveal=
          s>.5
          ? 1.0-u
          : u;

        float born=
          smoothstep(
            reveal*.86,
            reveal*.86+.16,
            uBirth
          );

        float cloudT=
          smoothstep(
            reveal*.80,
            reveal*.80+.22,
            uCloud
          );

        float phase=
          (s>.5?2.1:.3)+
          (seed-.5)*.55;

        // EXACT visual DNA of the opening scene.
        float w1=sin(
          u*(s>.5?7.0:8.3)+
          d*3.1+
          phase+
          uFlow*1.3
        );

        float w2=sin(
          u*(s>.5?15.0:16.2)-
          d*5.0+
          phase*.7-
          uFlow*.72
        );

        vec3 wave=vec3(
          mix(-3.55,3.55,u)+
          (d-.5)*(s>.5?-.95:.85),

          // The two sheets share the same visual center in this second use.
          (s>.5?.16:-.16)+
          w1*.62+
          w2*.16+
          (d-.5)*.82,

          mix(-1.28,.58,d)+
          w2*.15
        );

        // Interface matter follows curved paths into the living cloud.
        vec3 pos=
          mix(
            position,
            wave,
            cloudT
          );

        float travel=
          sin(
            cloudT*3.14159265
          );

        pos.xy+=
          vec2(
            cos(phase*2.2),
            sin(phase*1.7)
          )*
          travel*
          (.025+.090*seed);

        pos.z+=
          travel*
          (.05+.18*seed);

        // Particle cover is still the same wave field.
        // It folds toward the identity and comes closer to camera;
        // it NEVER becomes circular neon strands.
        float fold=
          smoothstep(
            .0,
            1.0,
            uCover
          );

        vec3 coverPos=wave;

        coverPos.xy=
          uCoverCenter+
          (coverPos.xy-uCoverCenter)*
          mix(1.0,.43,fold);

        coverPos.x+=
          (s>.5?-1.0:1.0)*
          sin(
            d*3.14159265+
            uFlow*.74+
            phase
          )*
          fold*
          .18;

        coverPos.y+=
          cos(
            u*8.0+
            uFlow*.92+
            phase
          )*
          fold*
          .12;

        coverPos.z=
          mix(
            wave.z,
            .62+
            (d-.5)*.32,
            fold
          );

        pos=
          mix(
            pos,
            coverPos,
            fold
          );

        // The SAME particles become the prism after returning to background.
        float prismLocal=
          smoothstep(
            reveal*.72,
            reveal*.72+.32,
            uPrism
          );

        vec3 prismPos=aPrism;

        prismPos.xy+=
          vec2(
            sin(
              uFlow*.83+
              phase+
              aPrism.z*.42
            ),
            cos(
              uFlow*.71+
              phase*1.3+
              aPrism.z*.31
            )
          )*
          (.010+.020*d);

        pos=
          mix(
            pos,
            prismPos,
            prismLocal
          );

        vec4 mv=
          modelViewMatrix*
          vec4(pos,1.0);

        gl_Position=
          projectionMatrix*
          mv;

        // Keep the exact delicate scale from the opening scene.
        gl_PointSize=
          (1.15+d*2.60)*
          mix(
            1.0,
            1.08,
            fold
          );

        float edge=
          sin(
            3.14159265*u
          );

        vAlpha=
          born*
          uAlpha*
          edge*
          (.06+d*.38);

        vec3 blue=
          vec3(.043,.486,1.0);

        vec3 cyan=
          vec3(0.0,.78,.85);

        vec3 green=
          vec3(0.0,.90,.42);

        float ct=
          s>.5
          ? 1.0-u
          : u;

        vColor=
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

  const pts=
    new THREE.Points(
      geo,
      mat
    );

  pts.renderOrder=-2;
  pts.frustumCulled=false;

  return pts;
}
