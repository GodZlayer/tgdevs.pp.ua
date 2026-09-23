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
      if((m.userData?.tgMarkMaterial || m.userData?.tgClockMaterial) && m.uniforms?.uAlpha){
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
      const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8});
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
  const pts=sub.getPoints(320);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  pts.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const scale=targetHeight/220;
  const v=pts.map(p=>new THREE.Vector3((p.x-cx)*scale,-(p.y-cy)*scale,0));
  const curve=new THREE.CatmullRomCurve3(v,false,'centripetal');
  const radius=2.5*scale;
  const trackG=new THREE.TubeGeometry(curve,320,radius,12,false);
  const progressG=trackG.clone();
  addGradientColors(progressG,-targetHeight/2,targetHeight/2);
  const track=new THREE.Mesh(trackG,physicalSolid(0x11181b,.18));
  const ringMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:1});
  ringMat.toneMapped=false;
  const progress=new THREE.Mesh(progressG,ringMat);
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
  texture.generateMipmaps=true;
  texture.anisotropy=8;

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
        rgb=min(rgb*1.16,vec3(1.0));
        float alpha=(rotating.a*gearMask + fixedMark.a*outerMask*uFull)*uAlpha;
        if(alpha<.008)discard;

        gl_FragColor=vec4(rgb,alpha);
      }
    `
  });
  material.userData.tgMarkMaterial=true;
  material.toneMapped=false;

  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),material);
  mesh.position.z=.025;
  mesh.renderOrder=3;
  return mesh;
}

function createTGDevsMark(){
  const root=new THREE.Group();
  const surface=createOfficialTGDevsSurface();
  const vectorSurface=svgExtruded(
    TGDEVS_GEAR_SVG,
    2.0,
    .030,
    .0025
  );
  const ring=svgStrokeTube(TGDEVS_LOADER_SVG,2.0);

  ring.track.position.z=.005;
  ring.progress.position.z=.012;
  surface.position.z=.024;
  vectorSurface.position.z=.032;
  vectorSurface.traverse(o=>{
    if(o.isMesh)o.renderOrder=4;
  });
  materialOpacity(vectorSurface,0);

  root.add(
    ring.track,
    ring.progress,
    surface,
    vectorSurface
  );

  root.userData={
    track:ring.track,
    progress:ring.progress,
    surface,
    vectorSurface
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

function tgbcColorAtAngle(angle){
  const x=Math.cos(angle)*.5+.5;
  const blue=new THREE.Color('#087cff');
  const cyan=new THREE.Color('#00c9e7');
  const green=new THREE.Color('#00ed73');
  return x<.52 ? blue.clone().lerp(cyan,x/.52) : cyan.clone().lerp(green,(x-.52)/.48);
}

function tgbcSolid(color){
  const mat=new THREE.MeshPhysicalMaterial({
    color,
    roughness:.16,
    metalness:.018,
    clearcoat:.92,
    clearcoatRoughness:.085,
    transparent:true,
    opacity:1,
    emissive:color.clone().multiplyScalar(.055),
    emissiveIntensity:1
  });
  return mat;
}

function tgbcGradient(){
  return new THREE.MeshPhysicalMaterial({
    color:0xffffff,
    vertexColors:true,
    roughness:.15,
    metalness:.018,
    clearcoat:.94,
    clearcoatRoughness:.08,
    transparent:true,
    opacity:1,
    emissive:0x061d24,
    emissiveIntensity:.26
  });
}

function createTGBCPanel(angle){
  const w=.64,h=.30,c=.070;
  const sh=new THREE.Shape();
  sh.moveTo(-w/2+c,-h/2);
  sh.lineTo(w/2-c,-h/2);
  sh.lineTo(w/2,-h/2+c);
  sh.lineTo(w/2,h/2-c);
  sh.lineTo(w/2-c,h/2);
  sh.lineTo(-w/2+c,h/2);
  sh.lineTo(-w/2,h/2-c);
  sh.lineTo(-w/2,-h/2+c);
  sh.closePath();

  const geo=new THREE.ExtrudeGeometry(sh,{
    depth:.115,
    bevelEnabled:true,
    bevelThickness:.022,
    bevelSize:.018,
    bevelSegments:2
  });
  geo.center();

  const mat=tgbcSolid(tgbcColorAtAngle(angle));
  const mesh=new THREE.Mesh(geo,mat);
  mesh.rotation.z=angle+Math.PI/2;
  mesh.position.set(Math.cos(angle)*.865,Math.sin(angle)*.865,.015);
  return mesh;
}

function createTGBCRingArc(start,end,color){
  const curve=new ArcCurve(.625,start,end);
  const geo=new THREE.TubeGeometry(curve,28,.043,10,false);
  return new THREE.Mesh(geo,tgbcSolid(color));
}

function createTGBCNode(angle){
  const color=tgbcColorAtAngle(angle);
  const geo=new THREE.SphereGeometry(.158,24,16);
  const mesh=new THREE.Mesh(geo,tgbcSolid(color));
  mesh.position.set(Math.cos(angle)*1.145,Math.sin(angle)*1.145,.035);
  return mesh;
}

function createTGBCRadial(angle){
  const color=tgbcColorAtAngle(angle);
  const a=new THREE.Vector3(Math.cos(angle)*.665,Math.sin(angle)*.665,0);
  const b=new THREE.Vector3(Math.cos(angle)*1.005,Math.sin(angle)*1.005,0);
  return cylinderBetween(a,b,.024,tgbcSolid(color));
}

function createTGBCMark(){
  const root=new THREE.Group();

  const nodeAngles=[
    Math.PI/2,
    Math.PI/6,
    -Math.PI/6,
    -Math.PI/2,
    -5*Math.PI/6,
    5*Math.PI/6
  ];

  // First visible object: 12 o'clock sphere only.
  const first=new THREE.Group();
  first.add(createTGBCNode(nodeAngles[0]));
  root.add(first);

  // Then 12→2→4→6→8→10→12, each step adding its arc,
  // panel, radial connection and destination node.
  const steps=[];
  for(let i=0;i<6;i++){
    const from=nodeAngles[i];

    // Always advance clockwise by exactly 60 degrees.
    // This avoids the old wrap bug at 8h→10h→12h that duplicated sectors.
    const end=from-Math.PI/3;
    const mid=from-Math.PI/6;
    const destination=nodeAngles[(i+1)%6];

    const g=new THREE.Group();
    g.add(createTGBCRingArc(from,end,tgbcColorAtAngle(mid)));
    g.add(createTGBCPanel(mid));
    g.add(createTGBCRadial(destination));

    // 12h already exists as "first"; every other destination is created once.
    if(i<5)g.add(createTGBCNode(destination));

    root.add(g);
    steps.push(g);
  }

  // Central sphere is deliberately last.
  const center=new THREE.Group();
  const centerGeo=addGradientColors(new THREE.SphereGeometry(.525,36,24),-.54,.54);
  const centerSphere=new THREE.Mesh(centerGeo,tgbcGradient());
  centerSphere.position.z=.055;
  center.add(centerSphere);

  // Inner highlight rim around the core.
  const innerGeo=addGradientColors(new THREE.TorusGeometry(.585,.034,10,72),-.62,.62);
  const inner=new THREE.Mesh(innerGeo,tgbcGradient());
  center.add(inner);

  root.add(center);

  root.userData={
    first,
    steps,
    center,
    halfWidth:1.303,
    halfHeight:1.303
  };

  // Start hidden; render() reveals every physical group in clock order.
  materialOpacity(first,0);
  steps.forEach(g=>materialOpacity(g,0));
  materialOpacity(center,0);

  return root;
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

function createContourWordSurface(data,targetHeight,{businessLight=false,tgdevsPremium=false}={}){
  const ratio=data.ratio;
  const canvas=document.createElement('canvas');
  const H=tgdevsPremium?1024:512;
  const W=Math.max(256,Math.round(H*ratio));
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,W,H);

  for(const rec of data.shapes){
    const path=new Path2D();
    rec.p.forEach(([x,y],i)=>{
      const px=x/ratio*W;
      const py=(1-y)*H;
      i?path.lineTo(px,py):path.moveTo(px,py);
    });
    path.closePath();

    for(const hole of rec.h||[]){
      hole.forEach(([x,y],i)=>{
        const px=x/ratio*W;
        const py=(1-y)*H;
        i?path.lineTo(px,py):path.moveTo(px,py);
      });
      path.closePath();
    }

    const box=contourBBox(rec);

    if(tgdevsPremium){
      // Visual language calibrated from the supplied TGDesk master:
      // TG = cyan -> electric blue, Devs = white -> ice blue.
      // The glyph contours remain the exact TGDevs brand geometry.
      const isTG=box.cx<ratio*.39;
      const grad=ctx.createLinearGradient(0,0,0,H);

      if(isTG){
        grad.addColorStop(0,'#24E4FF');
        grad.addColorStop(.34,'#08CFF4');
        grad.addColorStop(.68,'#009BEE');
        grad.addColorStop(1,'#096BFF');
        ctx.shadowColor='rgba(0,145,255,.30)';
        ctx.shadowBlur=18*(H/1024);
      }else{
        grad.addColorStop(0,'#FFFFFF');
        grad.addColorStop(.42,'#F9FCFF');
        grad.addColorStop(.72,'#EAF4FF');
        grad.addColorStop(1,'#CDE4FF');
        ctx.shadowColor='rgba(130,205,255,.16)';
        ctx.shadowBlur=10*(H/1024);
      }

      ctx.fillStyle=grad;
      ctx.fill(path,'evenodd');

      // Fine polished edge taken from the same TGDesk text treatment.
      ctx.shadowBlur=0;
      ctx.strokeStyle=isTG?'rgba(220,251,255,.46)':'rgba(255,255,255,.58)';
      ctx.lineWidth=Math.max(1,1.45*(H/1024));
      ctx.stroke(path);
    }else{
      const light=businessLight && box.cx>1.8;
      ctx.fillStyle=light ? '#f0f5f7' : `rgb(${rec.c[0]},${rec.c[1]},${rec.c[2]})`;
      ctx.fill(path,'evenodd');
    }
  }

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=tgdevsPremium?8:1;

  const width=targetHeight*ratio;
  const root=new THREE.Group();

  const frontMat=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:true,alphaTest:.01
  });
  frontMat.toneMapped=false;

  const backMat=frontMat.clone();
  backMat.opacity=.82;

  const front=new THREE.Mesh(new THREE.PlaneGeometry(width,targetHeight),frontMat);
  front.position.z=.025;
  const back=new THREE.Mesh(new THREE.PlaneGeometry(width,targetHeight),backMat);
  back.position.z=-.025;

  root.add(back,front);
  root.userData={width,height:targetHeight};
  return root;
}

function createClockMaterial(){
  const mat=new THREE.ShaderMaterial({
    uniforms:{uBuild:{value:0},uAlpha:{value:1}},
    vertexColors:true,
    transparent:true,
    depthWrite:true,
    side:THREE.DoubleSide,
    vertexShader:`
      varying vec3 vColor;
      varying vec3 vP;
      varying vec3 vN;
      void main(){
        vColor=color;
        vP=position;
        vN=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform float uBuild;
      uniform float uAlpha;
      varying vec3 vColor;
      varying vec3 vP;
      varying vec3 vN;

      void main(){
        float r=length(vP.xy);
        float a=atan(vP.y,vP.x);
        float order=mod(1.57079632679-a+6.28318530718,6.28318530718)/6.28318530718;

        float outerBuild=clamp(uBuild/.88,0.0,1.0);
        float outer=smoothstep(order-.035,order+.075,outerBuild);

        float center=smoothstep(.90,1.0,uBuild);
        float mask=r<.18 ? center : outer;
        if(mask<.008)discard;

        vec3 L=normalize(vec3(-.35,.65,1.0));
        float lit=.84+.28*max(0.0,dot(normalize(vN),L));
        vec3 col=min(vColor*lit,vec3(1.0));
        gl_FragColor=vec4(col,uAlpha*mask);
      }
    `
  });
  mat.userData.tgClockMaterial=true;
  mat.toneMapped=false;
  return mat;
}

function applyClockBuild(root){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.material=createClockMaterial();
  });
  return root;
}

function createSourceWord(){
  return createContourWordSurface(
    BRAND.tgdevsWord,
    .46,
    {tgdevsPremium:true}
  );
}


function createTargetWord(){
  return createContourWordSurface(BRAND.tgbcWord,.40,{businessLight:true});
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
    const u=seeded(i*2.317);
    const v=seeded(i*5.731+.31);
    const side=i%2;
    const seed=seeded(i*11.17+.7);
    data[i*4]=u;
    data[i*4+1]=v;
    data[i*4+2]=side;
    data[i*4+3]=seed;
  }
  geo.setAttribute('aData',new THREE.BufferAttribute(data,4));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uBuild:{value:0},uAlpha:{value:1},uFlow:{value:0},
      uOrb:{value:0},uExpand:{value:0},uPortrait:{value:0}
    },
    vertexShader:`
      attribute vec4 aData;
      uniform float uBuild,uAlpha,uFlow,uOrb,uExpand,uPortrait;
      varying vec3 vColor;
      varying float vAlpha;

      void main(){
        float u=aData.x,v=aData.y,s=aData.z,seed=aData.w;

        float reveal=s>.5 ? 1.0-u : u;
        float born=smoothstep(reveal*.88,reveal*.88+.14,uBuild);

        float p=(s>.5?2.1:.3)+(seed-.5)*.55;
        float w1=sin(u*(s>.5?7.0:8.3)+v*3.1+p+uFlow*1.3);
        float w2=sin(u*(s>.5?15.0:16.2)-v*5.0+p*.7-uFlow*.72);

        vec3 wave=vec3(
          mix(-3.55,3.55,u)+(v-.5)*(s>.5?-.95:.85),
          (s>.5?-.35:-.08)+w1*.62+w2*.16+(v-.5)*.82,
          mix(-1.10,.50,v)+w2*.15
        );

        float theta=u*6.28318530718;
        float y=1.0-2.0*v;
        float radial=sqrt(max(0.0,1.0-y*y));
        float radius=mix(1.78,1.34,uPortrait);
        vec3 sphere=vec3(
          radial*cos(theta),
          y,
          radial*sin(theta)
        )*radius;

        vec3 pos=mix(wave,sphere,uOrb);
        pos*=mix(1.0,3.8,uExpand);

        vec4 mv=modelViewMatrix*vec4(pos,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.10+seed*2.25)*mix(1.0,1.28,uOrb);

        vAlpha=born*uAlpha*(.12+seed*.32)*(1.0-uExpand*.86);

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
        float soft=1.0-smoothstep(.38,1.0,r);
        gl_FragColor=vec4(vColor,vAlpha*soft);
      }
    `,
    transparent:true,
    depthWrite:false,
    depthTest:true,
    blending:THREE.AdditiveBlending
  });

  const points=new THREE.Points(geo,mat);
  points.renderOrder=9;
  return points;
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

function sampleObjectGeometry(root,count,finalScale=1){
  root.updateMatrixWorld(true);

  const inverseRoot=root.matrixWorld.clone().invert();
  const entries=[];
  let totalWeight=0;

  root.traverse(o=>{
    if(!o.isMesh || !o.geometry?.getAttribute('position'))return;

    const pos=o.geometry.getAttribute('position');
    if(!pos || pos.count<1)return;

    const localMatrix=new THREE.Matrix4().multiplyMatrices(
      inverseRoot,
      o.matrixWorld
    );

    const weight=Math.max(1,pos.count);
    totalWeight+=weight;
    entries.push({
      pos,
      localMatrix,
      weight,
      cumulative:totalWeight
    });
  });

  const out=new Float32Array(count*3);
  if(!entries.length)return out;

  const v=new THREE.Vector3();

  for(let i=0;i<count;i++){
    const pick=seeded(i*17.113+.91)*totalWeight;
    let entry=entries[entries.length-1];

    for(let j=0;j<entries.length;j++){
      if(pick<=entries[j].cumulative){
        entry=entries[j];
        break;
      }
    }

    const idx=Math.min(
      entry.pos.count-1,
      Math.floor(seeded(i*29.731+3.17)*entry.pos.count)
    );

    v.fromBufferAttribute(entry.pos,idx);
    v.applyMatrix4(entry.localMatrix);
    v.multiplyScalar(finalScale);

    const nz=(seeded(i*7.37+.2)-.5)*.006;

    out[i*3]=v.x;
    out[i*3+1]=v.y;
    out[i*3+2]=v.z+nz;
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
  const order=new Float32Array(maxCount);

  for(let i=0;i<maxCount;i++){
    const sd=seeded(i*8.71);
    seed[i]=sd;

    const x=to[i*3],y=to[i*3+1];
    const r=Math.hypot(x,y);
    if(r<.27){
      order[i]=.91+sd*.06;
    }else{
      const angle=Math.atan2(y,x);
      const clockwise=((Math.PI/2-angle+TAU)%TAU)/TAU;
      order[i]=clockwise*.84;
    }
  }

  geo.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));
  geo.setAttribute('iOrder',new THREE.InstancedBufferAttribute(order,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uBreak:{value:0},
      uClock:{value:0},
      uAlpha:{value:0}
    },
    vertexShader:`
      attribute vec3 iFrom;
      attribute vec3 iTo;
      attribute float iSeed;
      attribute float iOrder;

      uniform float uBreak;
      uniform float uClock;

      varying vec3 vNormal;
      varying vec3 vP;

      void main(){
        float breakup=smoothstep(0.0,1.0,uBreak);

        float phase=iSeed*6.28318530718;
        vec3 scatter=iFrom;
        scatter.xy+=vec2(cos(phase),sin(phase))*(.10+.26*iSeed)*breakup;
        scatter.z+=sin(phase*1.7)*(.12+.32*iSeed)*breakup;

        float local=smoothstep(iOrder-.035,iOrder+.085,uClock);
        vec3 c=mix(scatter,iTo,local);

        float motion=sin(local*3.14159265);
        c.z+=motion*(.10+.22*iSeed);

        vec3 p=c+position*(1.0+motion*.32);
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
        float t=clamp((vP.x+2.2)/4.4,0.0,1.0);
        vec3 b=vec3(.043,.486,1.0);
        vec3 c=vec3(0.0,.78,.85);
        vec3 g=vec3(0.0,.90,.42);
        vec3 col=t<.55?mix(b,c,t/.55):mix(c,g,(t-.55)/.45);

        vec3 L=normalize(vec3(-.4,.7,1.0));
        float lit=.72+.36*max(0.0,dot(normalize(vNormal),L));

        gl_FragColor=vec4(min(col*lit,vec3(1.0)),uAlpha);
      }
    `,
    transparent:true,
    depthWrite:true
  });

  mat.toneMapped=false;

  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=7;
  return mesh;
}


function uiMat(color,opacity=1){
  const m=new THREE.MeshStandardMaterial({
    color,
    roughness:.78,
    metalness:0,
    transparent:true,
    opacity,
    depthWrite:opacity>.96
  });
  m.toneMapped=false;
  return m;
}

function uiFlat(color,opacity=1){
  const m=new THREE.MeshBasicMaterial({
    color,
    transparent:true,
    opacity,
    side:THREE.DoubleSide,
    depthWrite:opacity>.96
  });
  m.toneMapped=false;
  return m;
}

function roundedShape(w,h,r){
  const x=-w/2,y=-h/2;
  const s=new THREE.Shape();
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y);
  s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);
  s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);
  s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);
  s.quadraticCurveTo(x,y,x+r,y);
  return s;
}

function uiCard(w,h,color=0xffffff,r=.12,depth=.026){
  const g=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{
    depth,
    bevelEnabled:false,
    curveSegments:6
  });
  g.translate(0,0,-depth/2);
  const m=new THREE.Mesh(g,uiMat(color));
  m.userData.uiBaseOpacity=1;
  return m;
}

function uiLine(w,h,color=0xe2e8f0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.012),uiFlat(color));
  m.userData.uiBaseOpacity=1;
  return m;
}

function uiText(text,font,size,color=0x0f172a,align='left',depth=.014){
  const g=new TextGeometry(text,{
    font,size,depth,
    curveSegments:2,
    bevelEnabled:false
  });
  g.computeBoundingBox();
  const b=g.boundingBox;
  const width=b.max.x-b.min.x;
  const height=b.max.y-b.min.y;
  let tx=-b.min.x;
  if(align==='center')tx=-(b.min.x+b.max.x)/2;
  if(align==='right')tx=-b.max.x;
  g.translate(tx,-(b.min.y+b.max.y)/2,-depth/2);
  const m=new THREE.Mesh(g,uiFlat(color));
  m.userData={width,height,uiBaseOpacity:1};
  return m;
}

function addUiText(parent,text,font,size,color,x,y,z=.08,align='left'){
  const m=uiText(text,font,size,color,align);
  m.position.set(x,y,z);
  parent.add(m);
  return m;
}

function addUiCard(parent,w,h,color,x,y,z=0,r=.12){
  const m=uiCard(w,h,color,r);
  m.position.set(x,y,z);
  parent.add(m);
  return m;
}

function createModuleGlyph(color=0x2563eb){
  const g=new THREE.Group();
  const a=uiLine(.18,.18,color);
  const b=uiLine(.18,.18,color);
  const c=uiLine(.18,.18,color);
  const d=uiLine(.18,.18,color);
  a.position.set(-.11,.11,0);
  b.position.set(.11,.11,0);
  c.position.set(-.11,-.11,0);
  d.position.set(.11,-.11,0);
  g.add(a,b,c,d);
  g.scale.setScalar(.42);
  return g;
}

function createDemoCustomerCard(font,name,doc,city,{highlight=false}={}){
  const g=new THREE.Group();
  const card=uiCard(2.75,1.05,highlight?0xeff6ff:0xffffff,.10,.026);
  g.add(card);
  if(highlight){
    const edge=uiCard(2.79,1.09,0x2563eb,.105,.010);
    edge.position.z=-.012;
    g.add(edge);
    card.position.z=.012;
  }
  addUiText(g,name,font,.135,0x0f172a,-1.17,.28,.09);
  addUiText(g,doc,font,.085,0x64748b,-1.17,.07,.09);
  addUiText(g,city,font,.082,0x64748b,-1.17,-.17,.09);
  const badge=uiCard(.50,.22,highlight?0xdbeafe:0xe0f2fe,.08,.015);
  badge.position.set(.95,.30,.08);g.add(badge);
  addUiText(g,highlight?'NOVO':'FISCAL',font,.065,highlight?0x1d4ed8:0x0369a1,.95,.30,.10,'center');
  return g;
}

function createAppTour(font){
  const root=new THREE.Group();
  root.visible=false;

  const W=12.8,H=7.2,headerH=.48,sideW=1.86,subH=.48;
  root.userData.W=W;
  root.userData.H=H;

  const shell=new THREE.Group();
  root.add(shell);

  const surface=uiCard(W,H,0xffffff,.015,.018);
  surface.position.z=-.78;
  shell.add(surface);

  const header=uiCard(W,headerH,0xf8fafc,.015,.016);
  header.position.set(0,H/2-headerH/2,-.56);
  shell.add(header);

  const sidebar=uiCard(sideW,H-headerH,0xf8fafc,.015,.016);
  sidebar.position.set(-W/2+sideW/2,-headerH/2,-.54);
  shell.add(sidebar);

  const headerBorder=uiLine(W,.010,0xe2e8f0);
  headerBorder.position.set(0,H/2-headerH,-.46);
  shell.add(headerBorder);

  const sideBorder=uiLine(.010,H-headerH,0xe2e8f0);
  sideBorder.position.set(-W/2+sideW,-headerH/2,-.46);
  shell.add(sideBorder);

  // Executive topbar — mirrors ExecutiveHubView.
  const headerDetails=new THREE.Group();
  shell.add(headerDetails);
  addUiText(headerDetails,'11.222.333/0001-81',font,.068,0x64748b,-3.35,3.34,.06);
  const env=uiCard(.82,.20,0xe2e8f0,.05,.010);
  env.position.set(-2.14,3.34,.05);headerDetails.add(env);
  addUiText(headerDetails,'HOMOLOGACAO',font,.057,0x475569,-2.14,3.34,.08,'center');
  const lic=uiCard(1.18,.22,0xffffff,.08,.012);
  lic.position.set(-.92,3.34,.05);headerDetails.add(lic);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),uiFlat(0x10b981));
  led.position.set(-1.39,3.34,.09);headerDetails.add(led);
  addUiText(headerDetails,'Licenca Corporativa',font,.057,0x475569,-1.25,3.34,.08);
  addUiText(headerDetails,'Administrador',font,.067,0x334155,5.45,3.38,.08,'right');
  addUiText(headerDetails,'Tier 5  •  Proprietario',font,.052,0x7c3aed,5.45,3.26,.08,'right');

  // Sidebar — exact module naming from ExecutiveHubView.
  const sidebarTitle=addUiText(shell,'MODULOS',font,.060,0x94a3b8,-5.92,2.73,.06);
  const navData=[
    ['Painel',2.38],
    ['Clientes',1.96],
    ['Estoque',1.54],
    ['Notas Fiscais',1.12],
    ['Estatisticas',.70],
    ['Servicos',.28]
  ];
  const navMeshes=[];
  navData.forEach(([label,y],i)=>{
    const holder=new THREE.Group();
    holder.position.set(-5.48,y,.03);
    const back=uiCard(1.46,.33,i===0?0x2563eb:0xf8fafc,.065,.014);
    holder.add(back);
    const icon=createModuleGlyph(i===0?0xffffff:0x64748b);
    icon.position.set(-.55,0,.04);
    holder.add(icon);
    const labelMesh=addUiText(holder,label,font,.086,i===0?0xffffff:0x475569,-.34,0,.06);
    shell.add(holder);
    navMeshes.push({holder,back,icon,labelMesh});
  });

  const lowerSep=uiLine(1.52,.010,0xe2e8f0);
  lowerSep.position.set(-5.47,-2.60,.02);shell.add(lowerSep);
  const cargos=new THREE.Group();
  cargos.position.set(-5.48,-2.88,.03);
  const cargosBack=uiCard(1.46,.33,0xf8fafc,.065,.014);
  cargos.add(cargosBack);
  const cargosIcon=createModuleGlyph(0x8b5cf6);cargosIcon.position.set(-.55,0,.04);cargos.add(cargosIcon);
  const cargosLabel=addUiText(cargos,'Cargos',font,.086,0x7c3aed,-.34,0,.06);
  shell.add(cargos);
  addUiText(shell,'v1.0  •  TGBC',font,.053,0x94a3b8,-5.92,-3.25,.05);

  // Content frame and persistent subheader.
  const contentX=-W/2+sideW;
  const contentW=W-sideW;
  const subheader=new THREE.Group();
  shell.add(subheader);
  const subBg=uiCard(contentW,subH,0xffffff,.01,.012);
  subBg.position.set(contentX+contentW/2,H/2-headerH-subH/2,-.40);
  subheader.add(subBg);
  const subLine=uiLine(contentW,.010,0xe2e8f0);
  subLine.position.set(contentX+contentW/2,H/2-headerH-subH,-.34);
  subheader.add(subLine);

  const searchBox=uiCard(3.25,.28,0xf8fafc,.05,.012);
  searchBox.position.set(contentX+.38+1.625,H/2-headerH-subH/2,.02);
  subheader.add(searchBox);

  const searchDash=addUiText(subheader,'Filtrar dados...',font,.064,0x94a3b8,contentX+.54,H/2-headerH-subH/2,.06);
  const searchClients=addUiText(subheader,'Buscar clientes...',font,.064,0x94a3b8,contentX+.54,H/2-headerH-subH/2,.07);
  materialOpacity(searchClients,0);
  const searchStock=addUiText(subheader,'Buscar no estoque por nome, SKU ou barras...',font,.060,0x94a3b8,contentX+.54,H/2-headerH-subH/2,.08);
  materialOpacity(searchStock,0);
  const searchGeneric=addUiText(subheader,'Filtrar dados...',font,.064,0x94a3b8,contentX+.54,H/2-headerH-subH/2,.09);
  materialOpacity(searchGeneric,0);

  const newBtnGroup=new THREE.Group();
  newBtnGroup.position.set(5.46,H/2-headerH-subH/2,.04);
  const newBtn=uiCard(1.20,.28,0x2563eb,.055,.014);
  newBtnGroup.add(newBtn);
  addUiText(newBtnGroup,'+  Novo Cliente',font,.062,0xffffff,0,0,.05,'center');
  subheader.add(newBtnGroup);
  materialOpacity(newBtnGroup,0);

  const contentRoot=new THREE.Group();
  contentRoot.position.set(.92,-.42,.05);
  root.add(contentRoot);

  // Current dashboard: four compact executive metrics, no legacy banner.
  const dashboard=new THREE.Group();
  contentRoot.add(dashboard);
  const metricCards=[];
  const metrics=[
    ['Clientes Ativos','128','Aptos para faturamento',0x10b981],
    ['Itens em Estoque','342','1.184 unidades fisicas',0x2563eb],
    ['Capital Imobilizado','R$ 84.720,00','Custo real de aquisicao',0x475569],
    ['Emissao Fiscal','Online','NFC-e e NF-e habilitadas',0x10b981]
  ];
  metrics.forEach((m,i)=>{
    const g=new THREE.Group();
    const x=-3.48+i*2.34;
    g.position.set(x,1.93,.02);
    const card=uiCard(2.12,1.18,0xf8fafc,.11,.025);
    g.add(card);
    addUiText(g,m[0],font,.077,0x64748b,-.86,.34,.06);
    addUiText(g,m[1],font,i===2?.155:(i===3?.145:.23),i===3?0x10b981:0x0f172a,-.86,-.02,.07);
    addUiText(g,m[2],font,.060,m[3],-.86,-.37,.06);
    dashboard.add(g);
    metricCards.push(g);
  });

  // Customers module: real table structure from ExecutiveHubView.
  const customers=new THREE.Group();
  contentRoot.add(customers);
  materialOpacity(customers,0);

  const tableFrame=uiCard(9.20,4.15,0xffffff,.08,.020);
  tableFrame.position.set(0,.10,0);
  customers.add(tableFrame);

  const tableHead=uiCard(9.16,.50,0xf1f5f9,.05,.014);
  tableHead.position.set(0,1.91,.04);
  customers.add(tableHead);

  const cols=[
    ['Cliente / Perfil',-4.10],
    ['Documento',-2.08],
    ['Localizacao',-.42],
    ['IE',1.25],
    ['Situacao',2.40],
    ['Acoes & Raio-X',3.88]
  ];
  cols.forEach(([t,x])=>addUiText(customers,t,font,.058,0x64748b,x,1.91,.08,x>3?'right':'left'));

  const rowData=[
    ['Horizonte Comercio Ltda','12.345.678/0001-90','Belo Horizonte/MG','062.123.456.0087'],
    ['Marina Oliveira','123.456.789-00','Contagem/MG','Isento'],
    ['Studio Aurora','98.765.432/0001-10','Nova Lima/MG','001.778.991.00-4'],
    ['Carlos Mendes','987.654.321-00','Betim/MG','Isento'],
    ['Mercado Central Demo','44.555.666/0001-77','Belo Horizonte/MG','062.840.110.0042'],
    ['Oficina Exemplo','22.333.444/0001-55','Sabara/MG','062.445.221.0010']
  ];

  const tableRows=[];
  rowData.forEach((r,i)=>{
    const row=new THREE.Group();
    const y=1.48-i*.61;
    row.position.set(0,y,.03);
    const sep=uiLine(9.05,.010,0xe2e8f0);sep.position.y=-.30;row.add(sep);
    const avatar=uiCard(.30,.30,0xf1f5f9,.055,.012);avatar.position.set(-4.12,0,.05);row.add(avatar);
    addUiText(row,r[0],font,.070,0x1e293b,-3.85,.08,.07);
    addUiText(row,i%2===0?'PJ  •  Consumidor':'PF  •  Consumidor',font,.048,0x94a3b8,-3.85,-.10,.07);
    addUiText(row,r[1],font,.057,0x475569,-2.08,0,.07);
    addUiText(row,r[2],font,.057,0x64748b,-.42,0,.07);
    addUiText(row,r[3],font,.054,0x64748b,1.25,0,.07);
    addUiText(row,'Pronto',font,.056,0x10b981,2.40,0,.07);
    const rx=uiCard(.58,.22,0xeff6ff,.04,.010);rx.position.set(3.63,0,.05);row.add(rx);
    addUiText(row,'Raio-X',font,.052,0x2563eb,3.63,0,.08,'center');
    const dots=addUiText(row,'••',font,.060,0x64748b,4.27,0,.08,'center');
    customers.add(row);
    tableRows.push(row);
  });

  const newRow=new THREE.Group();
  newRow.position.set(0,1.48,.12);
  const newBack=uiCard(9.08,.56,0xeff6ff,.05,.018);newRow.add(newBack);
  const newAvatar=uiCard(.30,.30,0xdbeafe,.055,.012);newAvatar.position.set(-4.12,0,.05);newRow.add(newAvatar);
  addUiText(newRow,'Cliente Novo',font,.070,0x1d4ed8,-3.85,.08,.08);
  addUiText(newRow,'PF  •  Consumidor',font,.048,0x64748b,-3.85,-.10,.08);
  addUiText(newRow,'000.111.222-33',font,.057,0x475569,-2.08,0,.08);
  addUiText(newRow,'Belo Horizonte/MG',font,.057,0x64748b,-.42,0,.08);
  addUiText(newRow,'Isento',font,.054,0x64748b,1.25,0,.08);
  addUiText(newRow,'Pronto',font,.056,0x10b981,2.40,0,.08);
  const novo=uiCard(.46,.20,0xdbeafe,.04,.010);novo.position.set(3.18,0,.08);newRow.add(novo);
  addUiText(newRow,'NOVO',font,.048,0x1d4ed8,3.18,0,.10,'center');
  customers.add(newRow);
  materialOpacity(newRow,0);

  // Real CustomerModal: dark header + stepper + three content states.
  const form=new THREE.Group();
  contentRoot.add(form);
  materialOpacity(form,0);

  const dim=uiCard(9.45,4.95,0x0f172a,.10,.018);
  dim.position.set(0,.10,-.10);form.add(dim);
  dim.material.opacity=.42;
  dim.material.transparent=true;

  const modal=uiCard(6.55,4.95,0xffffff,.14,.032);
  modal.position.set(0,.10,.02);form.add(modal);

  const modalHeader=uiCard(6.55,.66,0x0f172a,.08,.020);
  modalHeader.position.set(0,2.245,.06);form.add(modalHeader);
  addUiText(form,'Novo Cliente',font,.145,0xffffff,-2.72,2.34,.10);
  addUiText(form,'Cadastro Fiscal Completo  •  NF-e / SEFAZ',font,.060,0x94a3b8,-2.72,2.13,.10);
  addUiText(form,'×',font,.16,0x94a3b8,2.82,2.27,.10,'center');

  const stepper=uiCard(6.55,.58,0xf1f5f9,.01,.014);
  stepper.position.set(0,1.62,.05);form.add(stepper);

  const stepDots=[];
  const stepLabels=['Natureza','Identificacao','Endereco Inteligente'];
  [-1.72,0,1.72].forEach((x,i)=>{
    const d=uiCard(.25,.25,i===0?0x2563eb:0xe2e8f0,.12,.012);
    d.position.set(x,1.64,.08);form.add(d);
    addUiText(form,String(i+1),font,.060,i===0?0xffffff:0x64748b,x,1.64,.11,'center');
    const label=addUiText(form,stepLabels[i],font,.058,i===0?0x2563eb:0x94a3b8,x+.20,1.64,.11);
    stepDots.push({dot:d,label});
  });
  const stepLineA=uiLine(1.12,.018,0xe2e8f0);stepLineA.position.set(-.85,1.64,.08);form.add(stepLineA);
  const stepLineB=uiLine(1.12,.018,0xe2e8f0);stepLineB.position.set(.85,1.64,.08);form.add(stepLineB);

  const step1=new THREE.Group();form.add(step1);
  addUiText(step1,'Como voce deseja cadastrar este cliente?',font,.125,0x1e293b,0,1.06,.10,'center');
  addUiText(step1,'Selecione a natureza para adaptar os requisitos do cadastro.',font,.057,0x64748b,0,.84,.10,'center');

  const pfCard=uiCard(2.72,1.42,0xffffff,.12,.020);pfCard.position.set(-1.50,-.02,.07);step1.add(pfCard);
  const pjCard=uiCard(2.72,1.42,0xffffff,.12,.020);pjCard.position.set(1.50,-.02,.07);step1.add(pjCard);
  addUiText(step1,'Pessoa Fisica (PF)',font,.090,0x1e293b,-2.55,.32,.11);
  addUiText(step1,'Consumidor / Pessoa Fisica',font,.070,0x334155,-2.55,.08,.11);
  addUiText(step1,'Agil sem nota  •  ou  Com Nota Fiscal',font,.052,0x64748b,-2.55,-.20,.11);
  addUiText(step1,'Pessoa Juridica (Empresa / CNPJ)',font,.078,0x1e293b,.45,.32,.11);
  addUiText(step1,'Vendas B2B, atacado e faturamento',font,.060,0x64748b,.45,.05,.11);
  addUiText(step1,'Auto-preenchimento por CNPJ',font,.052,0x2563eb,.45,-.22,.11);

  const step2=new THREE.Group();form.add(step2);materialOpacity(step2,0);
  const fields2=[
    ['Nome / Razao Social',-1.55,.72,2.95,'Cliente Novo'],
    ['CPF / CNPJ',1.72,.72,2.45,'000.111.222-33'],
    ['E-mail',-1.55,-.02,2.95,'cliente@exemplo.com'],
    ['Celular / WhatsApp',1.72,-.02,2.45,'(31) 99999-0000'],
    ['Perfil do Cliente',-1.55,-.76,2.95,'Consumidor'],
    ['Indicador IE',1.72,-.76,2.45,'Nao Contribuinte']
  ];
  const fieldValues=[];
  fields2.forEach(([label,x,y,w,value])=>{
    addUiText(step2,label,font,.057,0x475569,x-w/2+.10,y+.23,.10);
    const box=uiCard(w,.36,0xf8fafc,.055,.012);box.position.set(x,y,.07);step2.add(box);
    const val=addUiText(step2,value,font,.061,0x1e293b,x-w/2+.14,y,.11);
    materialOpacity(val,0);
    fieldValues.push(val);
  });

  const step3=new THREE.Group();form.add(step3);materialOpacity(step3,0);
  const info=uiCard(5.72,.46,0xeff6ff,.08,.014);info.position.set(0,.95,.06);step3.add(info);
  addUiText(step3,'Endereco de Faturamento & Entrega',font,.078,0x1e3a8a,-2.55,.95,.10);
  const fields3=[
    ['CEP',-2.10,.38,1.30,'30110-028'],
    ['Logradouro',-.20,.38,2.25,'Av. Afonso Pena'],
    ['Numero',1.90,.38,1.25,'1000'],
    ['Bairro',-1.70,-.38,2.05,'Centro'],
    ['Municipio',.55,-.38,2.05,'Belo Horizonte'],
    ['UF',2.15,-.38,.75,'MG']
  ];
  const addressValues=[];
  fields3.forEach(([label,x,y,w,value])=>{
    addUiText(step3,label,font,.057,0x475569,x-w/2+.08,y+.21,.10);
    const box=uiCard(w,.34,0xf8fafc,.055,.012);box.position.set(x,y,.07);step3.add(box);
    const val=addUiText(step3,value,font,.058,0x1e293b,x-w/2+.10,y,.11);
    materialOpacity(val,0);
    addressValues.push(val);
  });
  const sefaz=uiCard(5.72,.34,0xf8fafc,.06,.012);sefaz.position.set(0,-1.02,.06);step3.add(sefaz);
  addUiText(step3,'Parametros tributarios SEFAZ pre-configurados para Pessoa Fisica.',font,.053,0x64748b,-2.55,-1.02,.10);

  const footer=uiCard(6.55,.56,0xf8fafc,.01,.014);footer.position.set(0,-2.08,.06);form.add(footer);
  const cancelBtn=uiCard(.88,.28,0xe2e8f0,.055,.012);cancelBtn.position.set(-2.35,-2.08,.09);form.add(cancelBtn);
  addUiText(form,'Cancelar',font,.058,0x475569,-2.35,-2.08,.12,'center');
  const actionBtn=uiCard(1.24,.30,0x2563eb,.055,.014);actionBtn.position.set(2.24,-2.08,.09);form.add(actionBtn);
  const action1=addUiText(form,'Continuar',font,.060,0xffffff,2.24,-2.08,.12,'center');
  const action2=addUiText(form,'Avancar',font,.060,0xffffff,2.24,-2.08,.13,'center');materialOpacity(action2,0);
  const action3=addUiText(form,'Concluir & Salvar',font,.052,0xffffff,2.24,-2.08,.14,'center');materialOpacity(action3,0);


  // ------------------------------------------------------------
  // Remaining TGBC modules — screen previews only, no modal demos.
  // ------------------------------------------------------------
  function screenRoot(){
    const g=new THREE.Group();
    contentRoot.add(g);
    materialOpacity(g,0);
    return g;
  }

  // ESTOQUE & WMS
  const stockScreen=screenRoot();
  const stockSummary=uiCard(9.20,1.05,0xf8fafc,.10,.022);
  stockSummary.position.set(0,1.82,0);stockScreen.add(stockSummary);
  const stockStats=[
    ['CUSTO TOTAL (FIFO)','R$ 84.720,00',0x0f172a],
    ['PRECO DE VENDA TOTAL','R$ 136.480,00',0x059669],
    ['MARGEM BRUTA ESTIMADA','37,9%  (R$ 51.760,00)',0x2563eb],
    ['ALERTAS DE REPOSICAO','3 abaixo / 1 zerado',0xd97706]
  ];
  stockStats.forEach((m,i)=>{
    const x=-3.72+i*2.47;
    addUiText(stockScreen,m[0],font,.050,0x94a3b8,x,2.05,.08);
    addUiText(stockScreen,m[1],font,i===2?.080:.105,m[2],x,1.72,.08);
  });
  const filterBar=uiCard(9.20,.54,0xf8fafc,.08,.018);filterBar.position.set(0,.98,.01);stockScreen.add(filterBar);
  addUiText(stockScreen,'Filtros:',font,.055,0x94a3b8,-4.18,.98,.07);
  [['Todos (342)',-3.30,0x2563eb,0xffffff],['Comercial (298)',-2.05,0xffffff,0x475569],['Inventario (44)',-.72,0xffffff,0x475569],['Abaixo do Minimo',.72,0xffffff,0xd97706],['Zerados',2.15,0xffffff,0xdc2626],['Ocultos (4)',3.36,0xffffff,0x64748b]].forEach(([t,x,bg,fg])=>{
    const c=uiCard(t==='Abaixo do Minimo'?1.25:(t==='Comercial (298)'?1.16:.92),.27,bg,.13,.012);c.position.set(x,.98,.05);stockScreen.add(c);
    addUiText(stockScreen,t,font,.049,fg,x,.98,.08,'center');
  });
  const stockTable=uiCard(9.20,3.15,0xffffff,.07,.020);stockTable.position.set(0,-.90,.01);stockScreen.add(stockTable);
  const stockHead=uiCard(9.16,.46,0xf1f5f9,.05,.012);stockHead.position.set(0,.42,.04);stockScreen.add(stockHead);
  [['Item / SKU',-3.88],['Destino',-2.17],['EAN / NCM',-.83],['Saldo',.82],['Minimo',1.73],['Custo',2.54],['Venda',3.31],['Saude',4.03]].forEach(([t,x])=>addUiText(stockScreen,t,font,.049,0x64748b,x,.42,.07,x>0?'center':'left'));
  const stockRows=[
    ['Notebook Pro 14','NB-PRO-14','Comercial','7891000011223','32','5','R$ 2.740','R$ 4.390','Normal'],
    ['Mouse Wireless','MOU-WL-02','Comercial','7891000098765','8','10','R$ 74','R$ 149','Baixo'],
    ['SSD NVMe 1TB','SSD-1T-NV4','Inventario','7891000044556','21','6','R$ 310','R$ 529','Normal'],
    ['Teclado Mecanico','TEC-MEC-RGB','Comercial','7891000088990','0','4','R$ 180','R$ 329','Zerado'],
    ['Monitor 27 IPS','MON-27-IPS','Comercial','7891000033445','14','3','R$ 690','R$ 1.099','Normal']
  ];
  stockRows.forEach((r,i)=>{
    const y=.03-i*.57;
    const sep=uiLine(9.02,.009,0xe2e8f0);sep.position.set(0,y-.28,.05);stockScreen.add(sep);
    addUiText(stockScreen,r[0],font,.059,0x1e293b,-3.88,y+.07,.08);
    addUiText(stockScreen,r[1],font,.043,0x94a3b8,-3.88,y-.10,.08);
    addUiText(stockScreen,r[2],font,.049,r[2]==='Inventario'?0xd97706:0x2563eb,-2.17,y,.08);
    addUiText(stockScreen,r[3],font,.047,0x64748b,-.83,y,.08);
    addUiText(stockScreen,r[4],font,.055,0x0f172a,.82,y,.08,'center');
    addUiText(stockScreen,r[5],font,.050,0x64748b,1.73,y,.08,'center');
    addUiText(stockScreen,r[6],font,.050,0x64748b,2.54,y,.08,'center');
    addUiText(stockScreen,r[7],font,.050,0x334155,3.31,y,.08,'center');
    addUiText(stockScreen,r[8],font,.049,r[8]==='Normal'?0x059669:(r[8]==='Baixo'?0xd97706:0xdc2626),4.03,y,.08,'center');
  });

  // NOTAS FISCAIS / CENTRAL SEFAZ
  const fiscalScreen=screenRoot();
  const fiscalStatus=uiCard(9.20,.78,0xf8fafc,.10,.022);fiscalStatus.position.set(0,1.96,.01);fiscalScreen.add(fiscalStatus);
  const shield=uiCard(.36,.36,0xecfdf5,.08,.012);shield.position.set(-4.05,1.96,.05);fiscalScreen.add(shield);
  addUiText(fiscalScreen,'Comando Fiscal SEFAZ',font,.090,0x0f172a,-3.72,2.08,.08);
  addUiText(fiscalScreen,'TGDevs Demo  •  11.222.333/0001-81  •  HOMOLOGACAO',font,.052,0x64748b,-3.72,1.83,.08);
  const cert=uiCard(1.05,.23,0xd1fae5,.06,.012);cert.position.set(-1.55,2.08,.05);fiscalScreen.add(cert);
  addUiText(fiscalScreen,'Certificado Ativo',font,.049,0x047857,-1.55,2.08,.08,'center');
  [['Diagnostico mTLS',3.08,0xffffff,0x475569],['+ Certificado',4.18,0x2563eb,0xffffff]].forEach(([t,x,bg,fg])=>{
    const c=uiCard(1.35,.28,bg,.06,.012);c.position.set(x,1.96,.05);fiscalScreen.add(c);
    addUiText(fiscalScreen,t,font,.050,fg,x,1.96,.08,'center');
  });
  const fiscalTabs=['NFC-e','NF-e','NFS-e','Cargas MDF-e/CT-e','Historico','Eventos'];
  fiscalTabs.forEach((t,i)=>{
    const x=-3.95+i*1.48;
    addUiText(fiscalScreen,t,font,.054,i===0?0x2563eb:0x64748b,x,1.30,.07);
    if(i===0){const line=uiLine(.66,.025,0x2563eb);line.position.set(x+.23,1.14,.06);fiscalScreen.add(line);}
  });
  addUiText(fiscalScreen,'Minutas & Vendas NFC-e (Consumidor Final)',font,.115,0x0f172a,-4.10,.73,.08);
  addUiText(fiscalScreen,'Emissao rapida com DANFE termico e QR Code homologado',font,.056,0x64748b,-4.10,.49,.08);
  const draftBtn=uiCard(1.35,.30,0x2563eb,.06,.013);draftBtn.position.set(3.92,.66,.05);fiscalScreen.add(draftBtn);
  addUiText(fiscalScreen,'+ Nova Minuta NFC-e',font,.050,0xffffff,3.92,.66,.08,'center');
  const fiscalTable=uiCard(9.20,2.62,0xffffff,.07,.020);fiscalTable.position.set(0,-.92,.01);fiscalScreen.add(fiscalTable);
  const fiscalHead=uiCard(9.16,.44,0xf1f5f9,.05,.012);fiscalHead.position.set(0,.16,.04);fiscalScreen.add(fiscalHead);
  [['Serie',-4.02],['Consumidor',-2.93],['Itens',-.98],['Valor Total',.35],['Status Fiscal',1.87],['Acoes',3.85]].forEach(([t,x])=>addUiText(fiscalScreen,t,font,.050,0x64748b,x,.16,.07));
  const drafts=[
    ['Serie 1','Marina Oliveira','3 itens','R$ 428,70','Pronta'],
    ['Serie 1','Consumidor nao identificado','1 item','R$ 149,00','Rascunho'],
    ['Serie 2','Horizonte Comercio Ltda','8 itens','R$ 4.832,40','Pronta'],
    ['Serie 1','Carlos Mendes','2 itens','R$ 678,00','Pronta']
  ];
  drafts.forEach((r,i)=>{
    const y=-.23-i*.52;const sep=uiLine(9.0,.009,0xe2e8f0);sep.position.set(0,y-.25,.05);fiscalScreen.add(sep);
    addUiText(fiscalScreen,r[0],font,.052,0x475569,-4.02,y,.08);
    addUiText(fiscalScreen,r[1],font,.055,0x1e293b,-2.93,y,.08);
    addUiText(fiscalScreen,r[2],font,.051,0x64748b,-.98,y,.08);
    addUiText(fiscalScreen,r[3],font,.055,0x0f172a,.35,y,.08);
    addUiText(fiscalScreen,r[4],font,.052,r[4]==='Pronta'?0x059669:0x94a3b8,1.87,y,.08);
    const emit=uiCard(.62,.22,r[4]==='Pronta'?0x059669:0xe2e8f0,.04,.010);emit.position.set(3.67,y,.06);fiscalScreen.add(emit);
    addUiText(fiscalScreen,r[4]==='Pronta'?'Emitir':'Editar',font,.046,r[4]==='Pronta'?0xffffff:0x64748b,3.67,y,.09,'center');
  });

  // ESTATISTICAS & INTELIGENCIA
  const statsScreen=screenRoot();
  const statsHeader=uiCard(9.20,.92,0xf8fafc,.10,.022);statsHeader.position.set(0,1.92,.01);statsScreen.add(statsHeader);
  addUiText(statsScreen,'Estatisticas & Inteligencia',font,.150,0x0f172a,-4.03,2.10,.08);
  addUiText(statsScreen,'2026-09',font,.060,0x475569,3.25,2.09,.08);
  const statsTabs=['Correlacoes','DRE & DuPont','Fluxo de Caixa','Unit Economics & ABC','What-If','Livro Caixa'];
  statsTabs.forEach((t,i)=>{
    const widths=[.88,1.05,1.08,1.45,.72,.82];
    const x=[-4.0,-2.85,-1.48,.20,1.75,2.78][i];
    const card=uiCard(widths[i],.25,i===0?0x2563eb:0xffffff,.05,.010);card.position.set(x,1.73,.04);statsScreen.add(card);
    addUiText(statsScreen,t,font,.045,i===0?0xffffff:0x64748b,x,1.73,.07,'center');
  });
  const kpis=[
    ['Receita Liquida','R$ 218.400','Bruta: R$ 236.900',0x0f172a],
    ['EBITDA (LAJIDA)','R$ 46.280','Margem: 21,2%',0x0f172a],
    ['Lucro Liquido','R$ 31.920','Margem: 14,6%',0x059669],
    ['Capital em Estoque','R$ 84.720','Venda: R$ 136.480',0x0f172a],
    ['Caixa & Runway','R$ 192.000','8,4 meses',0x0f172a],
    ['Retorno ROE','35,4%','ROA: 26,8%',0xdb2777]
  ];
  kpis.forEach((m,i)=>{
    const x=-3.82+i*1.53;
    const c=uiCard(1.39,.88,0xf8fafc,.09,.018);c.position.set(x,.90,.02);statsScreen.add(c);
    addUiText(statsScreen,m[0],font,.045,0x64748b,x-.58,1.12,.06);
    addUiText(statsScreen,m[1],font,.082,m[3],x-.58,.86,.07);
    addUiText(statsScreen,m[2],font,.040,i===1?0x2563eb:(i===2?0x64748b:(i===4?0x7c3aed:0x64748b)),x-.58,.61,.07);
  });
  const chartTitles=['Faturamento & Margens','Canais B2B vs B2C','Capital Imobilizado'];
  chartTitles.forEach((t,i)=>{
    const x=-3.08+i*3.08;
    const c=uiCard(2.82,2.36,0xf8fafc,.10,.020);c.position.set(x,-.92,.01);statsScreen.add(c);
    addUiText(statsScreen,t,font,.062,0x1e293b,x-1.17,-.05,.07);
    const centerX=x, centerY=-1.05;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.12,10,36),uiFlat(i===0?0x2563eb:(i===1?0x8b5cf6:0x10b981)));
    ring.position.set(centerX,centerY,.08);statsScreen.add(ring);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(.31,.075,8,30),uiFlat(i===0?0xf59e0b:(i===1?0x3b82f6:0x2563eb)));
    ring2.position.set(centerX,centerY,.09);statsScreen.add(ring2);
    addUiText(statsScreen,i===0?'15% lucro':(i===1?'62% B2C':'342 SKUs'),font,.052,0x475569,centerX,centerY,.12,'center');
  });

  // SERVICOS & OS
  const servicesScreen=screenRoot();
  const serviceTop=uiCard(9.20,.58,0xffffff,.06,.018);serviceTop.position.set(0,2.15,.01);servicesScreen.add(serviceTop);
  const serviceTabs=['Ordens de Servico','Contratos','Faturas','Catalogo'];
  serviceTabs.forEach((t,i)=>{
    const x=-3.58+i*1.55;
    const card=uiCard(1.42,.28,i===0?0xeff6ff:0xffffff,.06,.010);card.position.set(x,2.15,.05);servicesScreen.add(card);
    addUiText(servicesScreen,t,font,.050,i===0?0x2563eb:0x64748b,x,2.15,.08,'center');
  });
  const openChip=uiCard(.88,.26,0xf8fafc,.06,.010);openChip.position.set(2.90,2.15,.05);servicesScreen.add(openChip);
  addUiText(servicesScreen,'Abertas: 18',font,.049,0x475569,2.90,2.15,.08,'center');
  const revChip=uiCard(1.12,.26,0xf8fafc,.06,.010);revChip.position.set(3.92,2.15,.05);servicesScreen.add(revChip);
  addUiText(servicesScreen,'R$ 42.780,00',font,.049,0x059669,3.92,2.15,.08,'center');

  const serviceFilters=uiCard(9.20,.54,0xffffff,.09,.016);serviceFilters.position.set(0,1.48,.01);servicesScreen.add(serviceFilters);
  const serviceSearch=uiCard(5.05,.30,0xf8fafc,.055,.010);serviceSearch.position.set(-1.75,1.48,.04);servicesScreen.add(serviceSearch);
  addUiText(servicesScreen,'Filtrar por Codigo, Cliente, Aparelho ou Placa...',font,.051,0x94a3b8,-4.05,1.48,.07);
  [['Todos os Segmentos',1.62],['Todos os Status',3.18]].forEach(([t,x])=>{
    const c=uiCard(1.30,.30,0xf8fafc,.055,.010);c.position.set(x,1.48,.04);servicesScreen.add(c);
    addUiText(servicesScreen,t,font,.046,0x64748b,x,1.48,.07,'center');
  });
  const serviceTable=uiCard(9.20,3.70,0xffffff,.08,.020);serviceTable.position.set(0,-.72,.01);servicesScreen.add(serviceTable);
  const serviceHead=uiCard(9.16,.46,0xf8fafc,.05,.012);serviceHead.position.set(0,.88,.04);servicesScreen.add(serviceHead);
  [['Codigo',-4.10],['Objeto / Ativo',-3.00],['Cliente',-1.42],['Segmento',.18],['Previsao',1.42],['Status',2.42],['Valor Total',3.66]].forEach(([t,x])=>addUiText(servicesScreen,t,font,.048,0x64748b,x,.88,.07));
  const osRows=[
    ['OS-2026-041','Notebook Dell Latitude','Horizonte Comercio','INFORMATICA','24/09','EM EXECUCAO','R$ 680,00'],
    ['OS-2026-042','Fiesta 1.6 - Freios','Carlos Mendes','AUTOMOTIVO','25/09','AGUARDANDO PECAS','R$ 1.240,00'],
    ['OS-2026-043','iPhone 14 Pro','Marina Oliveira','SMARTPHONE','22/09','PRONTO','R$ 490,00'],
    ['OS-2026-044','Projeto Rede Loja','Studio Aurora','PROJETO TI','30/09','APROVADA','R$ 3.850,00'],
    ['OS-2026-045','Ar Condicionado Split','Mercado Central','CLIMATIZACAO','27/09','ORCAMENTO','R$ 920,00']
  ];
  osRows.forEach((r,i)=>{
    const y=.48-i*.59;const sep=uiLine(9.0,.009,0xe2e8f0);sep.position.set(0,y-.29,.05);servicesScreen.add(sep);
    addUiText(servicesScreen,r[0],font,.050,0x2563eb,-4.10,y,.08);
    addUiText(servicesScreen,r[1],font,.052,0x1e293b,-3.00,y,.08);
    addUiText(servicesScreen,r[2],font,.049,0x334155,-1.42,y,.08);
    addUiText(servicesScreen,r[3],font,.042,0x64748b,.18,y,.08);
    addUiText(servicesScreen,r[4],font,.045,0x64748b,1.42,y,.08);
    addUiText(servicesScreen,r[5],font,.041,r[5]==='PRONTO'?0x059669:(r[5]==='EM EXECUCAO'?0x4f46e5:0xd97706),2.42,y,.08);
    addUiText(servicesScreen,r[6],font,.050,0x0f172a,3.66,y,.08);
  });

  // CARGOS & FUNCIONARIOS
  const tiersScreen=screenRoot();
  const tierTop=uiCard(9.20,.56,0xffffff,.06,.018);tierTop.position.set(0,2.16,.01);tiersScreen.add(tierTop);
  const cargosTab=uiCard(1.05,.28,0xeff6ff,.06,.010);cargosTab.position.set(-3.95,2.16,.04);tiersScreen.add(cargosTab);
  addUiText(tiersScreen,'Cargos  5',font,.052,0x2563eb,-3.95,2.16,.07,'center');
  const funcTab=uiCard(1.26,.28,0xffffff,.06,.010);funcTab.position.set(-2.75,2.16,.04);tiersScreen.add(funcTab);
  addUiText(tiersScreen,'Funcionarios  12',font,.052,0x64748b,-2.75,2.16,.07,'center');
  const cargoBtn=uiCard(1.02,.28,0x2563eb,.06,.010);cargoBtn.position.set(4.02,2.16,.04);tiersScreen.add(cargoBtn);
  addUiText(tiersScreen,'+ Novo Cargo',font,.050,0xffffff,4.02,2.16,.07,'center');
  const tierData=[
    ['CEO / Dono','Nivel 5','Acesso total ao ecossistema',['CRM','STOCK','SERVICES','FISCAL','STATS'],0x8b5cf6],
    ['Gerente','Nivel 4','Gestao operacional e equipe',['CRM','STOCK','SERVICES','STATS'],0x2563eb],
    ['Fiscal','Nivel 3','Emissao e consulta fiscal',['CRM','FISCAL'],0x10b981],
    ['Atendimento','Nivel 2','Clientes, servicos e consultas',['CRM','SERVICES'],0xf59e0b],
    ['Estoque','Nivel 2','WMS, lotes e reposicao',['STOCK'],0x64748b]
  ];
  tierData.forEach((t,i)=>{
    const col=i%3,row=Math.floor(i/3);
    const x=-3.05+col*3.08,y=.88-row*1.52;
    const c=uiCard(2.78,1.28,0xffffff,.10,.020);c.position.set(x,y,.01);tiersScreen.add(c);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),uiFlat(t[5]));dot.position.set(x-1.13,y+.37,.08);tiersScreen.add(dot);
    addUiText(tiersScreen,t[0],font,.075,0x1e293b,x-.98,y+.37,.08);
    addUiText(tiersScreen,t[1],font,.047,t[5],x+.95,y+.37,.08,'right');
    addUiText(tiersScreen,t[2],font,.050,0x64748b,x-1.13,y+.12,.08);
    addUiText(tiersScreen,'Modulos Liberados',font,.042,0x94a3b8,x-1.13,y-.18,.08);
    t[3].forEach((m,j)=>{
      const bx=x-1.02+j*.48;const tag=uiCard(.42,.19,0xeff6ff,.04,.008);tag.position.set(bx,y-.42,.07);tiersScreen.add(tag);
      addUiText(tiersScreen,m,font,.035,0x2563eb,bx,y-.42,.10,'center');
    });
  });

  // Deterministic base/final row positions for the save transformation.
  const baseRows=tableRows.map(r=>r.position.clone());
  const shiftedRows=baseRows.map((v,i)=>{
    const out=v.clone();
    out.y=i===0?.87:v.y-.61;
    return out;
  });

  root.userData={
    shell,headerDetails,sidebarTitle,cargos,navMeshes,subheader,
    searchDash,searchClients,newBtnGroup,
    contentRoot,dashboard,metricCards,
    customers,tableHead,tableRows,newRow,baseRows,shiftedRows,
    form,dim,modal,pfCard,pjCard,step1,step2,step3,stepDots,stepLineA,stepLineB,
    fieldValues,addressValues,actionBtn,action1,action2,action3,
    stockScreen,fiscalScreen,statsScreen,servicesScreen,tiersScreen,
    searchStock,searchGeneric,cargosBack,cargosIcon,cargosLabel,
    W,H
  };
  return root;
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
    this.renderer.toneMappingExposure=1.18;

    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,100);
    this.camera.position.set(0,0,10);

    this.scene.add(new THREE.HemisphereLight(0xc8f4ff,0x061018,1.85));
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
    this.targetWordLight=createContourWordSurface(BRAND.tgbcWord,.40,{businessLight:false});

    this.sourceMark.scale.setScalar(1.0);
    this.targetMark.scale.setScalar(1.0);
    this.sourceWord.scale.setScalar(1.0);
    this.targetWord.scale.setScalar(1.0);

    this.identity.add(this.sourceMark,this.sourceWord,this.targetMark,this.targetWord,this.targetWordLight);
    materialOpacity(this.targetMark,0);
    materialOpacity(this.targetWord,0);
    materialOpacity(this.targetWordLight,0);

    const markCount=2200;

    // The particle target is sampled from the SAME physical TGBC object
    // rendered at the end of the sequence.
    const targetFavScale=1.0/this.targetMark.userData.halfWidth;
    const realTGBCPoints=sampleObjectGeometry(
      this.targetMark,
      markCount,
      targetFavScale
    );

    this.markFragments=createFragmentMorph(
      sampleContourBrand(BRAND.tgdevsMark,markCount,2.0,0,0),
      realTGBCPoints,
      markCount,.014
    );
    this.identity.add(this.markFragments);
    this.markFragments.visible=false;

    this.wordFragments=null;

    this.scrollCue=createScrollCue();
    this.scene.add(this.scrollCue);

    this.appTour=null;
    this.appBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(1,1),uiFlat(0xffffff,0));
    this.appBackdrop.position.z=-3.2;
    this.appBackdrop.visible=false;
    this.scene.add(this.appBackdrop);

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

      this.appTour=createAppTour(font);
      this.scene.add(this.appTour);
      materialOpacity(this.appTour,0);

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

    const cameraZ=this.camera.position.z;
    const halfH=Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*cameraZ;
    const viewH=halfH*2;
    const viewW=viewH*this.camera.aspect;
    this.viewW=viewW;
    this.viewH=viewH;

    if(this.appBackdrop){
      const planeDist=Math.abs(this.camera.position.z-this.appBackdrop.position.z);
      const planeH=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*planeDist;
      const planeW=planeH*this.camera.aspect;
      this.appBackdrop.scale.set(planeW*1.02,planeH*1.02,1);
    }

    if(this.appTour){
      const W=this.appTour.userData.W,H=this.appTour.userData.H;
      const fit=Math.min(viewW/W,viewH/H);
      this.appTour.scale.setScalar(fit);
      this.appTour.position.set(0,0,0);
    }

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
    const sloganOut=1-mix(p,.175,.225);

    // The world folds around the TGDevs identity while that identity dissolves.
    const orb=mix(p,.18,.285);
    const breakMark=mix(p,.205,.285);

    // The product is assembled clockwise after the world has closed around the logo.
    const clockBuild=mix(p,.265,.405);
    const productSettle=mix(p,.395,.43);

    // The sphere becomes the product environment/background.
    const orbExpand=mix(p,.315,.395);
    const gradient=mix(p,.325,.395);
    const cloudAlpha=1-mix(p,.355,.425);

    this.bg.material.uniforms.uAlpha.value=gradient;
    this.bg.scale.setScalar(lerp(.10,1,gradient));
    this.bg.rotation.y=lerp(-.18,.10,gradient);

    const cu=this.cloud.material.uniforms;
    cu.uBuild.value=build;
    cu.uAlpha.value=cloudAlpha;
    cu.uFlow.value=mix(p,.005,.34);
    cu.uOrb.value=orb;
    cu.uExpand.value=orbExpand;
    cu.uPortrait.value=portrait?1:0;

    // Absolute center: every favicon lives at the camera center in every screen ratio.
    this.identity.position.set(0,0,0);
    this.identity.scale.setScalar(portrait?.74:1);
    this.identity.rotation.set(0,0,0);

    const track=this.sourceMark.userData.track;
    const progress=this.sourceMark.userData.progress;
    const full=progress.userData.fullCount||0;
    progress.geometry.setDrawRange(0,Math.floor(full*build));

    const officialSurface=this.sourceMark.userData.surface;
    const vectorSurface=this.sourceMark.userData.vectorSurface;
    const finalMark=mix(build,.86,.985);
    const vectorIn=mix(finalMark,.92,1.0);
    officialSurface.material.uniforms.uAngle.value=lerp(0,Math.PI*4,build);
    officialSurface.material.uniforms.uFull.value=finalMark;

    materialOpacity(this.sourceMark,1-breakMark);
    materialOpacity(progress,(1-finalMark)*(1-breakMark));
    track.material.opacity=.18*(1-finalMark)*(1-breakMark)*(1-build*.82);
    officialSurface.material.uniforms.uAlpha.value=
      (1-breakMark)*(1-vectorIn);
    if(vectorSurface){
      materialOpacity(
        vectorSurface,
        (1-breakMark)*vectorIn
      );
    }

    // TGDevs materializes as particles while the outer cloud closes into a full sphere.
    this.markFragments.material.uniforms.uBreak.value=breakMark;
    this.markFragments.material.uniforms.uClock.value=clockBuild;
    const fragmentFade=breakMark*(1-mix(clockBuild,.88,1.0));
    this.markFragments.material.uniforms.uAlpha.value=fragmentFade;
    this.markFragments.visible=breakMark>.001&&fragmentFade>.001;

    // TGBC stays exactly at the camera center. Its physical pieces are
    // revealed in the requested clock order.
    this.targetMark.position.set(0,0,0);
    const favHalfExtent=this.targetMark.userData.halfWidth;
    const favVisualScale=1.0/favHalfExtent;
    this.targetMark.scale.setScalar(favVisualScale);
    this.targetMark.visible=clockBuild>.001;

    const firstBuild=mix(clockBuild,0.00,.10);
    materialOpacity(this.targetMark.userData.first,firstBuild);
    this.targetMark.userData.first.scale.setScalar(lerp(.72,1,firstBuild));

    this.targetMark.userData.steps.forEach((g,i)=>{
      const start=.08+i*.125;
      const end=start+.15;
      const local=mix(clockBuild,start,end);
      materialOpacity(g,local);
      g.scale.setScalar(lerp(.76,1,local));
      g.rotation.z=lerp(-.035,0,local);
    });

    const centerBuild=mix(clockBuild,.86,1.0);
    materialOpacity(this.targetMark.userData.center,centerBuild);
    this.targetMark.userData.center.scale.setScalar(lerp(.68,1,centerBuild));

    // TGDevs textlogo: center the text from its actual width, with the
    // left edge always outside the favicon.
    const wordExit=mix(p,.19,.255);
    if(portrait){
      const maxW=3.05;
      const fit=Math.min(.66,maxW/Math.max(.001,this.sourceWord.userData.width));
      const visibleH=this.sourceWord.userData.height*fit;
      this.sourceWord.scale.setScalar(fit);
      this.sourceWord.position.set(0,-1.0-.24-visibleH/2,lerp(-.08,-.34,wordExit));
    }else{
      const fit=Math.min(.92,3.10/Math.max(.001,this.sourceWord.userData.width));
      const visibleW=this.sourceWord.userData.width*fit;
      const finalX=1.0+.30+visibleW/2;
      this.sourceWord.scale.setScalar(fit);
      this.sourceWord.position.set(lerp(.42,finalX,wordIn),-.01,lerp(-.08,-.34,wordExit));
    }
    this.sourceWord.rotation.set(0,0,0);
    materialOpacity(this.sourceWord,wordIn*(1-wordExit));

    // Product textlogo only appears after the core has finished. Again,
    // its center is derived from its real width so it can never overlap the fav.
    const targetTextIn=mix(p,.405,.445)*centerBuild;
    if(portrait){
      const maxW=3.12;
      const fit=Math.min(.54,maxW/Math.max(.001,this.targetWord.userData.width));
      const visibleH=this.targetWord.userData.height*fit;
      this.targetWord.scale.setScalar(fit);
      this.targetWord.position.set(
        0,
        -1.0-.24-visibleH/2,
        lerp(-.20,0,targetTextIn)
      );
    }else{
      const fit=Math.min(.54,3.10/Math.max(.001,this.targetWord.userData.width));
      const visibleW=this.targetWord.userData.width*fit;
      const halfMark=1.0;
      const finalX=halfMark+.32+visibleW/2;
      this.targetWord.scale.setScalar(fit);
      this.targetWord.position.set(finalX,-.01,lerp(-.20,0,targetTextIn));
    }
    this.targetWord.rotation.set(0,0,0);
    materialOpacity(this.targetWord,targetTextIn);

    if(this.textReady){
      const ranges=[[0,.040],[.035,.075],[.070,.110],[.105,.185]];
      this.slogans.forEach((item,i)=>{
        const fade=.006;
        const a=Math.min(
          mix(p,ranges[i][0],ranges[i][0]+fade),
          1-mix(p,ranges[i][1]-fade,ranges[i][1])
        )*sloganOut;

        materialOpacity(item,a);

        if(portrait){
          const rawWidth=Math.max(.001,item.children[0].userData.width);
          const textScale=Math.min(.52,3.20/rawWidth);
          item.scale.setScalar(textScale);
          const visibleWidth=rawWidth*textScale;
          item.position.set(-visibleWidth/2,2.38,lerp(-.08,.05,a));
          item.rotation.set(0,0,0);
        }else{
          const rawWidth=Math.max(.001,item.children[0].userData.width);
          const textScale=Math.min(.80,3.20/rawWidth);
          item.scale.setScalar(textScale);
          item.position.set(-4.25,.05,lerp(-.08,.05,a));
          item.rotation.set(0,.012,0);
        }
      });

      const leadIn=targetTextIn;
      materialOpacity(this.lead,leadIn);
      this.lead.userData.line.scale.x=mix(p,.415,.455);

      if(portrait){
        const rawWidth=Math.max(.001,this.lead.children[0].userData.width);
        const textScale=Math.min(.48,3.20/rawWidth);
        this.lead.scale.setScalar(textScale);
        const visibleWidth=rawWidth*textScale;
        this.lead.position.set(-visibleWidth/2,2.18,lerp(-.24,.06,leadIn));
        this.lead.rotation.set(0,0,0);
      }else{
        const rawWidth=Math.max(.001,this.lead.children[0].userData.width);
        const textScale=Math.min(.74,3.15/rawWidth);
        this.lead.scale.setScalar(textScale);
        this.lead.position.set(-4.30,.18,lerp(-.24,.06,leadIn));
        this.lead.rotation.set(0,.01,0);
      }
    }


    // ------------------------------------------------------------
    // PHASE 2 — dense, deterministic TGBC product preview.
    // Every short scroll interval changes a real interface object.
    // ------------------------------------------------------------
    const appIn=mix(p,.440,.480);
    const headerIn=mix(p,.448,.486);
    const sidebarIn=mix(p,.456,.505);
    const subheaderIn=mix(p,.472,.510);

    const metricIn=[
      mix(p,.482,.505),
      mix(p,.497,.520),
      mix(p,.512,.535),
      mix(p,.527,.550)
    ];

    const clientsSelect=mix(p,.552,.580);
    const clientsIn=mix(p,.566,.612);

    const rowIn=[
      mix(p,.580,.598),
      mix(p,.590,.608),
      mix(p,.600,.618),
      mix(p,.610,.628),
      mix(p,.620,.638),
      mix(p,.630,.648)
    ];

    const buttonFocus=mix(p,.638,.658);
    const formOpen=mix(p,.650,.680);
    const choosePF=mix(p,.674,.700);
    const step2In=mix(p,.698,.730);
    const step3In=mix(p,.752,.785);
    const savePress=mix(p,.812,.832);
    const formClose=mix(p,.828,.858);
    const clientsReturn=mix(p,.842,.872);
    const newRowIn=mix(p,.858,.900);
    const settleNewRow=mix(p,.900,.955);

    if(this.appTour && this.textReady){
      const u=this.appTour.userData;
      const {
        shell,headerDetails,sidebarTitle,cargos,navMeshes,subheader,
        searchDash,searchClients,newBtnGroup,
        dashboard,metricCards,
        customers,tableHead,tableRows,newRow,baseRows,shiftedRows,
        form,dim,pfCard,pjCard,step1,step2,step3,stepDots,stepLineA,stepLineB,
        fieldValues,addressValues,actionBtn,action1,action2,action3
      }=u;

      this.appBackdrop.visible=appIn>.001;
      this.appBackdrop.material.opacity=appIn;

      this.appTour.visible=appIn>.001;
      materialOpacity(this.appTour,appIn);
      this.appTour.position.z=lerp(-.62,0,appIn);
      this.appTour.rotation.x=lerp(.052,0,appIn);
      this.appTour.rotation.y=lerp(-.038,0,appIn);

      // Shell itself materializes in physical layers rather than appearing at once.
      materialOpacity(shell,appIn);
      materialOpacity(headerDetails,headerIn);
      headerDetails.position.z=lerp(-.16,.02,headerIn);

      materialOpacity(sidebarTitle,sidebarIn);
      navMeshes.forEach((n,i)=>{
        const local=mix(p,.458+i*.006,.485+i*.006);
        materialOpacity(n.holder,local);
        n.holder.position.x=lerp(-5.68,-5.48,local);
        n.holder.position.z=lerp(-.12,.03,local);
      });
      const cargosIn=mix(p,.490,.515);
      materialOpacity(cargos,cargosIn);
      cargos.position.x=lerp(-5.68,-5.48,cargosIn);

      materialOpacity(subheader,subheaderIn);
      subheader.position.z=lerp(-.12,.02,subheaderIn);

      // Current dashboard from ExecutiveHubView: 4 compact metrics.
      materialOpacity(dashboard,1-clientsIn);
      metricCards.forEach((card,i)=>{
        const local=metricIn[i];
        const baseX=-3.48+i*2.34;
        const tableX=-3.54+i*2.35;
        materialOpacity(card,local*(1-clientsIn));
        card.position.x=lerp(baseX,tableX,clientsSelect);
        card.position.y=lerp(1.93,1.91,clientsSelect);
        card.position.z=lerp(-.14,.04,local)-clientsSelect*.10;
        card.scale.set(
          lerp(.90,1,local),
          lerp(.90,.38,clientsSelect),
          1
        );
      });

      // Sidebar selection and search field transform in place.
      navMeshes.forEach((n,i)=>{
        const active=i===0?(1-clientsSelect):(i===1?clientsSelect:0);
        n.back.material.color.setHex(active>.5?0x2563eb:0xf8fafc);
        n.labelMesh.material.color.setHex(active>.5?0xffffff:0x475569);
        n.icon.traverse(o=>{
          if(o.isMesh)o.material.color.setHex(active>.5?0xffffff:0x64748b);
        });
      });

      materialOpacity(searchDash,(1-clientsSelect)*subheaderIn);
      materialOpacity(searchClients,clientsSelect*subheaderIn);
      materialOpacity(newBtnGroup,clientsIn*(1-formOpen));
      newBtnGroup.scale.setScalar(1+.06*buttonFocus*(1-formOpen));
      newBtnGroup.position.z=.04+.08*buttonFocus;

      // Dashboard flattens into the table shell, then rows build one after another.
      materialOpacity(customers,clientsIn);
      materialOpacity(tableHead,clientsIn);
      tableHead.position.z=lerp(-.15,.04,clientsIn);

      tableRows.forEach((row,i)=>{
        const local=rowIn[i]*(1-formOpen)+clientsReturn;
        materialOpacity(row,local);
        const base=baseRows[i];
        const shifted=shiftedRows[i];
        const saveShift=newRowIn;
        row.position.x=base.x;
        row.position.y=lerp(base.y,shifted.y,saveShift);
        row.position.z=lerp(-.18,.03,rowIn[i])-formOpen*.10;
        row.scale.setScalar(lerp(.96,1,rowIn[i]));
      });

      // The real Novo Cliente action becomes the modal, instead of a cut.
      materialOpacity(form,formOpen*(1-formClose));
      form.position.set(
        lerp(3.75,0,formOpen),
        lerp(2.35,.08,formOpen),
        lerp(.42,.14,formOpen)
      );
      form.scale.setScalar(lerp(.055,1,formOpen)*(1-.06*formClose));
      form.rotation.z=lerp(-.025,0,formOpen);
      if(dim?.material){
        dim.material.opacity=.42*formOpen*(1-formClose);
        dim.material.depthWrite=false;
      }

      // Customer table remains physically behind the modal.
      const tableDim=formOpen*(1-formClose);
      customers.position.z=-.05-.16*tableDim;
      customers.scale.setScalar(1-.025*tableDim);

      // Step 1 — Natureza. The PF card is physically selected by scroll.
      materialOpacity(step1,(1-step2In)*formOpen);
      pfCard.position.z=.07+.10*choosePF;
      pfCard.scale.setScalar(1+.035*choosePF);
      pfCard.material.color.setHex(choosePF>.45?0xeff6ff:0xffffff);
      pjCard.position.z=.07-.025*choosePF;
      pjCard.scale.setScalar(1-.018*choosePF);

      // Step 2 — Identificação replaces the same modal content.
      materialOpacity(step2,step2In*(1-step3In)*formOpen);
      step2.position.x=lerp(.34,0,step2In);
      step2.position.z=lerp(-.10,.08,step2In);

      fieldValues.forEach((value,i)=>{
        const fill=mix(p,.708+i*.006,.720+i*.006);
        materialOpacity(value,fill*(1-step3In)*formOpen);
        value.position.z=.11+.035*fill;
      });

      // Step 3 — Endereço Inteligente uses the same card and stepper.
      materialOpacity(step3,step3In*formOpen);
      step3.position.x=lerp(.34,0,step3In);
      step3.position.z=lerp(-.10,.08,step3In);
      addressValues.forEach((value,i)=>{
        const fill=mix(p,.764+i*.006,.776+i*.006);
        materialOpacity(value,fill*formOpen);
        value.position.z=.11+.035*fill;
      });

      // Stepper itself advances, so even between content swaps something changes.
      const step2Active=step2In;
      const step3Active=step3In;
      stepDots[0].dot.material.color.setHex(step2Active>.25?0x10b981:0x2563eb);
      stepDots[0].label.material.color.setHex(step2Active>.25?0x059669:0x2563eb);
      stepDots[1].dot.material.color.setHex(step3Active>.25?0x10b981:(step2Active>.25?0x2563eb:0xe2e8f0));
      stepDots[1].label.material.color.setHex(step3Active>.25?0x059669:(step2Active>.25?0x2563eb:0x94a3b8));
      stepDots[2].dot.material.color.setHex(step3Active>.25?0x2563eb:0xe2e8f0);
      stepDots[2].label.material.color.setHex(step3Active>.25?0x2563eb:0x94a3b8);
      stepLineA.material.color.setHex(step2Active>.25?0x10b981:0xe2e8f0);
      stepLineB.material.color.setHex(step3Active>.25?0x2563eb:0xe2e8f0);

      materialOpacity(action1,(1-step2In)*formOpen);
      materialOpacity(action2,step2In*(1-step3In)*formOpen);
      materialOpacity(action3,step3In*formOpen);
      actionBtn.scale.setScalar(1-.08*savePress*(1-formClose));
      actionBtn.position.z=.09+.05*savePress;

      // Saving collapses the modal back into the very table it came from.
      if(formClose>.001){
        form.position.x=lerp(0,3.72,formClose);
        form.position.y=lerp(.08,2.35,formClose);
        form.position.z=lerp(.14,.32,formClose);
        form.scale.setScalar(lerp(1,.07,formClose));
      }

      // New record enters the exact first-row location while all rows move one slot.
      materialOpacity(newRow,newRowIn);
      newRow.position.y=1.48;
      newRow.position.z=lerp(.38,.12,newRowIn);
      newRow.scale.setScalar(lerp(.76,1.045,newRowIn));
      if(settleNewRow>.001){
        newRow.scale.setScalar(lerp(1.045,1,settleNewRow));
        newRow.position.z=lerp(.12,.05,settleNewRow);
      }

      // Restore customers screen fully as the modal disappears.
      const returnAlpha=Math.max(clientsIn*(1-formOpen),clientsReturn);
      materialOpacity(tableHead,returnAlpha);
      materialOpacity(customers,Math.max(clientsIn,clientsReturn));
      materialOpacity(newBtnGroup,Math.max(clientsIn*(1-formOpen),clientsReturn));

      // Abstract TGBC world becomes the actual light application surface.
      this.bg.material.uniforms.uAlpha.value=gradient*(1-appIn);
      this.cloud.material.uniforms.uAlpha.value=cloudAlpha*(1-appIn);
      this.markFragments.material.uniforms.uAlpha.value*=1-appIn;

      // Hero identity becomes the real topbar brand as one lockup.
      const uiScale=this.appTour.scale.x||1;
      const designW=this.appTour.userData.W;
      const designH=this.appTour.userData.H;
      const logoX=(-designW/2+.28)*uiScale;
      const logoY=(designH/2-.24)*uiScale;

      const rawFavHalf=this.targetMark.userData.halfWidth;
      const heroFavScale=1/rawFavHalf;
      const targetFavHeight=.24*uiScale;
      const appFavScale=targetFavHeight/(rawFavHalf*2);

      this.targetMark.position.set(
        lerp(0,logoX,appIn),
        lerp(0,logoY,appIn),
        lerp(0,.22,appIn)
      );
      this.targetMark.scale.setScalar(lerp(heroFavScale,appFavScale,appIn));

      materialOpacity(this.targetWord,(1-appIn)*targetTextIn);

      const lightWordH=targetFavHeight;
      const lightWordScale=lightWordH/Math.max(.001,this.targetWordLight.userData.height);
      const lightWordW=this.targetWordLight.userData.width*lightWordScale;
      this.targetWordLight.scale.setScalar(lightWordScale);
      this.targetWordLight.position.set(
        logoX+targetFavHeight/2+.055*uiScale+lightWordW/2,
        logoY,
        .22
      );
      materialOpacity(this.targetWordLight,appIn);

      materialOpacity(this.lead,(1-appIn)*targetTextIn);
    }


    // ------------------------------------------------------------
    // PHASE 3 — gallery of remaining TGBC modules.
    // No modal/function demos here: only the real module screens.
    // p > 1 is intentional; site3d-r16 extends the scroll beyond
    // the original 12,000px while preserving every r15 timestamp.
    // ------------------------------------------------------------
    if(this.appTour && this.textReady && p>.955){
      const u=this.appTour.userData;
      const {
        customers,newBtnGroup,subheader,searchDash,searchClients,searchStock,searchGeneric,
        navMeshes,cargos,cargosBack,cargosIcon,cargosLabel,
        stockScreen,fiscalScreen,statsScreen,servicesScreen,tiersScreen
      }=u;

      const afterClients=mix(p,.965,1.015);

      // Clients remains fully readable first, then exits as one completed state.
      materialOpacity(customers,1-afterClients);
      materialOpacity(newBtnGroup,1-afterClients);

      const stockIn=mix(p,.985,1.025);
      const stockOut=mix(p,1.105,1.135);
      const fiscalIn=mix(p,1.115,1.145);
      const fiscalOut=mix(p,1.235,1.265);
      const statsIn=mix(p,1.245,1.275);
      const statsOut=mix(p,1.365,1.395);
      const servicesIn=mix(p,1.375,1.405);
      const servicesOut=mix(p,1.495,1.525);
      const tiersIn=mix(p,1.505,1.535);

      const aStock=stockIn*(1-stockOut);
      const aFiscal=fiscalIn*(1-fiscalOut);
      const aStats=statsIn*(1-statsOut);
      const aServices=servicesIn*(1-servicesOut);
      const aTiers=tiersIn;

      const animateModule=(g,a,enter,leave)=>{
        materialOpacity(g,a);
        g.position.x=lerp(.30,0,enter)+lerp(0,-.25,leave);
        g.position.y=lerp(-.08,0,enter);
        g.position.z=lerp(-.18,.08,enter)-leave*.16;
        g.scale.setScalar(lerp(.965,1,enter));
      };

      animateModule(stockScreen,aStock,stockIn,stockOut);
      animateModule(fiscalScreen,aFiscal,fiscalIn,fiscalOut);
      animateModule(statsScreen,aStats,statsIn,statsOut);
      animateModule(servicesScreen,aServices,servicesIn,servicesOut);
      animateModule(tiersScreen,aTiers,tiersIn,0);

      // Contextual shell follows the current module, as in ExecutiveHubView.
      const genericPhase=Math.max(aFiscal,aStats);
      materialOpacity(searchDash,0);
      materialOpacity(searchClients,(1-afterClients));
      materialOpacity(searchStock,aStock);
      materialOpacity(searchGeneric,genericPhase);

      // Services and Cargos use their own module headers, so the global subheader disappears.
      const hideSub=Math.max(aServices,aTiers);
      materialOpacity(subheader,1-hideSub);

      let activeIndex=1; // Clientes
      if(p>=1.00)activeIndex=2;      // Estoque
      if(p>=1.12)activeIndex=3;      // Notas Fiscais
      if(p>=1.24)activeIndex=4;      // Estatisticas
      if(p>=1.37)activeIndex=5;      // Servicos
      const cargosActive=p>=1.50;

      navMeshes.forEach((n,i)=>{
        const active=!cargosActive && i===activeIndex;
        n.back.material.color.setHex(active?0x2563eb:0xf8fafc);
        n.labelMesh.material.color.setHex(active?0xffffff:0x475569);
        n.icon.traverse(o=>{
          if(o.isMesh)o.material.color.setHex(active?0xffffff:0x64748b);
        });
      });

      cargosBack.material.color.setHex(cargosActive?0x2563eb:0xf8fafc);
      cargosLabel.material.color.setHex(cargosActive?0xffffff:0x7c3aed);
      cargosIcon.traverse(o=>{
        if(o.isMesh)o.material.color.setHex(cargosActive?0xffffff:0x8b5cf6);
      });
      cargos.position.z=cargosActive?.09:.03;
      cargos.scale.setScalar(cargosActive?1.03:1);

      // Keep the application identity locked to the shell for the entire gallery.
      this.appBackdrop.visible=true;
      this.appBackdrop.material.opacity=1;
      materialOpacity(this.targetWordLight,1);
    }

    const cueOut=mix(p,.004,.028);
    materialOpacity(this.scrollCue,1-cueOut);
    this.scrollCue.position.set(0,portrait?-4.50:-2.58,.2);
    this.scrollCue.scale.setScalar(portrait?.76:.72);

    this.renderer.render(this.scene,this.camera);
  }
}
