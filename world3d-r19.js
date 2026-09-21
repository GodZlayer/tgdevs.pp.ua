import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r18.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const mix=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;

function seeded(n){
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function opacity(root,a){
  if(!root)return;
  const v=clamp(a);
  root.visible=v>.001;
  root.traverse(o=>{
    if(!o.isMesh && !o.isLine)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      m.transparent=true;
      if(m.uniforms?.uAlpha)m.uniforms.uAlpha.value=v;
      else if(typeof m.opacity==='number')m.opacity=v;
      m.depthWrite=v>.96 && !m.userData?.alwaysTransparent;
    });
  });
}

function sampleObjectGeometry(root,count,finalScale=1){
  root.updateMatrixWorld(true);
  const inverseRoot=root.matrixWorld.clone().invert();
  const entries=[];
  let totalWeight=0;
  root.traverse(o=>{
    if(!o.isMesh || !o.geometry?.getAttribute('position'))return;
    const pos=o.geometry.getAttribute('position');
    if(!pos || pos.count<1)return;
    const localMatrix=new THREE.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld);
    const weight=Math.max(1,pos.count);
    totalWeight+=weight;
    entries.push({pos,localMatrix,cumulative:totalWeight});
  });
  const out=new Float32Array(count*3);
  if(!entries.length)return out;
  const v=new THREE.Vector3();
  for(let i=0;i<count;i++){
    const pick=seeded(i*17.113+.91)*totalWeight;
    let entry=entries[entries.length-1];
    for(let j=0;j<entries.length;j++){
      if(pick<=entries[j].cumulative){entry=entries[j];break;}
    }
    const idx=Math.min(entry.pos.count-1,Math.floor(seeded(i*29.731+3.17)*entry.pos.count));
    v.fromBufferAttribute(entry.pos,idx).applyMatrix4(entry.localMatrix).multiplyScalar(finalScale);
    out[i*3]=v.x;
    out[i*3+1]=v.y;
    out[i*3+2]=v.z+(seeded(i*7.37+.2)-.5)*.008;
  }
  return out;
}

function edgeKeyTexture(image){
  const w=image.naturalWidth||image.width;
  const h=image.naturalHeight||image.height;
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,w,h);
  const frame=ctx.getImageData(0,0,w,h);
  const d=frame.data;
  const seen=new Uint8Array(w*h);
  const qx=new Int32Array(w*h);
  const qy=new Int32Array(w*h);
  let head=0,tail=0;

  const nearWhite=(x,y)=>{
    const k=(y*w+x)*4;
    const r=d[k],g=d[k+1],b=d[k+2],a=d[k+3];
    const mn=Math.min(r,g,b),mx=Math.max(r,g,b);
    return a>0 && mn>228 && (mx-mn)<28;
  };
  const push=(x,y)=>{
    const n=y*w+x;
    if(seen[n] || !nearWhite(x,y))return;
    seen[n]=1;qx[tail]=x;qy[tail]=y;tail++;
  };
  for(let x=0;x<w;x++){push(x,0);push(x,h-1);}
  for(let y=1;y<h-1;y++){push(0,y);push(w-1,y);}

  while(head<tail){
    const x=qx[head],y=qy[head];head++;
    const k=(y*w+x)*4;
    const mn=Math.min(d[k],d[k+1],d[k+2]);
    d[k+3]=Math.round(255*clamp((245-mn)/17));
    if(x>0)push(x-1,y);
    if(x<w-1)push(x+1,y);
    if(y>0)push(x,y-1);
    if(y<h-1)push(x,y+1);
  }
  ctx.putImageData(frame,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  return tex;
}

function sampleAlphaMask(canvas,count,targetHeight){
  const w=canvas.width,h=canvas.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const d=ctx.getImageData(0,0,w,h).data;
  const pts=[];
  const step=Math.max(1,Math.floor(Math.min(w,h)/240));
  for(let y=0;y<h;y+=step){
    for(let x=0;x<w;x+=step){
      if(d[(y*w+x)*4+3]>48)pts.push([x,y]);
    }
  }
  const out=new Float32Array(count*3);
  if(!pts.length)return out;
  const ratio=w/h,targetWidth=targetHeight*ratio;
  for(let i=0;i<count;i++){
    const pt=pts[Math.floor(seeded(i*33.71+.27)*pts.length)%pts.length];
    out[i*3]=(pt[0]/w-.5)*targetWidth;
    out[i*3+1]=(.5-pt[1]/h)*targetHeight;
    out[i*3+2]=(seeded(i*9.77)-.5)*.055;
  }
  return out;
}

function imagePlane(texture,ratio,height){
  const mat=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide
  });
  mat.toneMapped=false;
  mat.userData.alwaysTransparent=true;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*ratio,height),mat);
  mesh.renderOrder=20;
  return mesh;
}

function createFragmentMorph(from,to,count,size){
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
    const x=to[i*3],y=to[i*3+1];
    const angle=Math.atan2(y,x);
    order[i]=((Math.PI/2-angle+TAU)%TAU)/TAU*.90+sd*.035;
  }
  geo.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));
  geo.setAttribute('iOrder',new THREE.InstancedBufferAttribute(order,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{uBreak:{value:0},uMorph:{value:0},uAlpha:{value:0}},
    transparent:true,depthWrite:false,
    vertexShader:`
      attribute vec3 iFrom;
      attribute vec3 iTo;
      attribute float iSeed;
      attribute float iOrder;
      uniform float uBreak;
      uniform float uMorph;
      varying vec3 vP;
      varying vec3 vN;
      void main(){
        float b=smoothstep(0.0,1.0,uBreak);
        float phase=iSeed*6.28318530718;
        vec3 scatter=iFrom;
        scatter.xy+=vec2(cos(phase),sin(phase))*(.08+.36*iSeed)*b;
        scatter.z+=sin(phase*1.73)*(.10+.42*iSeed)*b;
        float local=smoothstep(iOrder-.05,iOrder+.09,uMorph);
        vec3 c=mix(scatter,iTo,local);
        float lift=sin(local*3.14159265);
        c.z+=lift*(.10+.26*iSeed);
        vec3 p=c+position*(1.0+lift*.42);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        vP=c;
        vN=normalize(normalMatrix*normal);
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying vec3 vP;
      varying vec3 vN;
      void main(){
        float t=clamp((vP.x+1.25)/2.5,0.0,1.0);
        vec3 blue=vec3(.015,.34,1.0);
        vec3 cyan=vec3(.00,.84,.98);
        vec3 green=vec3(.00,.92,.52);
        vec3 col=t<.58?mix(blue,cyan,t/.58):mix(cyan,green,(t-.58)/.42);
        vec3 L=normalize(vec3(-.35,.72,1.0));
        float lit=.68+.40*max(0.0,dot(normalize(vN),L));
        gl_FragColor=vec4(min(col*lit,vec3(1.0)),uAlpha);
      }
    `
  });
  mat.toneMapped=false;
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=18;
  return mesh;
}

function createCircuitPrism(){
  const geo=new THREE.CylinderGeometry(7.3,7.3,46,8,1,true);
  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uAlpha:{value:0},
      uBoard:{value:0},
      uFlow:{value:0}
    },
    transparent:true,
    depthWrite:false,
    side:THREE.BackSide,
    vertexShader:`
      varying vec2 vUv;
      varying vec3 vWorld;
      void main(){
        vUv=uv;
        vec4 wp=modelMatrix*vec4(position,1.0);
        vWorld=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      uniform float uBoard;
      uniform float uFlow;
      varying vec2 vUv;
      varying vec3 vWorld;

      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float line(float d,float w){return 1.0-smoothstep(w,w*1.8,d);}

      void main(){
        vec2 q=vec2(vUv.x*44.0,vUv.y*150.0);
        vec2 cell=floor(q);
        vec2 f=fract(q)-.5;

        float h1=hash(cell);
        float h2=hash(cell+vec2(9.7,3.1));
        float yoff=(h1-.5)*.46;
        float xoff=(h2-.5)*.46;

        float horizontal=line(abs(f.y-yoff),.035);
        float vertical=line(abs(f.x-xoff),.035);
        float choose=step(.48,h1);
        float trace=max(horizontal*choose,vertical*(1.0-choose));

        float elbowH=line(abs(f.y-yoff),.032)*step(-.05,f.x);
        float elbowV=line(abs(f.x-xoff),.032)*step(f.y,.18);
        trace=max(trace,min(elbowH,elbowV)*step(.70,h2));

        float bus1=line(abs(fract(q.x*.125)-.5),.020)*.60;
        float bus2=line(abs(fract(q.y*.0625)-.5),.018)*.46;
        trace=max(trace,max(bus1,bus2));

        vec2 viaP=vec2((h1-.5)*.44,(h2-.5)*.44);
        float via=line(abs(length(f-viaP)-.09),.025);
        float pad=1.0-smoothstep(.10,.16,length(f-viaP));

        vec3 baseA=vec3(.003,.014,.016);
        vec3 baseB=vec3(.004,.050,.041);
        float longitudinal=clamp((vWorld.z+26.0)/42.0,0.0,1.0);
        vec3 col=mix(baseA,baseB,.28+.45*longitudinal);

        float grain=(hash(cell*1.77)-.5)*.018;
        col+=grain;

        vec3 copper=vec3(.025,.27,.20);
        col=mix(col,copper,trace*.74*uBoard);
        col+=vec3(.05,.34,.25)*via*.55*uBoard;
        col+=vec3(.03,.22,.16)*pad*.12*uBoard;

        float lanePhase=hash(vec2(floor(q.x*.5),floor(q.y*.09)));
        float moving=abs(fract(q.y*.016-uFlow*.82-lanePhase)-.5);
        float packet=exp(-moving*moving*1450.0);
        float electric=packet*trace*uBoard;

        float moving2=abs(fract(q.x*.022+uFlow*.63+h2)-.5);
        electric+=exp(-moving2*moving2*1650.0)*trace*uBoard*.72;

        col+=vec3(.00,.66,.98)*electric*.95;
        col+=vec3(.00,.98,.58)*electric*electric*.34;

        float depthFade=smoothstep(-25.0,2.0,vWorld.z);
        float horizon=.45+.55*depthFade;
        col*=horizon;

        float alpha=uAlpha*(.18+.82*uBoard);
        gl_FragColor=vec4(col,alpha);
      }
    `
  });
  mat.toneMapped=false;
  const mesh=new THREE.Mesh(geo,mat);
  mesh.rotation.x=Math.PI/2;
  mesh.position.z=-5.0;
  mesh.scale.set(.08,1,.08);
  mesh.renderOrder=-4;
  return mesh;
}

function canvasLabel(text,w=1024,h=220,size=118){
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,w,h);
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font=`700 ${size}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle='#d9fbff';
  ctx.shadowColor='#00d7ff';
  ctx.shadowBlur=14;
  ctx.fillText(text,w/2,h/2);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
  mat.toneMapped=false;
  mat.userData.alwaysTransparent=true;
  return mat;
}

function hwMaterial(color,emissive=0x001410){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness:.48,
    metalness:.20,
    clearcoat:.36,
    clearcoatRoughness:.30,
    emissive,
    emissiveIntensity:.45,
    transparent:true,
    opacity:1
  });
}

function box(parent,w,h,d,x,y,z,color=0x082b27,emissive=0x00130f){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),hwMaterial(color,emissive));
  m.position.set(x,y,z);
  parent.add(m);
  return m;
}

function makeRamModule(label){
  const g=new THREE.Group();
  box(g,3.25,.66,.15,0,0,0,0x07372f,0x00271d);
  box(g,3.00,.08,.09,0,-.37,.02,0xb58b35,0x2a1700);
  for(let i=0;i<8;i++){
    box(g,.24,.05,.07,-1.34+i*.38,-.43,.02,0xd8b45d,0x251500);
  }
  for(let i=0;i<6;i++){
    box(g,.34,.34,.09,-1.08+i*.43,.03,.10,0x11191a,0x00110d);
  }
  const lm=new THREE.MeshBasicMaterial({map:canvasLabel(label),transparent:true,depthWrite:false});
  lm.map=canvasLabel(label);
  lm.toneMapped=false;
  const t=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.34),lm);
  t.position.set(0,.02,.17);g.add(t);
  return g;
}

function makeGpuModule(label){
  const g=new THREE.Group();
  box(g,3.45,1.70,.18,0,0,0,0x082f2c,0x00221a);
  box(g,3.12,1.40,.08,0,0,.13,0x0a191b,0x000d0c);
  const fanMat=hwMaterial(0x142124,0x00130f);
  for(const x of [-.78,.78]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.47,.075,12,48),fanMat.clone());
    ring.position.set(x,0,.22);g.add(ring);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.10,24),fanMat.clone());
    hub.rotation.x=Math.PI/2;hub.position.set(x,0,.22);g.add(hub);
    for(let i=0;i<7;i++){
      const blade=box(g,.34,.07,.035,x+Math.cos(i*TAU/7)*.23,Math.sin(i*TAU/7)*.23,.24,0x1b2b2d,0x00110e);
      blade.rotation.z=i*TAU/7+.45;
    }
  }
  box(g,2.75,.10,.10,0,-.92,.02,0xb28a39,0x281700);
  const mat=canvasLabel(label);
  const t=new THREE.Mesh(new THREE.PlaneGeometry(1.60,.34),mat);
  t.position.set(0,.58,.24);g.add(t);
  return g;
}

function makeNvmeModule(label){
  const g=new THREE.Group();
  box(g,2.75,.78,.12,0,0,0,0x07352d,0x00251c);
  for(let i=0;i<4;i++)box(g,.43,.40,.08,-.80+i*.52,0,.10,0x10191a,0x000d0c);
  box(g,.38,.54,.07,-1.17,0,.11,0x172326,0x00110d);
  box(g,.48,.09,.06,1.36,0,.02,0xb98e37,0x2a1700);
  for(let i=0;i<7;i++)box(g,.045,.30,.035,1.18+i*.055,0,.07,0xe0bc65,0x2d1900);
  const hole=new THREE.Mesh(new THREE.TorusGeometry(.11,.028,8,24),hwMaterial(0xc9aa65,0x201400));
  hole.position.set(-1.18,0,.16);g.add(hole);
  const mat=canvasLabel(label,1400,220,104);
  const t=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.30),mat);
  t.position.set(.15,.27,.17);g.add(t);
  return g;
}

function makeCoreSocket(){
  const g=new THREE.Group();
  const dark=0x071e1d;
  box(g,3.10,.16,.12,0,1.50,0,dark,0x00110d);
  box(g,3.10,.16,.12,0,-1.50,0,dark,0x00110d);
  box(g,.16,2.84,.12,-1.50,0,0,dark,0x00110d);
  box(g,.16,2.84,.12,1.50,0,0,dark,0x00110d);
  for(let i=0;i<10;i++){
    const x=-1.26+i*.28;
    box(g,.055,.12,.07,x,1.33,.08,0xb89645,0x281700);
    box(g,.055,.12,.07,x,-1.33,.08,0xb89645,0x281700);
  }
  for(let i=0;i<8;i++){
    const y=-1.05+i*.30;
    box(g,.12,.055,.07,-1.33,y,.08,0xb89645,0x281700);
    box(g,.12,.055,.07,1.33,y,.08,0xb89645,0x281700);
  }
  return g;
}

function makeTrace(points,color=0x00cfee){
  const curve=new THREE.CatmullRomCurve3(points);
  const glowMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false});
  glowMat.toneMapped=false;glowMat.userData.alwaysTransparent=true;
  const coreMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.92,depthWrite:false});
  coreMat.toneMapped=false;coreMat.userData.alwaysTransparent=true;
  const group=new THREE.Group();
  const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.045,8,false),glowMat);
  const core=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.012,6,false),coreMat);
  group.add(glow,core);
  group.userData.curve=curve;
  const packet=new THREE.Mesh(
    new THREE.SphereGeometry(.055,12,8),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false})
  );
  packet.material.toneMapped=false;packet.material.userData.alwaysTransparent=true;
  packet.renderOrder=25;
  group.add(packet);
  group.userData.packet=packet;
  return group;
}

function createSlogan(){
  const mat=canvasLabel('Sua equipe merece qualidade !',1800,260,104);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(5.45,.78),mat);
  mesh.renderOrder=22;
  return mesh;
}

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.prism=createCircuitPrism();
    this.scene.add(this.prism);

    this.systemGroup=new THREE.Group();
    this.scene.add(this.systemGroup);

    this.coreSocket=makeCoreSocket();
    this.coreSocket.position.set(0,.12,-.08);
    this.systemGroup.add(this.coreSocket);

    this.analyzer=makeGpuModule('TGAnalyzer');
    this.analyzer.position.set(-3.72,1.72,.12);
    this.analyzer.rotation.set(-.10,.22,-.08);
    this.analyzer.scale.setScalar(.74);
    this.systemGroup.add(this.analyzer);

    this.vpn=makeRamModule('TGVPN');
    this.vpn.position.set(3.52,1.82,.10);
    this.vpn.rotation.set(.05,-.28,.10);
    this.vpn.scale.setScalar(.84);
    this.systemGroup.add(this.vpn);

    this.tgbcModule=makeNvmeModule('TGBusinessCenter');
    this.tgbcModule.position.set(.18,-2.55,.12);
    this.tgbcModule.rotation.set(.05,.08,-.03);
    this.tgbcModule.scale.setScalar(.87);
    this.systemGroup.add(this.tgbcModule);

    this.traceAnalyzer=makeTrace([
      new THREE.Vector3(-2.66,1.30,-.12),
      new THREE.Vector3(-2.20,.78,-.18),
      new THREE.Vector3(-1.58,.76,-.20),
      new THREE.Vector3(-1.20,.34,-.16)
    ],0x00cfee);
    this.traceVpn=makeTrace([
      new THREE.Vector3(2.62,1.34,-.12),
      new THREE.Vector3(2.18,.92,-.16),
      new THREE.Vector3(1.62,.92,-.20),
      new THREE.Vector3(1.16,.40,-.16)
    ],0x00e69a);
    this.traceTgbc=makeTrace([
      new THREE.Vector3(.18,-1.92,-.12),
      new THREE.Vector3(.18,-1.55,-.18),
      new THREE.Vector3(.76,-1.08,-.20),
      new THREE.Vector3(.72,-.72,-.16)
    ],0x1689ff);
    this.systemGroup.add(this.traceAnalyzer,this.traceVpn,this.traceTgbc);

    this.sloganR19=createSlogan();
    this.systemGroup.add(this.sloganR19);

    opacity(this.coreSocket,0);
    opacity(this.analyzer,0);
    opacity(this.vpn,0);
    opacity(this.tgbcModule,0);
    opacity(this.traceAnalyzer,0);
    opacity(this.traceVpn,0);
    opacity(this.traceTgbc,0);
    opacity(this.sloganR19,0);

    this.deskExactFav=null;
    this.deskExactWord=null;
    this.deskMorphR19=null;

    const loader=new THREE.TextureLoader();
    loader.load('./tgdesk-favicon-r1.webp',source=>{
      const tex=edgeKeyTexture(source.image);
      this.deskExactFav=imagePlane(tex,683/644,2.08);
      this.scene.add(this.deskExactFav);
      opacity(this.deskExactFav,0);

      const count=3000;
      const rawHalf=Math.max(.001,this.targetMark?.userData?.halfWidth||1);
      const from=sampleObjectGeometry(this.targetMark,count,1/rawHalf);
      const to=sampleAlphaMask(tex.image,count,2.08);
      this.deskMorphR19=createFragmentMorph(from,to,count,.013);
      this.scene.add(this.deskMorphR19);
      this.deskMorphR19.visible=false;
      window.dispatchEvent(new Event('tgworldready'));
    });

    loader.load('./tgdesk-wordmark-r1.webp',source=>{
      const tex=edgeKeyTexture(source.image);
      this.deskExactWord=imagePlane(tex,898/190,.62);
      this.scene.add(this.deskExactWord);
      opacity(this.deskExactWord,0);
      window.dispatchEvent(new Event('tgworldready'));
    });
  }

  resize(w,h,portrait){
    super.resize(w,h,portrait);
    if(this.prism){
      this.prism.material.uniforms.uAlpha.value=0;
    }
  }

  render(state){
    super.render(state);
    const p=state.p||0;
    const portrait=!!state.portrait;

    // Remove the r18 flat PCB and approximate TGDesk treatment entirely.
    if(this.pcb)this.pcb.visible=false;
    if(this.tgdeskMorph)this.tgdeskMorph.visible=false;
    if(this.tgdeskGroup)opacity(this.tgdeskGroup,0);

    if(p<=1.805){
      this.prism.visible=false;
      this.systemGroup.visible=false;
      if(this.deskMorphR19)this.deskMorphR19.visible=false;
      opacity(this.deskExactFav,0);
      opacity(this.deskExactWord,0);
      this.renderer.render(this.scene,this.camera);
      return;
    }

    this.systemGroup.visible=true;

    // 1) The opaque TGBC world does not jump to a PCB texture.
    // It becomes the original TGDevs particle cloud again.
    const opaqueOut=mix(p,1.825,1.945);
    const cloudIn=mix(p,1.835,1.945);
    const prismIn=mix(p,1.955,2.145);
    const cloudOut=mix(p,2.060,2.235);
    const cloudAlpha=cloudIn*(1-cloudOut);

    if(this.bg?.material?.uniforms?.uAlpha){
      this.bg.visible=opaqueOut<.999;
      this.bg.material.uniforms.uAlpha.value=1-opaqueOut;
      this.bg.scale.setScalar(lerp(1,1.16,opaqueOut));
    }

    if(this.cloud?.material?.uniforms){
      const u=this.cloud.material.uniforms;
      this.cloud.visible=cloudAlpha>.001;
      u.uBuild.value=1;
      u.uAlpha.value=cloudAlpha;
      u.uFlow.value=(p-1.805)*3.2;
      u.uOrb.value=0;
      u.uExpand.value=0;
      u.uPortrait.value=portrait?1:0;
      this.cloud.scale.setScalar(lerp(1.05,1.76,prismIn));
      this.cloud.rotation.z=lerp(0,.10,prismIn);
    }

    // 2) That cloud hardens into an octagonal motherboard prism/tunnel.
    this.prism.visible=prismIn>.001;
    this.prism.scale.set(
      lerp(.08,1,prismIn),
      1,
      lerp(.08,1,prismIn)
    );
    this.prism.rotation.z=lerp(-.12,0,prismIn);
    this.prism.material.uniforms.uAlpha.value=prismIn;
    this.prism.material.uniforms.uBoard.value=mix(p,2.015,2.205);
    this.prism.material.uniforms.uFlow.value=(p-1.95)*3.65;

    // 3) TGBC breaks into the TGDesk mark, but the approximation is never used as the final logo.
    const breakIn=mix(p,1.865,1.985);
    const morph=mix(p,1.945,2.120);
    const exactFavIn=mix(p,2.055,2.155);
    const morphOut=mix(p,2.095,2.185);
    const wordIn=mix(p,2.115,2.225);

    opacity(this.targetMark,1-breakIn);
    if(this.deskMorphR19?.material?.uniforms){
      this.deskMorphR19.visible=p>1.86 && p<2.20;
      this.deskMorphR19.material.uniforms.uBreak.value=breakIn;
      this.deskMorphR19.material.uniforms.uMorph.value=morph;
      this.deskMorphR19.material.uniforms.uAlpha.value=mix(p,1.875,1.925)*(1-morphOut);
    }

    const coreSettle=mix(p,2.10,2.28);
    if(this.deskExactFav){
      this.deskExactFav.position.set(0,lerp(0,.36,coreSettle),.38);
      this.deskExactFav.scale.setScalar(lerp(1,.94,coreSettle));
      opacity(this.deskExactFav,exactFavIn);
    }
    if(this.deskExactWord){
      this.deskExactWord.position.set(0,portrait?-1.05:-1.02,.40);
      this.deskExactWord.scale.setScalar(portrait?.88:.92);
      opacity(this.deskExactWord,wordIn);
    }

    // The TGBC lockup disappears only after the TGDesk exact raster is already readable.
    const oldWordOut=mix(p,1.890,2.030);
    opacity(this.targetWord,1-oldWordOut);
    if(p>2.03)opacity(this.targetWordLight,0);

    // 4) TGDesk becomes the motherboard core/socket.
    const socketIn=mix(p,2.205,2.355);
    this.coreSocket.position.z=lerp(-1.10,-.08,socketIn);
    this.coreSocket.scale.setScalar(lerp(.72,1,socketIn));
    opacity(this.coreSocket,socketIn*.86);

    const sloganIn=mix(p,2.155,2.285);
    if(portrait){
      this.sloganR19.position.set(0,2.62,.34);
      this.sloganR19.scale.setScalar(.72);
    }else{
      this.sloganR19.position.set(-3.18,-1.62,.34);
      this.sloganR19.scale.setScalar(.74);
    }
    opacity(this.sloganR19,sloganIn);

    // 5) Roadmap products arrive as actual machine components, not cards.
    const analyzerIn=mix(p,2.330,2.500);
    const vpnIn=mix(p,2.455,2.625);
    const tgbcIn=mix(p,2.580,2.750);

    this.analyzer.position.x=lerp(-6.4,-3.72,analyzerIn);
    this.analyzer.position.z=lerp(-2.0,.12,analyzerIn);
    this.analyzer.rotation.y=lerp(.72,.22,analyzerIn);
    opacity(this.analyzer,analyzerIn);

    this.vpn.position.x=lerp(6.2,3.52,vpnIn);
    this.vpn.position.z=lerp(-2.0,.10,vpnIn);
    this.vpn.rotation.y=lerp(-.78,-.28,vpnIn);
    opacity(this.vpn,vpnIn);

    this.tgbcModule.position.y=lerp(-4.8,-2.55,tgbcIn);
    this.tgbcModule.position.z=lerp(-2.0,.12,tgbcIn);
    this.tgbcModule.rotation.x=lerp(.58,.05,tgbcIn);
    opacity(this.tgbcModule,tgbcIn);

    const traceA=mix(p,2.395,2.535)*analyzerIn;
    const traceV=mix(p,2.515,2.655)*vpnIn;
    const traceB=mix(p,2.640,2.790)*tgbcIn;
    opacity(this.traceAnalyzer,traceA);
    opacity(this.traceVpn,traceV);
    opacity(this.traceTgbc,traceB);

    const packets=[
      [this.traceAnalyzer,traceA,.08],
      [this.traceVpn,traceV,.42],
      [this.traceTgbc,traceB,.73]
    ];
    packets.forEach(([trace,a,phase])=>{
      const packet=trace.userData.packet;
      const curve=trace.userData.curve;
      const t=((p*1.46+phase)%1+1)%1;
      packet.position.copy(curve.getPoint(t));
      packet.visible=a>.02;
      packet.scale.setScalar(.76+.42*Math.sin(t*Math.PI));
      packet.material.opacity=a;
    });

    // The final state is a complete machine: TGDesk at the socket, products on the bus,
    // and every visible electrical state still derives exclusively from scroll position.
    const systemSettle=mix(p,2.745,2.930);
    this.systemGroup.rotation.z=lerp(.025,0,systemSettle);
    this.systemGroup.position.z=lerp(.08,0,systemSettle);

    this.renderer.render(this.scene,this.camera);
  }
}
