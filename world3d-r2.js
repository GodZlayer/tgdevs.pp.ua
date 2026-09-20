import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;

function gradientMaterial(){
  return new THREE.MeshPhysicalMaterial({
    color:0xffffff,roughness:.24,metalness:.06,clearcoat:.72,
    clearcoatRoughness:.16,vertexColors:true,transparent:true,opacity:1
  });
}

function applyGradient(geometry,minX=-1,maxX=1){
  const pos=geometry.getAttribute('position');
  const colors=new Float32Array(pos.count*3);
  const c1=new THREE.Color('#0b7cff');
  const c2=new THREE.Color('#00c7d9');
  const c3=new THREE.Color('#00e66b');
  const c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const t=clamp((pos.getX(i)-minX)/(maxX-minX));
    if(t<.56)c.copy(c1).lerp(c2,t/.56);
    else c.copy(c2).lerp(c3,(t-.56)/.44);
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geometry;
}

function setOpacity(root,opacity){
  root.traverse(o=>{
    if(!o.isMesh)return;
    const list=Array.isArray(o.material)?o.material:[o.material];
    list.forEach(m=>{
      if(!m)return;
      m.transparent=true;
      m.opacity=opacity;
      m.depthWrite=opacity>.98;
    });
  });
  root.visible=opacity>.001;
}

class ArcCurve extends THREE.Curve{
  constructor(radius,start,end){super();this.radius=radius;this.start=start;this.end=end;}
  getPoint(t,target=new THREE.Vector3()){
    const a=lerp(this.start,this.end,t);
    return target.set(Math.cos(a)*this.radius,Math.sin(a)*this.radius,0);
  }
}

function createOpenRing(){
  const gapCenter=-Math.PI*.75;
  const gap=.48;
  const start=gapCenter+gap/2;
  const end=start+(Math.PI*2-gap);
  const g=new THREE.TubeGeometry(new ArcCurve(1.03,start,end),180,.065,12,false);
  applyGradient(g,-1.1,1.1);
  const mesh=new THREE.Mesh(g,gradientMaterial());
  mesh.userData.fullIndexCount=g.index.count;
  g.setDrawRange(0,0);
  return mesh;
}

function createGear(){
  const shape=new THREE.Shape();
  const teeth=8,seg=teeth*4;
  for(let i=0;i<seg;i++){
    const a=i/seg*Math.PI*2;
    const k=i%4;
    const r=(k===1||k===2) ? .76 : .61;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();
  const hole=new THREE.Path();
  hole.absarc(0,0,.285,0,Math.PI*2,true);
  shape.holes.push(hole);

  const g=new THREE.ExtrudeGeometry(shape,{
    depth:.19,bevelEnabled:true,bevelThickness:.045,
    bevelSize:.035,bevelSegments:2,curveSegments:12
  });
  g.center();
  applyGradient(g,-.8,.8);

  const group=new THREE.Group();
  group.add(new THREE.Mesh(g,gradientMaterial()));

  const hubG=applyGradient(new THREE.SphereGeometry(.115,22,14),-.12,.12);
  const hub=new THREE.Mesh(hubG,gradientMaterial());
  hub.position.z=.13;
  group.add(hub);

  const armG=applyGradient(new THREE.BoxGeometry(.46,.09,.12),-.23,.23);
  const arm=new THREE.Mesh(armG,gradientMaterial());
  arm.position.set(.18,.12,.13);
  arm.rotation.z=.54;
  group.add(arm);
  return group;
}

function createPanelGeometry(){
  const s=new THREE.Shape();
  s.moveTo(-.42,-.19);s.lineTo(.31,-.19);s.lineTo(.42,-.08);
  s.lineTo(.42,.19);s.lineTo(-.31,.19);s.lineTo(-.42,.08);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{
    depth:.13,bevelEnabled:true,bevelThickness:.026,
    bevelSize:.026,bevelSegments:2
  });
  g.center();
  applyGradient(g,-.45,.45);
  return g;
}

function cylinderBetween(a,b,r,material){
  const d=new THREE.Vector3().subVectors(b,a);
  const g=new THREE.CylinderGeometry(r,r,d.length(),10,1,false);
  const m=new THREE.Mesh(g,material);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  return m;
}

function createTGDevsMark(){
  const g=new THREE.Group();
  const ring=createOpenRing();
  const gear=createGear();
  g.add(ring,gear);
  g.userData={ring,gear};
  return g;
}

function createTGBCMark(){
  const g=new THREE.Group();
  const mat=gradientMaterial();

  const centerG=applyGradient(new THREE.SphereGeometry(.61,40,24),-.62,.62);
  const center=new THREE.Mesh(centerG,mat.clone());
  center.material.clearcoat=1;
  center.material.roughness=.14;
  g.add(center);

  const ringG=applyGradient(new THREE.TorusGeometry(.91,.055,12,96),-1,1);
  g.add(new THREE.Mesh(ringG,mat.clone()));

  const nodeGeo=applyGradient(new THREE.SphereGeometry(.155,24,16),-.16,.16);
  const panelGeo=createPanelGeometry();
  const angles=[Math.PI/2,Math.PI/6,-Math.PI/6,-Math.PI/2,-5*Math.PI/6,5*Math.PI/6];

  angles.forEach(a=>{
    const dir=new THREE.Vector3(Math.cos(a),Math.sin(a),0);
    g.add(cylinderBetween(dir.clone().multiplyScalar(.96),dir.clone().multiplyScalar(1.40),.026,mat.clone()));

    const node=new THREE.Mesh(nodeGeo.clone(),mat.clone());
    node.position.copy(dir.clone().multiplyScalar(1.55));
    node.scale.setScalar(.95);
    g.add(node);

    const pa=a-Math.PI/6;
    const panel=new THREE.Mesh(panelGeo.clone(),mat.clone());
    panel.position.set(Math.cos(pa)*1.30,Math.sin(pa)*1.30,0);
    panel.rotation.z=pa;
    g.add(panel);
  });
  return g;
}

function makeText(text,font,size,scaleX=1){
  const geo=new TextGeometry(text,{
    font,size,depth:.12,curveSegments:5,
    bevelEnabled:true,bevelThickness:.018,
    bevelSize:.012,bevelSegments:2
  });
  geo.computeBoundingBox();
  const box=geo.boundingBox;
  geo.translate(-box.min.x,-(box.max.y+box.min.y)/2,-.06);
  geo.scale(scaleX,1,1);
  applyGradient(geo,0,Math.max(.1,(box.max.x-box.min.x)*scaleX));
  return new THREE.Mesh(geo,gradientMaterial());
}

function mergeWorldGeometry(root){
  root.updateMatrixWorld(true);
  const geos=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    const g=o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g.index?g.toNonIndexed():g);
  });
  return BufferGeometryUtils.mergeGeometries(geos,false);
}

function sampleSurface(root,count){
  const geo=mergeWorldGeometry(root);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());
  const sampler=new MeshSurfaceSampler(mesh).build();
  const p=new THREE.Vector3();
  const arr=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    sampler.sample(p);
    arr[i*3]=p.x;arr[i*3+1]=p.y;arr[i*3+2]=p.z;
  }
  geo.dispose();
  return arr;
}

function createMorphInstances(sourceRoot,targetRoot,count=7000,size=.021){
  const from=sampleSurface(sourceRoot,count);
  const to=sampleSurface(targetRoot,count);
  const base=new THREE.IcosahedronGeometry(size,0);
  const g=new THREE.InstancedBufferGeometry();
  g.index=base.index;
  g.setAttribute('position',base.getAttribute('position'));
  g.setAttribute('normal',base.getAttribute('normal'));
  g.instanceCount=count;
  g.setAttribute('iFrom',new THREE.InstancedBufferAttribute(from,3));
  g.setAttribute('iTo',new THREE.InstancedBufferAttribute(to,3));

  const seed=new Float32Array(count);
  for(let i=0;i<count;i++){
    const n=Math.sin(i*91.713)*43758.5453;
    seed[i]=n-Math.floor(n);
  }
  g.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uMorph:{value:0},uAlpha:{value:0},
      uBlue:{value:new THREE.Color('#0b7cff')},
      uCyan:{value:new THREE.Color('#00c7d9')},
      uGreen:{value:new THREE.Color('#00e66b')},
      uLight:{value:new THREE.Vector3(-.4,.65,1).normalize()}
    },
    vertexShader:`
      attribute vec3 iFrom;
      attribute vec3 iTo;
      attribute float iSeed;
      uniform float uMorph;
      varying vec3 vNormalW;
      varying vec3 vColorPos;
      void main(){
        float m=smoothstep(0.0,1.0,uMorph);
        vec3 center=mix(iFrom,iTo,m);
        float arc=sin(m*3.14159265);
        float a=(iSeed-.5)*arc*.85;
        float ca=cos(a),sa=sin(a);
        center.xz=mat2(ca,-sa,sa,ca)*center.xz;
        center.z+=arc*(.18+.34*abs(iSeed-.5));
        vec3 local=position*(1.0+arc*.34);
        vec4 mv=modelViewMatrix*vec4(center+local,1.0);
        gl_Position=projectionMatrix*mv;
        vNormalW=normalize(normalMatrix*normal);
        vColorPos=center;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      uniform vec3 uBlue;
      uniform vec3 uCyan;
      uniform vec3 uGreen;
      uniform vec3 uLight;
      varying vec3 vNormalW;
      varying vec3 vColorPos;
      void main(){
        float t=clamp((vColorPos.x+3.0)/6.0,0.0,1.0);
        vec3 col=t<.55?mix(uBlue,uCyan,t/.55):mix(uCyan,uGreen,(t-.55)/.45);
        float lam=.48+.52*max(0.0,dot(normalize(vNormalW),uLight));
        float spec=pow(max(0.0,dot(reflect(-uLight,normalize(vNormalW)),vec3(0.0,0.0,1.0))),10.0)*.16;
        gl_FragColor=vec4(col*lam+spec,uAlpha);
      }
    `,
    transparent:true,
    depthWrite:true
  });

  const mesh=new THREE.Mesh(g,mat);
  mesh.frustumCulled=false;
  return mesh;
}

function createWorldCloud(){
  const count=26000;
  const geo=new THREE.BufferGeometry();
  const data=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    const surface=i%2;
    const u=((i>>1)%220)/219;
    const d=(Math.floor((i>>1)/220)%60)/59;
    data[i*4]=u;data[i*4+1]=d;data[i*4+2]=surface;data[i*4+3]=Math.random();
  }
  geo.setAttribute('aData',new THREE.BufferAttribute(data,4));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uBuild:{value:0},uVisibility:{value:1},uFlow:{value:0},
      uOrb:{value:0},uExpand:{value:0},uPortrait:{value:0}
    },
    vertexShader:`
      attribute vec4 aData;
      uniform float uBuild,uVisibility,uFlow,uOrb,uExpand,uPortrait;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        float u=aData.x,d=aData.y,s=aData.z,seed=aData.w;
        float reveal=s>.5?1.0-u:u;
        float born=smoothstep(reveal*.90,reveal*.90+.12,uBuild);
        float phase=(s>.5?2.1:.3)+(seed-.5)*.5;
        float w1=sin(u*(s>.5?7.1:8.4)+d*3.2+phase+uFlow*1.35);
        float w2=sin(u*(s>.5?15.2:16.8)-d*5.1+phase*.7-uFlow*.72);
        vec3 wave=vec3(
          mix(-3.3,3.3,u)+(d-.5)*(s>.5?-.85:.78),
          (s>.5?-.45:-.16)+w1*.54+w2*.14+(d-.5)*.72,
          mix(-1.15,.75,d)+w2*.12
        );
        float th=u*6.2831853+s*3.14159265;
        float ph=(d*.94+.03)*3.14159265;
        vec3 sphere=vec3(sin(ph)*cos(th),cos(ph),sin(ph)*sin(th))*1.65;
        sphere.z*=.82;
        vec3 p=mix(wave,sphere,uOrb);
        p*=mix(1.0,3.8,uExpand);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.15+d*2.5)*mix(1.0,1.25,uOrb);
        float edge=sin(3.14159265*u);
        vAlpha=born*uVisibility*edge*(.07+d*.34)*(1.0-uExpand*.82);
        vec3 b=vec3(.043,.486,1.0),c=vec3(0.0,.78,.85),g=vec3(0.0,.90,.42);
        float ct=s>.5?1.0-u:u;
        vColor=ct<.55?mix(b,c,ct/.55):mix(c,g,(ct-.55)/.45);
      }
    `,
    fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float r=dot(q,q);
        if(r>1.0)discard;
        float soft=1.0-smoothstep(.35,1.0,r);
        gl_FragColor=vec4(vColor,vAlpha*soft);
      }
    `,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  return new THREE.Points(geo,mat);
}

function createGradientPlane(){
  const g=new THREE.PlaneGeometry(30,18);
  const m=new THREE.ShaderMaterial({
    uniforms:{uAlpha:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`
      varying vec2 vUv;
      uniform float uAlpha;
      void main(){
        vec3 a=vec3(.015,.055,.13);
        vec3 b=vec3(.0,.35,.52);
        vec3 c=vec3(.0,.50,.28);
        float x=smoothstep(0.0,1.0,vUv.x);
        vec3 col=x<.55?mix(a,b,x/.55):mix(b,c,(x-.55)/.45);
        float glow=1.0-length(vUv-.5)*.68;
        gl_FragColor=vec4(col*(.72+.28*glow),uAlpha);
      }
    `,
    transparent:true,depthWrite:false
  });
  const mesh=new THREE.Mesh(g,m);
  mesh.position.z=-5;
  return mesh;
}

export class TGWorld3D{
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({
      canvas,alpha:true,antialias:true,powerPreference:'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.08;

    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,100);
    this.camera.position.set(0,0,10);

    this.scene.add(new THREE.HemisphereLight(0x8edfff,0x071018,1.6));
    const key=new THREE.DirectionalLight(0xffffff,3.0);
    key.position.set(-4,5,8);
    this.scene.add(key);
    const rim=new THREE.PointLight(0x00e66b,32,12,2);
    rim.position.set(4,-1,4);
    this.scene.add(rim);
    const blue=new THREE.PointLight(0x0b7cff,28,12,2);
    blue.position.set(-4,1,3);
    this.scene.add(blue);

    this.gradient=createGradientPlane();
    this.scene.add(this.gradient);
    this.cloud=createWorldCloud();
    this.scene.add(this.cloud);

    this.identity=new THREE.Group();
    this.scene.add(this.identity);

    this.ready=false;
    this.init();
  }

  async init(){
    const font=await new FontLoader().loadAsync(
      'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/fonts/helvetiker_bold.typeface.json'
    );

    this.sourceMark=createTGDevsMark();
    this.targetMark=createTGBCMark();
    this.sourceWord=makeText('TGDevs',font,.72,.95);
    this.targetWord=makeText('TGBusinessCenter',font,.43,.86);

    this.sourceMark.position.set(-1.35,0,0);
    this.sourceWord.position.set(-.05,-.03,0);
    this.targetMark.position.set(-1.35,0,0);
    this.targetWord.position.set(-.05,-.03,0);

    this.identity.add(this.sourceMark,this.sourceWord,this.targetMark,this.targetWord);
    setOpacity(this.targetMark,0);
    setOpacity(this.targetWord,0);

    this.markMorph=createMorphInstances(this.sourceMark,this.targetMark,7600,.024);
    this.wordMorph=createMorphInstances(this.sourceWord,this.targetWord,9800,.018);
    this.identity.add(this.markMorph,this.wordMorph);

    this.ready=true;
    document.documentElement.classList.add('world3d-ready');
    window.dispatchEvent(new Event('tgworldready'));
  }

  resize(w,h){
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;
    this.camera.updateProjectionMatrix();
  }

  render(s){
    this.resize(s.width,s.height);

    const portrait=!!s.portrait;
    this.camera.position.z=portrait?12.5:10;
    this.camera.fov=portrait?31:34;
    this.camera.updateProjectionMatrix();

    const cu=this.cloud.material.uniforms;
    cu.uBuild.value=s.build||0;
    cu.uVisibility.value=s.cloudVisible===undefined?1:s.cloudVisible;
    cu.uFlow.value=s.flow||0;
    cu.uOrb.value=s.orb||0;
    cu.uExpand.value=s.orbExpand||0;
    cu.uPortrait.value=portrait?1:0;

    this.gradient.material.uniforms.uAlpha.value=s.gradient||0;

    if(this.ready){
      const root=this.identity;
      root.position.set(portrait?0:1.05,portrait?-.56:0,0);
      root.scale.setScalar(portrait ? .88 : 1.0);

      const build=s.build||0;
      const ring=this.sourceMark.userData.ring;
      const total=ring.userData.fullIndexCount||0;
      ring.geometry.setDrawRange(0,Math.floor(total*clamp(build)));
      this.sourceMark.userData.gear.rotation.z=s.gearRotation||0;

      const wordIn=s.wordIn||0;
      this.sourceWord.position.x=lerp(-.55,-.05,wordIn);

      const takeover=s.logoCloud||0;
      const morph=s.logoMorph||0;
      const targetIn=s.targetSolid||0;

      setOpacity(this.sourceMark,1-takeover);
      setOpacity(this.sourceWord,(1-takeover)*wordIn);

      this.markMorph.material.uniforms.uMorph.value=morph;
      this.wordMorph.material.uniforms.uMorph.value=morph;
      this.markMorph.material.uniforms.uAlpha.value=takeover*(1-targetIn);
      this.wordMorph.material.uniforms.uAlpha.value=takeover*(1-targetIn);
      this.markMorph.visible=takeover>.001&&targetIn<.999;
      this.wordMorph.visible=takeover>.001&&targetIn<.999;

      setOpacity(this.targetMark,targetIn);
      setOpacity(this.targetWord,targetIn);

      root.position.x+=lerp(0,portrait?0:.18,s.stageShift||0);
      root.rotation.y=lerp(0,-.08,s.stageShift||0);
    }

    this.renderer.render(this.scene,this.camera);
  }
}
