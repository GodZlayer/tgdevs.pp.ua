import * as THREE from 'three';
import { clamp, lerp, seeded, TAU } from '../r20/motion.js';

// Calibrated from the 2048x2048 master supplied in chat:
// symbol bbox ~= 1250x1171, wordmark face ratio ~= 4.72,
// blue/cyan/green clusters centered around RGB
// (1,75,191), (24,218,248), (23,220,169).

const C_BLUE=new THREE.Color(0x014bbf);
const C_CYAN=new THREE.Color(0x18daf8);
const C_GREEN=new THREE.Color(0x17dca9);
const C_ICE=new THREE.Color(0xeaf7ff);

function physical(color,emissive=0x001018){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness:.11,
    metalness:.035,
    clearcoat:1,
    clearcoatRoughness:.055,
    transmission:0,
    thickness:.06,
    ior:1.44,
    emissive,
    emissiveIntensity:.22,
    transparent:true,
    opacity:1
  });
}

function glowShell(color){
  return new THREE.ShaderMaterial({
    uniforms:{
      uColor:{value:new THREE.Color(color)},
      uAlpha:{value:0}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      varying vec3 vN;
      varying vec3 vV;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        vN=normalize(normalMatrix*normal);
        vV=normalize(-mv.xyz);
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader:`
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec3 vN;
      varying vec3 vV;
      void main(){
        float fres=pow(1.0-max(0.0,dot(vN,vV)),2.4);
        gl_FragColor=vec4(uColor,fres*uAlpha*.42);
      }
    `
  });
}

function orb(radius,color,segments=64){
  const root=new THREE.Group();

  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(radius,segments,Math.round(segments*.70)),
    physical(color)
  );
  root.add(mesh);

  const shell=new THREE.Mesh(
    new THREE.SphereGeometry(radius*1.025,segments,Math.round(segments*.70)),
    glowShell(color)
  );
  shell.renderOrder=64;
  root.add(shell);

  const highlight=new THREE.Mesh(
    new THREE.SphereGeometry(radius*.23,24,16),
    new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.58,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    })
  );
  highlight.material.toneMapped=false;
  highlight.position.set(-radius*.34,radius*.36,radius*.86);
  highlight.scale.set(1.0,.54,.12);
  highlight.renderOrder=65;
  root.add(highlight);

  root.userData={mesh,shell,highlight,radius};
  return root;
}

function triVertices(r=.94){
  return [
    new THREE.Vector2(0,r),
    new THREE.Vector2(Math.cos(-Math.PI/6)*r,Math.sin(-Math.PI/6)*r),
    new THREE.Vector2(Math.cos(-5*Math.PI/6)*r,Math.sin(-5*Math.PI/6)*r)
  ];
}

function qBezier(a,b,c,t,target=new THREE.Vector2()){
  const mt=1-t;
  target.set(
    mt*mt*a.x+2*mt*t*b.x+t*t*c.x,
    mt*mt*a.y+2*mt*t*b.y+t*t*c.y
  );
  return target;
}

function outwardControl(a,b,strength=.245,target=new THREE.Vector2()){
  const mx=(a.x+b.x)*.5;
  const my=(a.y+b.y)*.5;
  const len=Math.max(.001,Math.hypot(mx,my));
  target.set(
    mx+(mx/len)*strength,
    my+(my/len)*strength
  );
  return target;
}

export function trianglePathPoint(t,r=.94,target=new THREE.Vector3()){
  t=((t%1)+1)%1;
  const verts=triVertices(r);
  const s=t*3;
  const i=Math.floor(s)%3;
  const f=s-Math.floor(s);
  const a=verts[i];
  const b=verts[(i+1)%3];
  const c=outwardControl(a,b,.245);
  const p=qBezier(a,c,b,f);
  target.set(p.x,p.y,0);
  return target;
}

function makeGuide(){
  const pts=[];
  for(let i=0;i<180;i++){
    pts.push(trianglePathPoint(i/180,.94,new THREE.Vector3()));
  }

  const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal',.42);
  const geo=new THREE.TubeGeometry(curve,240,.013,8,true);
  const mat=new THREE.MeshPhysicalMaterial({
    color:0x2ae7f4,
    emissive:0x003a43,
    emissiveIntensity:.5,
    roughness:.18,
    metalness:.08,
    transparent:true,
    opacity:.13,
    depthWrite:false,
    clearcoat:1,
    clearcoatRoughness:.08
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.renderOrder=47;
  return mesh;
}

function makeTrail(agentIndex,color,count=900){
  // The trail is not a generic ribbon. It is a persistent particle version of
  // the exact TGDesk comet blade: thick at the head, convex on the outside,
  // tighter on the inside and continuously tapering to one sharp tip.
  //
  // Important: these particles NEVER collapse into the core. Absorption is
  // represented by the separate absorb field. Therefore the visible comet tail
  // keeps the same TGDesk silhouette at every point of the triangular route.
  const cols=9;
  const rows=Math.max(32,Math.ceil(count/cols));
  const actual=rows*cols;

  const geo=new THREE.BufferGeometry();
  const lag=new Float32Array(actual);
  const cross=new Float32Array(actual);
  const seed=new Float32Array(actual);

  let k=0;
  for(let row=0;row<rows;row++){
    const baseLag=row/Math.max(1,rows-1);

    for(let col=0;col<cols;col++){
      const s=seeded(k*11.73+agentIndex*13.7);
      const across=cols===1?0:(col/(cols-1))*2-1;

      // Tiny grain breaks the computer-perfect lattice without changing shape.
      lag[k]=clamp(
        baseLag+
        (s-.5)*(.34/rows),
        0,
        1
      );

      cross[k]=clamp(
        across+
        (seeded(k*7.17+agentIndex*31.1)-.5)*.055,
        -1,
        1
      );

      seed[k]=s;
      k++;
    }
  }

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array(actual*3),
      3
    )
  );

  geo.setAttribute(
    'aLag',
    new THREE.BufferAttribute(lag,1)
  );

  geo.setAttribute(
    'aCross',
    new THREE.BufferAttribute(cross,1)
  );

  geo.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed,1)
  );

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uPhase:{value:agentIndex/3},
      uAlpha:{value:0},
      uFlow:{value:0},
      uColor:{value:new THREE.Color(color)},
      uSpan:{value:.292}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute float aLag;
      attribute float aCross;
      attribute float aSeed;

      uniform float uPhase;
      uniform float uAlpha;
      uniform float uFlow;
      uniform float uSpan;

      varying vec3 vColor;
      varying float vAlpha;

      vec2 V0(){return vec2(0.0,.94);}
      vec2 V1(){return vec2(.814063,-.47);}
      vec2 V2(){return vec2(-.814063,-.47);}

      vec2 control(vec2 a,vec2 b){
        vec2 m=(a+b)*.5;
        return m+normalize(m)*.245;
      }

      vec2 bez(vec2 a,vec2 c,vec2 b,float t){
        float mt=1.0-t;
        return mt*mt*a+2.0*mt*t*c+t*t*b;
      }

      vec2 path(float t){
        t=fract(t+10.0);
        float s=t*3.0;
        float f=fract(s);
        int seg=int(floor(s));

        vec2 a;
        vec2 b;

        if(seg==0){
          a=V0();b=V1();
        }else if(seg==1){
          a=V1();b=V2();
        }else{
          a=V2();b=V0();
        }

        return bez(
          a,
          control(a,b),
          b,
          f
        );
      }

      void main(){
        // aLag: 0 = directly under the comet head, 1 = pointed tail tip.
        float l=
          clamp(
            aLag,
            0.0,
            1.0
          );

        float longitudinalJitter=
          (aSeed-.5)*.0018;

        float t=
          uPhase-
          (l+longitudinalJitter)*
          uSpan;

        vec2 p=path(t);
        vec2 p0=path(t-.0018);
        vec2 p1=path(t+.0018);

        vec2 tangent=
          normalize(
            p1-p0
          );

        vec2 normal=
          vec2(
            -tangent.y,
            tangent.x
          );

        // Canonical TGDesk comet profile.
        // The outside edge is fuller; the inside edge is leaner. This recreates
        // the original curved blade instead of a symmetric generic ribbon.
        float body=
          pow(
            max(
              0.0,
              1.0-l
            ),
            .68
          );

        float shoulder=
          .88+
          .22*
          sin(
            (1.0-l)*
            3.14159265
          );

        float outerWidth=
          .143*
          body*
          shoulder;

        float innerWidth=
          .084*
          body*
          (
            .92+
            .08*
            sin(
              (1.0-l)*
              3.14159265
            )
          );

        float width=
          aCross>=0.0
          ? outerWidth
          : innerWidth;

        p+=
          normal*
          aCross*
          width;

        // A controlled bow gives the silhouette the same "comet blade" tension
        // as the logo while keeping the pointed tip locked to the route.
        float bow=
          sin(
            l*
            3.14159265
          )*
          .020*
          (
            .35+
            .65*
            (1.0-l)
          );

        p+=
          normal*
          bow;

        // Only micro-depth grain is allowed. It gives 3D life without deforming
        // the recognizable tail silhouette.
        float z=
          .095+
          sin(
            aSeed*6.2831853+
            uFlow*.47+
            l*4.2
          )*
          .016*
          sin(
            l*
            3.14159265
          );

        vec4 mv=
          modelViewMatrix*
          vec4(
            p,
            z,
            1.0
          );

        gl_Position=
          projectionMatrix*
          mv;

        float headEnergy=
          pow(
            1.0-l,
            .42
          );

        gl_PointSize=
          mix(
            1.15,
            3.15,
            headEnergy
          )*
          (
            .88+
            .24*aSeed
          );

        // Tail remains readable right to the sharp tip, but the tip itself
        // converges into a clean single-point termination.
        float tip=
          1.0-
          smoothstep(
            .965,
            1.0,
            l
          );

        float edgeDensity=
          mix(
            .78,
            1.0,
            1.0-abs(aCross)
          );

        vColor=uColor;

        vAlpha=
          uAlpha*
          tip*
          edgeDensity*
          (
            .34+
            .52*aSeed
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
            .30,
            1.0,
            r
          );

        float hot=
          1.0-
          smoothstep(
            0.0,
            .16,
            r
          );

        gl_FragColor=
          vec4(
            min(
              vColor+
              hot*.14,
              vec3(1.0)
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

  pts.frustumCulled=false;
  pts.renderOrder=61+agentIndex;

  return pts;
}

function bladeProfile(l){
  const body=Math.pow(Math.max(0,1-l),.66);
  const shoulder=.90+.20*Math.sin((1-l)*Math.PI);
  return {
    outer:.152*body*shoulder,
    inner:.086*body*(.93+.07*Math.sin((1-l)*Math.PI))
  };
}

function bladeVertexColor(color,l,outer){
  const base=new THREE.Color(color);
  const cyan=new THREE.Color(0x18daf8);
  const ice=new THREE.Color(0xe9fdff);

  const out=base.clone().lerp(cyan,.26+.22*(1-l));
  if(outer>0) out.lerp(ice,.08+.10*(1-l));
  return out;
}

function makeSolidBlade(agentIndex,color,segments=76){
  // 4 vertices per longitudinal step:
  // outer-front, inner-front, outer-back, inner-back.
  const rows=segments+1;
  const vertsPerRow=4;
  const positions=new Float32Array(rows*vertsPerRow*3);
  const colors=new Float32Array(rows*vertsPerRow*3);
  const indices=[];

  for(let i=0;i<segments;i++){
    const a=i*vertsPerRow;
    const b=(i+1)*vertsPerRow;

    // front
    indices.push(a,b,a+1, b,b+1,a+1);
    // back
    indices.push(a+2,a+3,b+2, b+2,a+3,b+3);
    // outer wall
    indices.push(a,a+2,b, b,a+2,b+2);
    // inner wall
    indices.push(a+1,b+1,a+3, b+1,b+3,a+3);
  }

  // caps
  indices.push(0,1,2, 2,1,3);
  const e=segments*vertsPerRow;
  indices.push(e,e+2,e+1, e+2,e+3,e+1);

  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geo.setIndex(indices);

  const mat=new THREE.MeshPhysicalMaterial({
    vertexColors:true,
    roughness:.09,
    metalness:.035,
    clearcoat:1,
    clearcoatRoughness:.045,
    emissive:new THREE.Color(color).multiplyScalar(.12),
    emissiveIntensity:.42,
    transparent:true,
    opacity:0,
    side:THREE.DoubleSide
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.renderOrder=55+agentIndex;
  mesh.frustumCulled=false;
  mesh.userData={
    agentIndex,
    color,
    segments,
    span:.292,
    phase:agentIndex/3
  };

  updateSolidBlade(mesh,agentIndex/3,0);
  return mesh;
}

function updateSolidBlade(mesh,phase,flow=0){
  if(!mesh)return;

  const {
    color,
    segments,
    span
  }=mesh.userData;

  const pos=mesh.geometry.getAttribute('position');
  const col=mesh.geometry.getAttribute('color');

  const p=new THREE.Vector3();
  const p0=new THREE.Vector3();
  const p1=new THREE.Vector3();
  const tangent=new THREE.Vector2();
  const normal=new THREE.Vector2();

  for(let i=0;i<=segments;i++){
    const l=i/segments;
    const t=phase-l*span;

    trianglePathPoint(t,.94,p);
    trianglePathPoint(t-.0018,.94,p0);
    trianglePathPoint(t+.0018,.94,p1);

    tangent.set(
      p1.x-p0.x,
      p1.y-p0.y
    ).normalize();

    normal.set(
      -tangent.y,
      tangent.x
    );

    const profile=bladeProfile(l);
    const bow=
      Math.sin(l*Math.PI)*
      .019*
      (.34+.66*(1-l));

    const ox=p.x+normal.x*(profile.outer+bow);
    const oy=p.y+normal.y*(profile.outer+bow);
    const ix=p.x-normal.x*(profile.inner-bow*.18);
    const iy=p.y-normal.y*(profile.inner-bow*.18);

    const frontZ=
      .070+
      Math.sin(flow*.31+l*2.4)*
      .0035*
      Math.sin(l*Math.PI);

    const backZ=-.015;

    const base=i*4;

    pos.setXYZ(base,ox,oy,frontZ);
    pos.setXYZ(base+1,ix,iy,frontZ);
    pos.setXYZ(base+2,ox,oy,backZ);
    pos.setXYZ(base+3,ix,iy,backZ);

    const cOuter=bladeVertexColor(color,l,1);
    const cInner=bladeVertexColor(color,l,-1);

    col.setXYZ(base,cOuter.r,cOuter.g,cOuter.b);
    col.setXYZ(base+1,cInner.r,cInner.g,cInner.b);
    col.setXYZ(base+2,cOuter.r*.72,cOuter.g*.72,cOuter.b*.72);
    col.setXYZ(base+3,cInner.r*.68,cInner.g*.68,cInner.b*.68);
  }

  pos.needsUpdate=true;
  col.needsUpdate=true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.attributes.normal.needsUpdate=true;
  mesh.userData.phase=phase;
}

function makeAbsorbField(count=260){
  const geo=new THREE.BufferGeometry();
  const angle=new Float32Array(count);
  const radius=new Float32Array(count);
  const seed=new Float32Array(count);
  const position=new Float32Array(count*3);

  for(let i=0;i<count;i++){
    angle[i]=seeded(i*2.73)*TAU;
    radius[i]=.17+seeded(i*7.31)*.30;
    seed[i]=seeded(i*13.11+.4);
  }

  geo.setAttribute('position',new THREE.BufferAttribute(position,3));
  geo.setAttribute('aAngle',new THREE.BufferAttribute(angle,1));
  geo.setAttribute('aRadius',new THREE.BufferAttribute(radius,1));
  geo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uAlpha:{value:0},
      uFlow:{value:0}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute float aAngle;
      attribute float aRadius;
      attribute float aSeed;

      uniform float uFlow;

      varying float vAlpha;

      void main(){
        float cycle=fract(aSeed+uFlow*.19);
        float r=aRadius*(1.0-cycle);
        float a=aAngle+uFlow*(.55+aSeed*.45)+cycle*4.5;

        vec3 p=vec3(
          cos(a)*r,
          sin(a)*r,
          .20+sin(a*1.7)*.025
        );

        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;

        gl_PointSize=
          1.0+
          2.0*(1.0-cycle);

        vAlpha=
          sin(cycle*3.14159265)*
          (.14+.42*aSeed);
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying float vAlpha;
      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float r=dot(q,q);
        if(r>1.0)discard;
        gl_FragColor=vec4(
          .20,.92,1.0,
          uAlpha*vAlpha*(1.0-r)
        );
      }
    `
  });

  mat.toneMapped=false;

  const pts=new THREE.Points(geo,mat);
  pts.frustumCulled=false;
  pts.renderOrder=64;
  return pts;
}

export function createTGDeskSystemR22(){
  const root=new THREE.Group();

  const guide=makeGuide();
  root.add(guide);

  const core=orb(.425,0x10cff0,72);
  core.position.z=.08;
  root.add(core);

  const colors=[0x078ff0,0x11e1f4,0x13dca0];
  const nodes=[];
  const trails=[];
  const blades=[];

  for(let i=0;i<3;i++){
    const node=orb(.205,colors[i],56);
    const p=trianglePathPoint(i/3,.94);
    node.position.set(p.x,p.y,.13);
    root.add(node);
    nodes.push(node);

    const blade=makeSolidBlade(i,colors[i],76);
    root.add(blade);
    blades.push(blade);

    const trail=makeTrail(i,colors[i],900);
    root.add(trail);
    trails.push(trail);
  }

  const absorb=makeAbsorbField();
  root.add(absorb);

  root.userData={
    core,
    nodes,
    trails,
    blades,
    absorb,
    guide,
    halfWidth:1.08,
    halfHeight:1.12,
    canonicalHeight:2.24
  };

  root.visible=false;
  return root;
}

export function updateTGDeskSystemR22(
  root,
  {
    alpha=0,
    flow=0,
    motion=0,
    phase=0
  }={}
){
  if(!root)return;

  const a=clamp(alpha);
  const m=clamp(motion);

  root.visible=a>.001;

  const {
    core,
    nodes,
    trails,
    blades,
    absorb,
    guide
  }=root.userData;

  guide.material.opacity=
    a*(.015+.025*m);

  const speeds=[1.00,.925,1.075];
  const offsets=[0,1/3,2/3];

  const pulse=
    .5+
    .5*Math.sin(
      flow*2.15+
      .35
    );

  nodes.forEach((node,i)=>{
    const rest=offsets[i];
    const moving=
      phase*speeds[i]+offsets[i];

    const t=
      lerp(
        rest,
        moving,
        m
      );

    const p=
      trianglePathPoint(
        t,
        .94
      );

    node.position.set(
      p.x,
      p.y,
      .13+
      Math.sin(
        flow*(1.1+i*.17)+
        i*1.73
      )*
      .012*m
    );

    node.rotation.y=
      Math.sin(
        flow*.31+i
      )*
      .05*m;

    node.rotation.x=
      Math.cos(
        flow*.27+i*.7
      )*
      .035*m;

    node.scale.setScalar(
      1+
      Math.sin(
        flow*1.83+i*2.1
      )*
      .018*m
    );

    node.userData.mesh.material.opacity=a;
    node.userData.shell.material.uniforms.uAlpha.value=a;
    node.userData.highlight.material.opacity=.56*a;

    const blade=blades[i];
    updateSolidBlade(blade,t,flow);
    blade.material.opacity=a;
    blade.visible=a>.001;

    const trail=trails[i];
    trail.material.uniforms.uPhase.value=t;
    trail.material.uniforms.uAlpha.value=a*m*.78;
    trail.material.uniforms.uFlow.value=flow;
  });

  const coreScale=
    1+
    m*(.020+.024*pulse);

  core.scale.setScalar(coreScale);
  core.userData.mesh.material.opacity=a;
  core.userData.mesh.material.emissiveIntensity=
    .22+
    m*(.18+.20*pulse);

  core.userData.shell.material.uniforms.uAlpha.value=
    a*(.72+.28*m);

  core.userData.highlight.material.opacity=
    a*(.50+.10*pulse);

  absorb.material.uniforms.uAlpha.value=
    a*m;

  absorb.material.uniforms.uFlow.value=
    flow;
}

export function setTGDeskSystemOpacity(root,a){
  if(!root)return;
  const v=clamp(a);
  root.visible=v>.001;

  const {
    core,
    nodes,
    trails,
    blades,
    absorb,
    guide
  }=root.userData;

  core.userData.mesh.material.opacity=v;
  core.userData.shell.material.uniforms.uAlpha.value=v;
  core.userData.highlight.material.opacity=.56*v;

  nodes.forEach(n=>{
    n.userData.mesh.material.opacity=v;
    n.userData.shell.material.uniforms.uAlpha.value=v;
    n.userData.highlight.material.opacity=.56*v;
  });

  blades.forEach(b=>{
    b.material.opacity=v;
    b.visible=v>.001;
  });

  trails.forEach(t=>{
    t.material.uniforms.uAlpha.value=0;
  });

  absorb.material.uniforms.uAlpha.value=0;
  guide.material.opacity=.018*v;
}

export function createPremiumWordmarkR22(texture){
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=8;

  const ratio=898/190;
  const height=.62;
  const width=height*ratio;

  const root=new THREE.Group();

  // Exact official face. No contour reconstruction, no edge shader.
  const frontMat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    opacity:1,
    depthWrite:false,
    alphaTest:.006
  });
  frontMat.toneMapped=false;

  const front=new THREE.Mesh(
    new THREE.PlaneGeometry(width,height),
    frontMat
  );
  front.position.z=.075;
  front.renderOrder=58;

  // Layered exact-alpha extrusion. It keeps the supplied letterforms perfectly
  // while giving them real depth under the existing scene lighting.
  const depth=[];
  const layers=6;

  for(let i=0;i<layers;i++){
    const t=i/(layers-1);
    const mat=new THREE.MeshBasicMaterial({
      map:texture,
      color:new THREE.Color().lerpColors(
        new THREE.Color(0x07101c),
        new THREE.Color(0x45657c),
        .18+t*.22
      ),
      transparent:true,
      opacity:.18*(1-t*.58),
      depthWrite:false,
      alphaTest:.006
    });
    mat.toneMapped=false;

    const layer=new THREE.Mesh(
      new THREE.PlaneGeometry(width,height),
      mat
    );

    layer.position.set(
      .004*(1-t),
      -.003*(1-t),
      -.045+t*.085
    );
    layer.renderOrder=50+i;
    root.add(layer);
    depth.push(layer);
  }

  root.add(front);

  // Crisp specular face pass, clipped by the exact logo alpha.
  const shineMat=new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uAlpha:{value:0},
      uSweep:{value:0}
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    toneMapped:false,
    vertexShader:`
      varying vec2 vUv;
      void main(){
        vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D uMap;
      uniform float uAlpha;
      uniform float uSweep;
      varying vec2 vUv;

      void main(){
        vec4 px=texture2D(uMap,vUv);
        float band=exp(-pow((vUv.x-uSweep)*25.0,2.0));
        float top=pow(clamp(1.0-vUv.y,0.0,1.0),2.0);
        float shine=(band*.26+top*.035)*px.a*uAlpha;
        gl_FragColor=vec4(vec3(1.0),shine);
      }
    `
  });

  const shine=new THREE.Mesh(
    new THREE.PlaneGeometry(width,height),
    shineMat
  );
  shine.position.z=.082;
  shine.renderOrder=60;
  root.add(shine);

  root.userData={
    front,
    depth,
    shine,
    width,
    height,
    ratio
  };

  root.visible=false;
  return root;
}

export function updatePremiumWordmarkR22(
  root,
  {
    alpha=0,
    sweep=0
  }={}
){
  if(!root)return;

  const a=clamp(alpha);
  root.visible=a>.001;

  root.userData.front.material.opacity=a;

  root.userData.depth.forEach((m,i)=>{
    const t=i/Math.max(1,root.userData.depth.length-1);
    m.material.opacity=
      a*.18*(1-t*.58);
  });

  root.userData.shine.material.uniforms.uAlpha.value=a;
  root.userData.shine.material.uniforms.uSweep.value=sweep;
}
