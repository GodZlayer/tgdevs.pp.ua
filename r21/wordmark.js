import * as THREE from 'three';

function shader(texture,ratio,height){
  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uAlpha:{value:0},
      uReveal:{value:0},
      uSweep:{value:0},
      uTexel:{
        value:new THREE.Vector2(
          1/Math.max(1,texture.image.width||1024),
          1/Math.max(1,texture.image.height||256)
        )
      }
    },
    transparent:true,
    depthWrite:false,
    toneMapped:false,
    vertexShader:`
      varying vec2 vUv;

      void main(){
        vUv=uv;
        gl_Position=
          projectionMatrix*
          modelViewMatrix*
          vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D uMap;
      uniform float uAlpha;
      uniform float uReveal;
      uniform float uSweep;
      uniform vec2 uTexel;

      varying vec2 vUv;

      float A(vec2 uv){
        return texture2D(
          uMap,
          uv
        ).a;
      }

      void main(){
        vec4 px=
          texture2D(
            uMap,
            vUv
          );

        float a=px.a;

        float around=0.0;
        around=max(around,A(vUv+vec2( uTexel.x*2.0,0.0)));
        around=max(around,A(vUv+vec2(-uTexel.x*2.0,0.0)));
        around=max(around,A(vUv+vec2(0.0, uTexel.y*2.0)));
        around=max(around,A(vUv+vec2(0.0,-uTexel.y*2.0)));
        around=max(around,A(vUv+vec2( uTexel.x*1.4, uTexel.y*1.4)));
        around=max(around,A(vUv+vec2(-uTexel.x*1.4, uTexel.y*1.4)));
        around=max(around,A(vUv+vec2( uTexel.x*1.4,-uTexel.y*1.4)));
        around=max(around,A(vUv+vec2(-uTexel.x*1.4,-uTexel.y*1.4)));

        float outer=
          clamp(
            around-a,
            0.0,
            1.0
          );

        float edge=
          smoothstep(
            .0,
            .55,
            outer
          );

        float reveal=
          smoothstep(
            vUv.x-.035,
            vUv.x+.018,
            uReveal
          );

        float sweep=
          exp(
            -pow(
              (vUv.x-uSweep)*23.0,
              2.0
            )
          );

        // Preserve the official raster exactly in the face.
        vec3 face=px.rgb;

        // Edge is subtle and optical, not a fake neon outline.
        vec3 bevel=
          mix(
            vec3(.045,.33,.62),
            vec3(.08,.84,.94),
            vUv.x
          );

        vec3 col=
          mix(
            bevel,
            face,
            a
          );

        col+=
          vec3(1.0)*
          sweep*
          a*
          .16;

        float outA=
          max(
            a,
            edge*.52
          )*
          reveal*
          uAlpha;

        if(outA<.003)discard;

        gl_FragColor=
          vec4(
            min(col,vec3(1.0)),
            outA
          );
      }
    `
  });

  const geo=
    new THREE.PlaneGeometry(
      height*ratio,
      height
    );

  const mesh=
    new THREE.Mesh(
      geo,
      mat
    );

  mesh.renderOrder=56;
  return mesh;
}

export function createDeskWordmark(texture){
  texture.colorSpace=
    THREE.SRGBColorSpace;

  texture.minFilter=
    THREE.LinearMipmapLinearFilter;

  texture.magFilter=
    THREE.LinearFilter;

  const ratio=
    898/190;

  const height=.62;

  const root=
    new THREE.Group();

  const backMat=
    new THREE.MeshBasicMaterial({
      map:texture,
      color:0x061018,
      transparent:true,
      opacity:0,
      depthWrite:false
    });

  backMat.toneMapped=false;

  const back=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        height*ratio,
        height
      ),
      backMat
    );

  back.position.z=-.032;
  back.scale.set(
    1.012,
    1.036,
    1
  );
  back.renderOrder=54;

  const front=
    shader(
      texture,
      ratio,
      height
    );

  front.position.z=.018;

  root.add(
    back,
    front
  );

  root.userData={
    front,
    back,
    width:height*ratio,
    height,
    ratio
  };

  root.visible=false;
  return root;
}

export function setDeskWordmark(
  root,
  {
    alpha=0,
    reveal=0,
    sweep=0
  }={}
){
  if(!root)return;

  root.visible=
    alpha>.001;

  const {
    front,
    back
  }=
    root.userData;

  front.material.uniforms
    .uAlpha.value=alpha;

  front.material.uniforms
    .uReveal.value=reveal;

  front.material.uniforms
    .uSweep.value=sweep;

  back.material.opacity=
    alpha*.34;
}
