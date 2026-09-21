import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { SVGLoader } from './vendor/SVGLoader.r180.js';
import { BRAND } from './brandContours-r1.js';
import { TGDEVS_GEAR_SVG, TGDEVS_LOADER_SVG, TGDEVS_WORDMARK_SVG } from './brandSvgSource-r1.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const mix=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;

const BLUE=new THREE.Color('#0b7cff');
const CYAN=new THREE.Color('#00c7d9');
const GREEN=new THREE.Color('#00e66b');
const WHITE=new THREE.Color('#f4f7f8');
const DARK=new THREE.Color('#263545');

function seeded(n){
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function gradientColor(t,target=new THREE.Color()){
  t=clamp(t);
  if(t<.55)return target.copy(BLUE).lerp(CYAN,t/.55);
  return target.copy(CYAN).lerp(GREEN,(t-.55)/.45);
}

function addGradientColors(g,minX,maxX){
  const p=g.getAttribute('position');
  const out=new Float32Array(p.count*3);
  const c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    gradientColor((p.getX(i)-minX)/(maxX-minX),c);
    out[i*3]=c.r;out[i*3+1]=c.g;out[i*3+2]=c.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(out,3));
  return g;
}

function physicalGradient(){
  return new THREE.MeshPhysicalMaterial({
    color:0xffffff,vertexColors:true,
    roughness:.58,metalness:.012,
    clearcoat:.10,clearcoatRoughness:.48,
    transparent:true,opacity:1
  });
}

function physicalSolid(color=0xffffff,opacity=1){
  return new THREE.MeshPhysicalMaterial({
    color,roughness:.50,metalness:.02,
    clearcoat:.14,clearcoatRoughness:.42,
    transparent:true,opacity
  });
}

function exactSvgMaterials(){
  const front=new THREE.MeshBasicMaterial({
    vertexColors:true,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:1,
    depthWrite:true
  });
  const side=new THREE.MeshStandardMaterial({
    color:0xffffff,
    vertexColors:true,
    roughness:.74,
    metalness:.015,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:1,
    depthWrite:true
  });
  return [front,side];
}

function exactTextMaterials(color=0xf4f7f8){
  const front=new THREE.MeshBasicMaterial({
    color,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:1,
    depthWrite:true
  });
  const side=new THREE.MeshBasicMaterial({
    color:0x263038,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:1,
    depthWrite:true
  });
  return [front,side];
}

function materialOpacity(root,a){
  root.visible=a>.001;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      m.transparent=true;
      if(m.userData?.tgMarkMaterial && m.uniforms?.uAlpha){
        m.uniforms.uAlpha.value=a;
      }else{
        m.opacity=a;
      }
      m.depthWrite=a>.96;
    });
  });
}

function svgExtruded(svgText,targetHeight,depth=.045,bevel=.003){
  const loader=new SVGLoader();
  const data=loader.parse(svgText);
  const raw=new THREE.Group();
  const geos=[];
  for(const path of data.paths){
    const shapes=SVGLoader.createShapes(path);
    for(const shape of shapes){
      const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:4});
      geo.translate(0,0,-depth/2);
      geo.computeBoundingBox();
      geos.push(geo);
    }
  }
  const union=new THREE.Box3();
  geos.forEach(g=>union.union(g.boundingBox));
  const size=new THREE.Vector3();union.getSize(size);
  const center=new THREE.Vector3();union.getCenter(center);
  const scale=targetHeight/Math.max(.0001,size.y);
  for(const geo of geos){
    addGradientColors(geo,union.min.x,union.max.x);
    raw.add(new THREE.Mesh(geo,exactSvgMaterials()));
  }
  raw.position.set(-center.x,-center.y,0);
  // SVG coordinates are Y-down. Materials are DoubleSide, so only Y needs conversion.
  raw.scale.set(scale,-scale,scale);
  const root=new THREE.Group();root.add(raw);
  root.userData={width:size.x*scale,height:targetHeight};
  return root;
}

function svgStrokeTube(svgText,targetHeight){
  const loader=new SVGLoader();
  const data=loader.parse(svgText);
  const path=data.paths[data.paths.length-1];
  const sub=path.subPaths[0];
  const pts=sub.getPoints(180);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  pts.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const scale=targetHeight/220;
  const v=pts.map(p=>new THREE.Vector3((p.x-cx)*scale,-(p.y-cy)*scale,0));
  const curve=new THREE.CatmullRomCurve3(v,false,'centripetal');
  const radius=2.5*scale;
  const trackG=new THREE.TubeGeometry(curve,180,radius,8,false);
  const progressG=trackG.clone();
  addGradientColors(progressG,-targetHeight/2,targetHeight/2);
  const track=new THREE.Mesh(trackG,physicalSolid(0x11181b,.18));
  const progress=new THREE.Mesh(progressG,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:1}));
  progress.userData.fullCount=progressG.index.count;
  progressG.setDrawRange(0,0);
  return {track,progress};
}

function contourBBox(rec){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const [x,y] of rec.p){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  return {minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2};
}

function contourShape(rec,ratio){
  const shape=new THREE.Shape();
  rec.p.forEach(([x,y],i)=>{const px=x-ratio/2,py=y-.5;i?shape.lineTo(px,py):shape.moveTo(px,py);});
  shape.closePath();
  for(const holePts of rec.h||[]){
    const h=new THREE.Path();
    holePts.forEach(([x,y],i)=>{const px=x-ratio/2,py=y-.5;i?h.lineTo(px,py):h.moveTo(px,py);});
    h.closePath();shape.holes.push(h);
  }
  return shape;
}

function contourGradient(geo,ratio){
  const p=geo.getAttribute('position');
  const colors=new Float32Array(p.count*3);
  const b=new THREE.Color('#0b7cff'),c=new THREE.Color('#00c7d9'),g=new THREE.Color('#00e66b'),o=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const t=clamp((p.getX(i)+ratio/2)/ratio);
    if(t<.54)o.copy(b).lerp(c,t/.54);else o.copy(c).lerp(g,(t-.54)/.46);
    colors[i*3]=o.r;colors[i*3+1]=o.g;colors[i*3+2]=o.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
}

function contourMesh(rec,data,{depth=.055,bevel=.004,mode='gradient'}={}){
  const geo=new THREE.ExtrudeGeometry(contourShape(rec,data.ratio),{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:3});
  geo.translate(0,0,-depth/2);
  if(mode==='gradient'){contourGradient(geo,data.ratio);return new THREE.Mesh(geo,physicalGradient());}
  if(mode==='tgbcWord'){
    if(contourBBox(rec).cx<1.8){contourGradient(geo,data.ratio);return new THREE.Mesh(geo,physicalGradient());}
    return new THREE.Mesh(geo,physicalSolid(0xe8edf2,1));
  }
  const col=(rec.c[0]<<16)|(rec.c[1]<<8)|rec.c[2];
  return new THREE.Mesh(geo,physicalSolid(col,1));
}

function contourBrand(data,opts={}){
  const g=new THREE.Group();data.shapes.forEach(rec=>g.add(contourMesh(rec,data,opts)));return g;
}

function pointInContour(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-9)+xi))inside=!inside;
  }
  return inside;
}

function sampleContourBrand(data,count,scale=1,offsetX=0,offsetY=0){
  const weights=data.shapes.map(s=>Math.max(.001,s.a)),total=weights.reduce((a,b)=>a+b,0),cum=[];
  let acc=0;weights.forEach(w=>{acc+=w/total;cum.push(acc);});
  const out=new Float32Array(count*3);
  for(let n=0;n<count;n++){
    const r=seeded(n*1.93+.17);let idx=cum.findIndex(v=>r<=v);if(idx<0)idx=data.shapes.length-1;
    const sh=data.shapes[idx],box=contourBBox(sh);let px=0,py=0,ok=false;
    for(let tries=0;tries<48&&!ok;tries++){
      px=lerp(box.minX,box.maxX,seeded(n*13.1+tries*2.3));py=lerp(box.minY,box.maxY,seeded(n*9.7+tries*3.7));
      ok=pointInContour(px,py,sh.p)&&!(sh.h||[]).some(h=>pointInContour(px,py,h));
    }
    out[n*3]=(px-data.ratio/2)*scale+offsetX;out[n*3+1]=(py-.5)*scale+offsetY;out[n*3+2]=(seeded(n*7.91)-.5)*.055;
  }
  return out;
}

class ArcCurve extends THREE.Curve{
  constructor(radius,start,end){super();this.radius=radius;this.start=start;this.end=end;}
  getPoint(t,target=new THREE.Vector3()){
    const a=lerp(this.start,this.end,t);
    return target.set(Math.cos(a)*this.radius,Math.sin(a)*this.radius,0);
  }
}

function createOfficialTGDevsSurface(){
  const texture=new THREE.TextureLoader().load('./favicon.png',()=>{
    window.dispatchEvent(new Event('tgworldready'));
  });
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;

  const material=new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uAngle:{value:0},
      uFull:{value:0},
      uAlpha:{value:1}
    },
    transparent:true,
    depthWrite:true,
    side:THREE.DoubleSide,
    vertexShader:`
      varying vec2 vUv;
      void main(){
        vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D uMap;
      uniform float uAngle;
      uniform float uFull;
      uniform float uAlpha;
      varying vec2 vUv;

      void main(){
        vec2 q=vUv-.5;
        float cs=cos(uAngle),sn=sin(uAngle);
        vec2 qr=mat2(cs,-sn,sn,cs)*q;
        vec2 uvRot=qr+.5;

        vec4 rotating=texture2D(uMap,uvRot);
        vec4 fixedMark=texture2D(uMap,vUv);

        float r=length(q);
        float gearMask=1.0-smoothstep(.355,.405,r);
        float outerMask=1.0-gearMask;

        vec3 rgb=rotating.rgb*gearMask + fixedMark.rgb*outerMask*uFull;
        float alpha=(rotating.a*gearMask + fixedMark.a*outerMask*uFull)*uAlpha;
        if(alpha<.008)discard;

        gl_FragColor=vec4(rgb,alpha);
      }
    `
  });
  material.userData.tgMarkMaterial=true;

  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),material);
  mesh.position.z=.025;
  mesh.renderOrder=3;
  return mesh;
}

function createTGDevsMark(){
  const root=new THREE.Group();
  const surface=createOfficialTGDevsSurface();
  const ring=svgStrokeTube(TGDEVS_LOADER_SVG,2.0);

  ring.track.position.z=.005;
  ring.progress.position.z=.012;
  root.add(ring.track,ring.progress,surface);

  root.userData={
    track:ring.track,
    progress:ring.progress,
    surface
  };
  return root;
}

function createPanelGeometry(){
  const s=new THREE.Shape();
  s.moveTo(-.42,-.19);s.lineTo(.31,-.19);s.lineTo(.42,-.08);
  s.lineTo(.42,.19);s.lineTo(-.31,.19);s.lineTo(-.42,.08);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{
    depth:.13,bevelEnabled:true,bevelThickness:.026,
    bevelSize:.026,bevelSegments:1
  });
  g.center();
  return addGradientColors(g,-.45,.45);
}

function cylinderBetween(a,b,r,mat){
  const d=new THREE.Vector3().subVectors(b,a);
  const g=addGradientColors(new THREE.CylinderGeometry(r,r,d.length(),8,1,false),-.1,.1);
  const m=new THREE.Mesh(g,mat);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  return m;
}

function createTGBCMark(){
  return contourBrand(BRAND.tgbcMark,{depth:.048,bevel:.0035,mode:'gradient'});
}

function createTextMesh(text,font,size,kind='gradient',depth=.105){
  const g=new TextGeometry(text,{
    font,size,depth,curveSegments:2,
    bevelEnabled:true,bevelThickness:.012,
    bevelSize:.009,bevelSegments:1
  });
  g.computeBoundingBox();
  const b=g.boundingBox;
  g.translate(-b.min.x,-(b.max.y+b.min.y)/2,-depth/2);
  const width=b.max.x-b.min.x;
  let m;
  if(kind==='gradient'){
    addGradientColors(g,0,Math.max(.01,width));
    m=exactSvgMaterials();
  }else{
    m=exactTextMaterials(kind==='dark'?DARK:WHITE);
  }
  const mesh=new THREE.Mesh(g,m);
  mesh.userData.width=width;
  return mesh;
}

function createSourceWord(){
  return svgExtruded(TGDEVS_WORDMARK_SVG,.58,.038,.0025);
}

function createTargetWord(){
  return contourBrand(BRAND.tgbcWord,{depth:.040,bevel:.003,mode:'tgbcWord'});
}

function createSlogan(text,font,size=.34){
  const g=new THREE.Group();
  const mesh=createTextMesh(text,font,size,'white',.075);
  g.add(mesh);
  return g;
}

function createLead(font){
  const g=new THREE.Group();
  const text=createTextMesh('Sua empresa merece :',font,.48,'white',.09);
  g.add(text);
  const lineG=addGradientColors(new THREE.BoxGeometry(2.45,.035,.055),-1.23,1.23);
  const line=new THREE.Mesh(lineG,physicalGradient());
  line.position.set(1.22,-.48,0);
  line.scale.x=0;
  g.add(line);
  g.userData.line=line;
  return g;
}

function createScrollCue(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(
    new THREE.CapsuleGeometry(.12,.22,4,8),
    physicalSolid(0xf5f7f8,.18)
  );
  body.scale.set(.72,1,.32);
  g.add(body);

  const wheelG=addGradientColors(new THREE.BoxGeometry(.035,.11,.035),-.02,.02);
  const wheel=new THREE.Mesh(wheelG,physicalGradient());
  wheel.position.set(0,.075,.11);
  g.add(wheel);

  const barG=new THREE.BoxGeometry(.13,.024,.028);
  for(let row=0;row<2;row++){
    const y=-.31-row*.12;
    const l=new THREE.Mesh(barG,physicalSolid(0xf5f7f8,.6-row*.2));
    const r=new THREE.Mesh(barG,physicalSolid(0xf5f7f8,.6-row*.2));
    l.rotation.z=-Math.PI/4;r.rotation.z=Math.PI/4;
    l.position.set(-.045,y,0);r.position.set(.045,y,0);
    g.add(l,r);
  }
  return g;
}

function createCloud(maxCount=16000){
  const geo=new THREE.BufferGeometry();
  const data=new Float32Array(maxCount*4);
  for(let i=0;i<maxCount;i++){
    const surface=i%2;
    const u=((i>>1)%180)/179;
    const d=(Math.floor((i>>1)/180)%45)/44;
    data[i*4]=u;
    data[i*4+1]=d;
    data[i*4+2]=surface;
    data[i*4+3]=seeded(i*1.73);
  }
  geo.setAttribute('aData',new THREE.BufferAttribute(data,4));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uBuild:{value:0},uAlpha:{value:1},uFlow:{value:0},
      uOrb:{value:0},uExpand:{value:0}
    },
    vertexShader:`
      attribute vec4 aData;
      uniform float uBuild,uAlpha,uFlow,uOrb,uExpand;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        float u=aData.x,d=aData.y,s=aData.z,seed=aData.w;
        float reveal=s>.5?1.0-u:u;
        float born=smoothstep(reveal*.88,reveal*.88+.14,uBuild);
        float p=(s>.5?2.1:.3)+(seed-.5)*.55;
        float w1=sin(u*(s>.5?7.0:8.3)+d*3.1+p+uFlow*1.3);
        float w2=sin(u*(s>.5?15.0:16.2)-d*5.0+p*.7-uFlow*.72);
        vec3 wave=vec3(
          mix(-3.55,3.55,u)+(d-.5)*(s>.5?-.95:.85),
          (s>.5?-.35:-.08)+w1*.62+w2*.16+(d-.5)*.82,
          mix(-1.25,.65,d)+w2*.15
        );
        float th=u*6.2831853+s*3.14159265;
        float ph=(d*.94+.03)*3.14159265;
        vec3 sphere=vec3(sin(ph)*cos(th),cos(ph),sin(ph)*sin(th))*1.75;
        sphere.z*=.84;
        vec3 pos=mix(wave,sphere,uOrb);
        pos*=mix(1.0,3.8,uExpand);
        vec4 mv=modelViewMatrix*vec4(pos,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.15+d*2.6)*mix(1.0,1.30,uOrb);
        float edge=sin(3.14159265*u);
        vAlpha=born*uAlpha*edge*(.06+d*.38)*(1.0-uExpand*.86);
        vec3 blue=vec3(.043,.486,1.0);
        vec3 cyan=vec3(0.0,.78,.85);
        vec3 green=vec3(0.0,.90,.42);
        float ct=s>.5?1.0-u:u;
        vColor=ct<.55?mix(blue,cyan,ct/.55):mix(cyan,green,(ct-.55)/.45);
      }
    `,
    fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float r=dot(q,q);
        if(r>1.0)discard;
        float soft=1.0-smoothstep(.40,1.0,r);
        gl_FragColor=vec4(vColor,vAlpha*soft);
      }
    `,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  return new THREE.Points(geo,mat);
}

function createBackgroundSphere(){
  const geo=new THREE.SphereGeometry(20,28,18);
  const mat=new THREE.ShaderMaterial({
    uniforms:{uAlpha:{value:0}},
    vertexShader:`
      varying vec3 vPos;
      void main(){
        vPos=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying vec3 vPos;
      void main(){
        vec3 n=normalize(vPos);
        float t=clamp(n.x*.5+.5,0.0,1.0);
        vec3 a=vec3(.010,.030,.070);
        vec3 b=vec3(.00,.28,.43);
        vec3 c=vec3(.00,.48,.26);
        vec3 col=t<.58?mix(a,b,t/.58):mix(b,c,(t-.58)/.42);
        float glow=.72+.28*max(0.0,n.y*.45+.55);
        gl_FragColor=vec4(col*glow,uAlpha);
      }
    `,
    transparent:true,side:THREE.DoubleSide,depthWrite:false
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.scale.setScalar(.10);
  return mesh;
}

function sampleSourceMark(count){
  const out=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const q=seeded(i*4.71);
    const a=seeded(i*7.33)*TAU;
    let x,y,z;
    if(q<.34){
      const r=1.03+(seeded(i*2.11)-.5)*.10;
      x=Math.cos(a)*r;y=Math.sin(a)*r;z=(seeded(i*9.7)-.5)*.13;
    }else if(q<.84){
      const sector=((a/TAU)*32)%4;
      const ro=(sector>=1&&sector<3) ? .775 : .575;
      const r=lerp(.30,ro,Math.sqrt(seeded(i*1.37)));
      x=Math.cos(a)*r;y=Math.sin(a)*r;z=(seeded(i*5.2)-.5)*.22;
    }else{
      if(seeded(i*8.9)<.45){
        const r=.12*Math.sqrt(seeded(i*6.4));
        x=Math.cos(a)*r;y=Math.sin(a)*r;z=.14+(seeded(i*2.8)-.5)*.11;
      }else{
        const t=seeded(i*3.9);
        x=lerp(-.02,.40,t);y=lerp(-.01,.25,t)+(seeded(i*11.2)-.5)*.08;z=.14;
      }
    }
    out[i*3]=x;out[i*3+1]=y;out[i*3+2]=z;
  }
  return out;
}

function sampleTargetMark(count){
  const out=new Float32Array(count*3);
  const angles=[Math.PI/2,Math.PI/6,-Math.PI/6,-Math.PI/2,-5*Math.PI/6,5*Math.PI/6];
  for(let i=0;i<count;i++){
    const q=seeded(i*2.97);
    const a=seeded(i*7.21)*TAU;
    let x,y,z;
    if(q<.28){
      const u=seeded(i*4.31)*2-1;
      const rr=Math.sqrt(1-u*u);
      const r=.49;
      x=Math.cos(a)*rr*r;y=u*r;z=Math.sin(a)*rr*r;
    }else if(q<.48){
      const r=.78+(seeded(i*3.1)-.5)*.085;
      x=Math.cos(a)*r;y=Math.sin(a)*r;z=(seeded(i*6.8)-.5)*.11;
    }else{
      const k=Math.floor(seeded(i*5.77)*6)%6;
      const ak=angles[k];
      if(q<.62){
        const r=.118*Math.cbrt(seeded(i*9.9));
        const aa=seeded(i*10.7)*TAU;
        x=Math.cos(ak)*1.24+Math.cos(aa)*r;
        y=Math.sin(ak)*1.24+Math.sin(aa)*r;
        z=(seeded(i*1.91)-.5)*.22;
      }else if(q<.80){
        const t=seeded(i*8.17);
        const r=lerp(.83,1.10,t);
        x=Math.cos(ak)*r;y=Math.sin(ak)*r;z=(seeded(i*2.55)-.5)*.06;
      }else{
        const pa=ak-Math.PI/6;
        const cx=Math.cos(pa)*1.055,cy=Math.sin(pa)*1.055;
        const lx=(seeded(i*3.21)-.5)*.60;
        const ly=(seeded(i*4.93)-.5)*.24;
        x=cx+Math.cos(pa)*lx-Math.sin(pa)*ly;
        y=cy+Math.sin(pa)*lx+Math.cos(pa)*ly;
        z=(seeded(i*7.41)-.5)*.14;
      }
    }
    out[i*3]=x;out[i*3+1]=y;out[i*3+2]=z;
  }
  return out;
}

function collectTextPoints(root,count,offsetX){
  root.updateMatrixWorld(true);
  const invRoot=root.matrixWorld.clone().invert();
  const points=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    const p=o.geometry.getAttribute('position');
    const m=new THREE.Matrix4().multiplyMatrices(invRoot,o.matrixWorld);
    const v=new THREE.Vector3();
    for(let i=0;i<p.count;i+=2){
      v.fromBufferAttribute(p,i).applyMatrix4(m);
      points.push([v.x+offsetX,v.y,v.z]);
    }
  });
  const out=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const p=points[Math.floor(i*points.length/count)%points.length]||[0,0,0];
    out[i*3]=p[0];out[i*3+1]=p[1];out[i*3+2]=p[2];
  }
  return out;
}

function createFragmentMorph(from,to,maxCount,size){
  const base=new THREE.TetrahedronGeometry(size,0);
  const geo=new THREE.InstancedBufferGeometry();
  geo.index=base.index;
  geo.setAttribute('position',base.getAttribute('position'));
  geo.setAttribute('normal',base.getAttribute('normal'));
  geo.instanceCount=maxCount;
  geo.setAttribute('iFrom',new THREE.InstancedBufferAttribute(from,3));
  geo.setAttribute('iTo',new THREE.InstancedBufferAttribute(to,3));

  const seed=new Float32Array(maxCount);
  for(let i=0;i<maxCount;i++)seed[i]=seeded(i*8.71);
  geo.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{uMorph:{value:0},uAlpha:{value:0}},
    vertexShader:`
      attribute vec3 iFrom;
      attribute vec3 iTo;
      attribute float iSeed;
      uniform float uMorph;
      varying vec3 vNormal;
      varying vec3 vP;
      void main(){
        float m=smoothstep(0.0,1.0,uMorph);
        vec3 c=mix(iFrom,iTo,m);
        float arc=sin(m*3.14159265);
        float a=(iSeed-.5)*arc*1.1;
        float ca=cos(a),sa=sin(a);
        c.xz=mat2(ca,-sa,sa,ca)*c.xz;
        c.z+=arc*(.16+.42*iSeed);
        vec3 p=c+position*(1.0+arc*.55);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        vNormal=normalize(normalMatrix*normal);
        vP=c;
      }
    `,
    fragmentShader:`
      uniform float uAlpha;
      varying vec3 vNormal;
      varying vec3 vP;
      void main(){
        float t=clamp((vP.x+3.2)/6.4,0.0,1.0);
        vec3 b=vec3(.043,.486,1.0),c=vec3(0.0,.78,.85),g=vec3(0.0,.90,.42);
        vec3 col=t<.55?mix(b,c,t/.55):mix(c,g,(t-.55)/.45);
        vec3 L=normalize(vec3(-.4,.7,1.0));
        float lit=.44+.56*max(0.0,dot(normalize(vNormal),L));
        gl_FragColor=vec4(col*lit,uAlpha);
      }
    `,
    transparent:true,depthWrite:true
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  return mesh;
}

export class TGWorld3D{
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({
      canvas,alpha:true,antialias:true,
      powerPreference:'high-performance',
      preserveDrawingBuffer:false
    });
    this.renderer.setClearColor(0x030607,1);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.06;

    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,100);
    this.camera.position.set(0,0,10);

    this.scene.add(new THREE.HemisphereLight(0xaeeaff,0x061018,1.45));
    const key=new THREE.DirectionalLight(0xffffff,2.7);
    key.position.set(-4,5,8);this.scene.add(key);
    const cyan=new THREE.PointLight(0x00c7d9,24,12,2);
    cyan.position.set(-3,1,4);this.scene.add(cyan);
    const green=new THREE.PointLight(0x00e66b,20,12,2);
    green.position.set(4,-1,3);this.scene.add(green);

    this.bg=createBackgroundSphere();
    this.scene.add(this.bg);

    this.cloud=createCloud();
    this.scene.add(this.cloud);

    this.identity=new THREE.Group();
    this.scene.add(this.identity);

    this.sourceMark=createTGDevsMark();
    this.targetMark=createTGBCMark();
    this.sourceWord=createSourceWord();
    this.targetWord=createTargetWord();

    this.sourceMark.scale.setScalar(1.0);
    this.targetMark.scale.setScalar(1.0);
    this.sourceWord.scale.setScalar(1.0);
    this.targetWord.scale.setScalar(1.0);

    this.identity.add(this.sourceMark,this.sourceWord,this.targetMark,this.targetWord);
    materialOpacity(this.targetMark,0);
    materialOpacity(this.targetWord,0);

    const markCount=2200;
    this.markFragments=createFragmentMorph(
      sampleContourBrand(BRAND.tgdevsMark,markCount,2.0,0,0),
      sampleContourBrand(BRAND.tgbcMark,markCount,1.42,0,0),
      markCount,.014
    );
    this.identity.add(this.markFragments);
    this.markFragments.visible=false;

    this.wordFragments=null;

    this.scrollCue=createScrollCue();
    this.scene.add(this.scrollCue);

    this.textReady=false;
    this.last={p:0,portrait:false,width:1440,height:900};
    this._sizeKey="";
    this.initText();
  }

  async initText(){
    try{
      const json=await fetch('./vendor/helvetiker_bold.typeface.json',{cache:'force-cache'}).then(r=>{
        if(!r.ok)throw new Error('font');
        return r.json();
      });
      const font=new FontLoader().parse(json);

      this.slogans=[
        createSlogan('Sistemas que simplificam',font,.34),
        createSlogan('Sofisticados',font,.37),
        createSlogan('Prontos para o mundo moderno',font,.31),
        createSlogan('Perfeito para sua empresa',font,.34)
      ];
      this.slogans.forEach(s=>{this.scene.add(s);materialOpacity(s,0);});

      this.lead=createLead(font);
      this.scene.add(this.lead);
      materialOpacity(this.lead,0);

      this.textReady=true;
      document.documentElement.classList.add('world3d-ready');
      this.render(this.last);
      window.dispatchEvent(new Event('tgworldready'));
    }catch(e){
      document.documentElement.classList.add('world3d-font-failed');
    }
  }

  resize(w,h,portrait){
    const dpr=Math.min(devicePixelRatio||1,portrait?1.0:1.2);
    const key=w+"x"+h+"@"+dpr+"|"+(portrait?1:0);
    if(this._sizeKey===key)return;
    this._sizeKey=key;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;
    this.camera.fov=portrait?32:34;
    this.camera.position.z=portrait?12.4:10;
    this.camera.updateProjectionMatrix();

    this.cloud.geometry.setDrawRange(0,portrait?9000:16000);
    this.markFragments.geometry.instanceCount=portrait?1300:2200;
    if(this.wordFragments)this.wordFragments.geometry.instanceCount=portrait?2200:4200;
  }

  render(state){
    this.last=state;
    const p=state.p||0;
    const portrait=!!state.portrait;
    this.resize(state.width,state.height,portrait);

    const build=mix(p,.005,.13);
    const wordIn=mix(build,.54,.96);
    const sloganOut=1-mix(p,.185,.225);

    const orb=mix(p,.18,.265);
    const orbExpand=mix(p,.275,.365);
    const cloudAlpha=1-mix(p,.34,.405);
    const gradient=mix(p,.285,.365);

    const markCloud=mix(p,.285,.318);
    const wordCloud=mix(p,.195,.235);
    const morph=mix(p,.318,.395);
    const targetSolid=mix(p,.385,.42);
    const stageShift=mix(p,.30,.41);

    this.bg.material.uniforms.uAlpha.value=gradient;
    this.bg.scale.setScalar(lerp(.10,1,gradient));
    this.bg.rotation.y=lerp(-.25,.18,gradient);

    const cu=this.cloud.material.uniforms;
    cu.uBuild.value=build;
    cu.uAlpha.value=cloudAlpha;
    cu.uFlow.value=mix(p,.005,.36);
    cu.uOrb.value=orb;
    cu.uExpand.value=orbExpand;

    const track=this.sourceMark.userData.track;
    const progress=this.sourceMark.userData.progress;
    const full=progress.userData.fullCount||0;
    progress.geometry.setDrawRange(0,Math.floor(full*build));

    const officialSurface=this.sourceMark.userData.surface;
    const finalMark=mix(build,.86,.985);
    officialSurface.material.uniforms.uAngle.value=lerp(0,Math.PI*4,build);
    officialSurface.material.uniforms.uFull.value=finalMark;

    const centerTarget=mix(p,.34,.425);
    this.identity.position.set(0,portrait ? lerp(-.70,0,centerTarget) : 0,0);
    this.identity.scale.setScalar(portrait ? .72 : 1);
    this.identity.rotation.y=lerp(0,-.018,stageShift);

    materialOpacity(this.sourceMark,1-markCloud);
    materialOpacity(progress,(1-finalMark)*(1-markCloud));
    track.material.opacity=.18*(1-finalMark)*(1-markCloud)*(1-build*.82);
    officialSurface.material.uniforms.uAlpha.value=1-markCloud;

    this.markFragments.material.uniforms.uMorph.value=morph;
    this.markFragments.material.uniforms.uAlpha.value=markCloud*(1-targetSolid);
    this.markFragments.visible=markCloud>.001&&targetSolid<.999;

    materialOpacity(this.targetMark,targetSolid);
    this.targetMark.position.set(0,0,0);
    this.targetMark.scale.setScalar(portrait ? 1.18 : 1.42);

    const wordExit=mix(p,.19,.235);
    if(portrait){
      this.sourceWord.position.set(0,lerp(-1.18,-1.46,wordIn),lerp(-.12,-.42,wordExit));
      this.sourceWord.scale.setScalar(.78*lerp(1,.90,wordExit));
      this.sourceWord.rotation.y=0;
      this.sourceWord.rotation.x=lerp(0,-.06,wordExit);
    }else{
      this.sourceWord.position.set(lerp(.42,1.12,wordIn),-.01,lerp(-.12,-.44,wordExit));
      this.sourceWord.scale.setScalar(lerp(1,.90,wordExit));
      this.sourceWord.rotation.y=lerp(-.04,.08,wordExit);
      this.sourceWord.rotation.x=lerp(0,-.05,wordExit);
    }
    materialOpacity(this.sourceWord,wordIn*(1-wordExit)*(1-markCloud));

    const targetWordIn=mix(p,.392,.425);
    materialOpacity(this.targetWord,targetWordIn);
    if(portrait){
      this.targetWord.scale.setScalar(.22*lerp(.94,1,targetWordIn));
      this.targetWord.position.set(0,-1.48,lerp(-.35,0,targetWordIn));
      this.targetWord.rotation.y=0;
    }else{
      this.targetWord.scale.setScalar(.245*lerp(.94,1,targetWordIn));
      this.targetWord.position.set(1.52,-.01,lerp(-.35,0,targetWordIn));
      this.targetWord.rotation.y=lerp(-.06,0,targetWordIn);
    }

    if(this.wordFragments){
      this.wordFragments.visible=false;
      this.wordFragments.material.uniforms.uAlpha.value=0;
    }

    if(this.textReady){
      const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.185]];
      this.slogans.forEach((s,i)=>{
        const fade=.006;
        const a=Math.min(mix(p,ranges[i][0],ranges[i][0]+fade),1-mix(p,ranges[i][1]-fade,ranges[i][1]))*sloganOut;
        materialOpacity(s,a);
        if(portrait){
          s.position.set(0,2.55,0);
          s.rotation.y=0;
          s.scale.setScalar(.82);
          const width=s.children[0].userData.width*s.scale.x;
          s.position.x=-width/2;
        }else{
          const rawWidth=Math.max(.001,s.children[0].userData.width);
          const maxWidth=3.28;
          const textScale=Math.min(.88,maxWidth/rawWidth);
          s.scale.setScalar(textScale);
          s.position.set(-4.55,.06,0);
          s.rotation.y=.018;
        }
        s.position.z=lerp(-.10,.05,a);
      });

      const leadIn=mix(p,.35,.42);
      materialOpacity(this.lead,leadIn);
      this.lead.userData.line.scale.x=mix(p,.37,.435);
      if(portrait){
        this.lead.position.set(-1.58,2.35,0);
        this.lead.scale.setScalar(.80);
      }else{
        const leadWidth=Math.max(.001,this.lead.children[0].userData.width);
        this.lead.scale.setScalar(Math.min(.82,3.28/leadWidth));
        this.lead.position.set(-4.55,.18,.05);
      }
      this.lead.rotation.y=lerp(.11,0,leadIn);
      this.lead.position.z=lerp(-.35,.05,leadIn);
    }

    const cueOut=mix(p,.004,.028);
    materialOpacity(this.scrollCue,1-cueOut);
    if(portrait){
      this.scrollCue.position.set(0,-4.55,.2);
      this.scrollCue.scale.setScalar(.82);
    }else{
      this.scrollCue.position.set(0,-2.58,.2);
      this.scrollCue.scale.setScalar(.72);
    }
    this.scrollCue.rotation.x=.08;

    this.renderer.render(this.scene,this.camera);
  }
}
