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

function createContourWordSurface(data,targetHeight,{businessLight=false}={}){
  const ratio=data.ratio;
  const canvas=document.createElement('canvas');
  const H=512;
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
    const light=businessLight && box.cx>1.8;
    ctx.fillStyle=light ? '#f0f5f7' : `rgb(${rec.c[0]},${rec.c[1]},${rec.c[2]})`;
    ctx.fill(path,'evenodd');
  }

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;

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
  return createContourWordSurface(BRAND.tgdevsWord,.46);
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

  const W=12.8,H=7.2,headerH=.56,sideW=1.92;
  root.userData.designW=W;
  root.userData.designH=H;

  const shell=new THREE.Group();
  root.add(shell);

  const surface=uiCard(W,H,0xffffff,.02,.02);
  surface.position.z=-.75;shell.add(surface);

  const header=uiCard(W,headerH,0xf8fafc,.02,.02);
  header.position.set(0,H/2-headerH/2,-.48);shell.add(header);

  const sidebar=uiCard(sideW,H-headerH,0xf8fafc,.02,.02);
  sidebar.position.set(-W/2+sideW/2,-headerH/2,-.46);shell.add(sidebar);

  const headerBorder=uiLine(W,.012,0xe2e8f0);
  headerBorder.position.set(0,H/2-headerH,-.40);shell.add(headerBorder);
  const sideBorder=uiLine(.012,H-headerH,0xe2e8f0);
  sideBorder.position.set(-W/2+sideW,-headerH/2,-.40);shell.add(sideBorder);

  // Header data copied from TGBusinessCenter's real ExecutiveHub layout.
  addUiText(shell,'TGBusinessCenter',font,.145,0x1e293b,-5.30,3.31,.08);
  addUiText(shell,'11.222.333/0001-81',font,.075,0x64748b,-3.55,3.31,.08);
  const env=uiCard(.86,.22,0xe2e8f0,.06,.012);
  env.position.set(-2.15,3.31,.05);shell.add(env);
  addUiText(shell,'HOMOLOGACAO',font,.061,0x475569,-2.15,3.31,.08,'center');
  addUiText(shell,'Administrador',font,.075,0x334155,5.30,3.31,.08,'right');

  addUiText(shell,'MODULOS',font,.070,0x94a3b8,-5.83,2.65,.06);
  const nav=[
    ['Painel',2.30,true],
    ['Clientes',1.88,false],
    ['Estoque',1.46,false],
    ['Notas Fiscais',1.04,false],
    ['Estatisticas',.62,false],
    ['Servicos',.20,false]
  ];
  const navMeshes=[];
  nav.forEach(([label,y,active])=>{
    const holder=new THREE.Group();
    holder.position.set(-5.45,y,.03);
    const back=uiCard(1.45,.34,active?0x2563eb:0xf8fafc,.075,.016);
    holder.add(back);
    const icon=createModuleGlyph(active?0xffffff:0x64748b);
    icon.position.set(-.54,0,.04);holder.add(icon);
    addUiText(holder,label,font,.095,active?0xffffff:0x475569,-.34,0,.06);
    shell.add(holder);
    navMeshes.push({holder,back,label});
  });

  const contentRoot=new THREE.Group();
  contentRoot.position.set(.92,-.20,.05);
  root.add(contentRoot);

  const dashboard=new THREE.Group();
  contentRoot.add(dashboard);
  const banner=uiCard(8.85,1.25,0x0f172a,.16,.035);
  banner.position.set(0,2.15,0);dashboard.add(banner);
  const bannerGlow=uiCard(3.2,.05,0x2563eb,.02,.01);
  bannerGlow.position.set(-2.65,1.58,.04);dashboard.add(bannerGlow);
  addUiText(dashboard,'TGBusinessCenter',font,.24,0xffffff,-3.85,2.34,.08);
  addUiText(dashboard,'Central operacional, fiscal e comercial',font,.105,0xcbd5e1,-3.85,2.04,.08);

  const metrics=[
    ['Clientes Cadastrados','128','Gerenciar',-2.98,1.02,0xeff6ff,0x2563eb],
    ['Produtos no Catalogo','342','Gerenciar',0,1.02,0xeef2ff,0x4f46e5],
    ['API Fiscal','Conectado','Detalhes',2.98,1.02,0xecfdf5,0x059669]
  ];
  metrics.forEach(([title,value,action,x,y,bg,accent])=>{
    const card=uiCard(2.72,1.28,0xffffff,.12,.025);
    card.position.set(x,y,0);dashboard.add(card);
    const icon=uiCard(.36,.36,bg,.08,.015);icon.position.set(x+1.02,y+.35,.05);dashboard.add(icon);
    const glyph=createModuleGlyph(accent);glyph.position.set(x+1.02,y+.35,.08);dashboard.add(glyph);
    addUiText(dashboard,title,font,.082,0x64748b,x-1.12,y+.38,.08);
    addUiText(dashboard,value,font,value==='Conectado'?.16:.25,value==='Conectado'?0x059669:0x0f172a,x-1.12,y-.12,.08);
    addUiText(dashboard,action,font,.072,accent,x+1.08,y-.35,.08,'right');
  });

  const fiscal=uiCard(8.85,1.65,0xffffff,.12,.025);
  fiscal.position.set(0,-.72,0);dashboard.add(fiscal);
  addUiText(dashboard,'Conformidade Fiscal Integrada',font,.145,0x0f172a,-3.85,-.28,.08);
  addUiText(dashboard,'Validacao de destinatarios',font,.10,0x334155,-3.75,-.72,.08);
  addUiText(dashboard,'PF / PJ  •  IE  •  IBGE  •  enderecamento SEFAZ',font,.077,0x64748b,-3.75,-.96,.08);
  addUiText(dashboard,'Tributacao completa de itens',font,.10,0x334155,.45,-.72,.08);
  addUiText(dashboard,'NCM  •  CEST  •  CFOP  •  CSOSN  •  CST',font,.077,0x64748b,.45,-.96,.08);

  const customers=new THREE.Group();
  contentRoot.add(customers);
  materialOpacity(customers,0);

  const chead=uiCard(8.85,1.02,0xffffff,.12,.025);
  chead.position.set(0,2.25,0);customers.add(chead);
  addUiText(customers,'Clientes & Destinatarios',font,.215,0x0f172a,-3.85,2.42,.08);
  addUiText(customers,'Gestao cadastral fiscal e comercial',font,.090,0x64748b,-3.85,2.08,.08);
  const newBtn=uiCard(1.35,.38,0x2563eb,.08,.02);
  newBtn.position.set(3.55,2.26,.04);customers.add(newBtn);
  addUiText(customers,'+  Novo Cliente',font,.085,0xffffff,3.55,2.26,.08,'center');
  customers.userData.newButtonPos=new THREE.Vector3(3.55,2.26,.04);

  const search=uiCard(8.85,.65,0xffffff,.10,.022);
  search.position.set(0,1.28,0);customers.add(search);
  const searchInput=uiCard(4.55,.31,0xf8fafc,.06,.015);
  searchInput.position.set(-1.78,1.28,.04);customers.add(searchInput);
  addUiText(customers,'Buscar por nome, CPF/CNPJ ou e-mail...',font,.075,0x94a3b8,-3.82,1.28,.08);
  ['Modalidade','Tipo','Perfil'].forEach((t,i)=>{
    const b=uiCard(.96,.31,0xf8fafc,.06,.015);b.position.set(1.25+i*1.05,1.28,.04);customers.add(b);
    addUiText(customers,t,font,.065,0x475569,1.25+i*1.05,1.28,.08,'center');
  });

  const customerCards=[];
  const cdata=[
    ['Horizonte Comercio Ltda','CNPJ: 12.345.678/0001-90','Belo Horizonte/MG'],
    ['Marina Oliveira','CPF: 123.456.789-00','Contagem/MG'],
    ['Studio Aurora','CNPJ: 98.765.432/0001-10','Nova Lima/MG'],
    ['Carlos Mendes','CPF: 987.654.321-00','Betim/MG'],
    ['Mercado Central Demo','CNPJ: 44.555.666/0001-77','Belo Horizonte/MG'],
    ['Oficina Exemplo','CNPJ: 22.333.444/0001-55','Sabara/MG']
  ];
  cdata.forEach((d,i)=>{
    const card=createDemoCustomerCard(font,...d);
    const col=i%3,row=Math.floor(i/3);
    card.position.set(-2.95+col*2.95,.43-row*1.22,0);
    customers.add(card);customerCards.push(card);
  });
  customers.userData.cards=customerCards;

  const form=new THREE.Group();
  contentRoot.add(form);
  materialOpacity(form,0);
  const dim=uiCard(8.85,5.55,0xf1f5f9,.12,.02);
  dim.position.set(0,.05,-.02);form.add(dim);
  const modal=uiCard(6.65,4.70,0xffffff,.14,.035);
  modal.position.set(0,.10,.02);form.add(modal);
  addUiText(form,'Novo Cliente',font,.21,0x0f172a,-2.95,2.02,.09);
  addUiText(form,'Cadastro fiscal e comercial',font,.082,0x64748b,-2.95,1.72,.09);

  const steps=['Identificacao','Dados','Endereco'];
  steps.forEach((t,i)=>{
    const dot=uiCard(.22,.22,i===0?0x2563eb:0xe2e8f0,.11,.015);
    dot.position.set(-1.65+i*1.45,1.33,.06);form.add(dot);
    addUiText(form,String(i+1),font,.070,i===0?0xffffff:0x64748b,-1.65+i*1.45,1.33,.09,'center');
    addUiText(form,t,font,.067,0x64748b,-1.45+i*1.45,1.33,.09);
  });

  const fields=[
    ['Nome / Razao Social',-1.65,.68,3.65],
    ['CPF / CNPJ',2.10,.68,2.35],
    ['E-mail',-1.65,-.05,3.65],
    ['Celular / WhatsApp',2.10,-.05,2.35],
    ['Perfil do Cliente',-1.65,-.78,2.35],
    ['Indicador IE',1.00,-.78,2.35]
  ];
  fields.forEach(([label,x,y,w])=>{
    addUiText(form,label,font,.072,0x475569,x-w/2+.12,y+.23,.09);
    const input=uiCard(w,.38,0xf8fafc,.06,.015);input.position.set(x,y-.03,.06);form.add(input);
  });
  const continueBtn=uiCard(1.35,.38,0x2563eb,.08,.02);
  continueBtn.position.set(2.55,-1.65,.07);form.add(continueBtn);
  addUiText(form,'Continuar',font,.082,0xffffff,2.55,-1.65,.10,'center');

  const newCustomer=createDemoCustomerCard(
    font,'Cliente Novo','CPF: 000.111.222-33','Belo Horizonte/MG',{highlight:true}
  );
  newCustomer.position.set(-2.95,.43,0.08);
  customers.add(newCustomer);
  materialOpacity(newCustomer,0);

  root.userData={
    shell,contentRoot,dashboard,customers,form,newCustomer,newBtn,
    navMeshes,W,H
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
    const finalMark=mix(build,.86,.985);
    officialSurface.material.uniforms.uAngle.value=lerp(0,Math.PI*4,build);
    officialSurface.material.uniforms.uFull.value=finalMark;

    materialOpacity(this.sourceMark,1-breakMark);
    materialOpacity(progress,(1-finalMark)*(1-breakMark));
    track.material.opacity=.18*(1-finalMark)*(1-breakMark)*(1-build*.82);
    officialSurface.material.uniforms.uAlpha.value=1-breakMark;

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
    // PHASE 2 — TGBC identity becomes the actual TGBusinessCenter UI.
    // ------------------------------------------------------------
    const appIn=mix(p,.445,.525);
    const dashboardHold=1-mix(p,.615,.675);
    const clientsIn=mix(p,.615,.685);
    const formIn=mix(p,.715,.785);
    const saveClient=mix(p,.815,.885);
    const clientsReturn=mix(p,.825,.895);

    if(this.appTour && this.textReady){
      this.appBackdrop.visible=appIn>.001;
      this.appBackdrop.material.opacity=appIn;

      this.appTour.visible=appIn>.001;
      materialOpacity(this.appTour,appIn);
      this.appTour.position.z=lerp(-.75,0,appIn);
      this.appTour.rotation.x=lerp(.075,0,appIn);
      this.appTour.rotation.y=lerp(-.055,0,appIn);

      const shell=this.appTour.userData.shell;
      const dashboard=this.appTour.userData.dashboard;
      const customers=this.appTour.userData.customers;
      const form=this.appTour.userData.form;
      const newCustomer=this.appTour.userData.newCustomer;
      const navMeshes=this.appTour.userData.navMeshes;

      materialOpacity(shell,appIn);

      // Dashboard is the first stable system state.
      const dashAlpha=appIn*dashboardHold;
      materialOpacity(dashboard,dashAlpha);
      dashboard.position.set(
        lerp(0,-.14,clientsIn),
        lerp(0,.18,clientsIn),
        lerp(.06,-.20,clientsIn)
      );
      dashboard.scale.setScalar(lerp(.94,1,appIn)*(1-.06*clientsIn));

      // Shared sidebar changes its selected module instead of being replaced.
      navMeshes.forEach((n,i)=>{
        const toClients=clientsIn;
        const activeDash=1-toClients;
        const activeCustomers=toClients;
        const active=(i===0?activeDash:(i===1?activeCustomers:0));
        n.back.material.color.setHex(active>.5?0x2563eb:0xf8fafc);
      });

      // Dashboard content reflows into the customer screen.
      const customersBase=clientsIn*(1-formIn)+clientsReturn;
      materialOpacity(customers,customersBase);
      customers.position.set(
        lerp(.16,0,clientsIn),
        lerp(-.18,0,clientsIn),
        lerp(-.16,.07,clientsIn)
      );
      customers.scale.setScalar(lerp(.94,1,clientsIn));

      // The New Cliente button itself expands into the registration window.
      materialOpacity(form,formIn*(1-saveClient));
      const sourceButton=customers.userData.newButtonPos;
      form.position.set(
        lerp(sourceButton.x,0,formIn),
        lerp(sourceButton.y,0,formIn),
        lerp(.20,.14,formIn)
      );
      form.scale.setScalar(lerp(.07,1,formIn));
      form.rotation.z=lerp(-.035,0,formIn);

      // Existing customer cards recede but remain physically in the same world.
      customers.userData.cards.forEach((card,i)=>{
        const dim=formIn*(1-saveClient);
        materialOpacity(card,customersBase*(1-.72*dim));
        card.position.z=lerp(0,-.18,dim);
        card.scale.setScalar(lerp(1,.94,dim));
      });

      // Save: form collapses back into the list and a real new card occupies the first slot.
      materialOpacity(newCustomer,saveClient);
      newCustomer.scale.setScalar(lerp(.52,1,saveClient));
      newCustomer.position.z=lerp(.50,.09,saveClient);

      // Existing first-row cards slide one cell to make room for the new record.
      if(saveClient>.001){
        const cards=customers.userData.cards;
        const targets=[
          [0,.43], [2.95,.43], [-2.95,-.79],
          [0,-.79],[2.95,-.79],[2.95,-2.01]
        ];
        cards.forEach((card,i)=>{
          const t=targets[Math.min(i,targets.length-1)];
          card.position.x=lerp(card.position.x,t[0],saveClient);
          card.position.y=lerp(card.position.y,t[1],saveClient);
        });
      }

      // The abstract product background becomes the light product surface.
      this.bg.material.uniforms.uAlpha.value=gradient*(1-appIn);
      this.cloud.material.uniforms.uAlpha.value=cloudAlpha*(1-appIn);
      this.markFragments.material.uniforms.uAlpha.value*=1-appIn;

      // Central product logo + text become the actual application logo lockup.
      const uiScale=this.appTour.scale.x||1;
      const designW=this.appTour.userData.W;
      const designH=this.appTour.userData.H;
      const logoX=(-designW/2+.36)*uiScale;
      const logoY=(designH/2-.28)*uiScale;

      const rawFavHalf=this.targetMark.userData.halfWidth;
      const heroFavScale=1/rawFavHalf;
      const targetFavHeight=.28*uiScale;
      const appFavScale=targetFavHeight/(rawFavHalf*2);

      this.targetMark.position.x=lerp(0,logoX,appIn);
      this.targetMark.position.y=lerp(0,logoY,appIn);
      this.targetMark.position.z=lerp(0,.22,appIn);
      this.targetMark.scale.setScalar(lerp(heroFavScale,appFavScale,appIn));

      // Dark hero wordmark transforms into the light-theme wordmark.
      const heroTextAlpha=(1-appIn)*targetTextIn;
      materialOpacity(this.targetWord,heroTextAlpha);

      const lightWordH=.28*uiScale;
      const lightWordScale=lightWordH/Math.max(.001,this.targetWordLight.userData.height);
      const lightWordW=this.targetWordLight.userData.width*lightWordScale;
      this.targetWordLight.scale.setScalar(lightWordScale);
      this.targetWordLight.position.set(
        logoX+targetFavHeight/2+.08*uiScale+lightWordW/2,
        logoY,
        .22
      );
      materialOpacity(this.targetWordLight,appIn);

      // The presentation caption has served its purpose by this point.
      materialOpacity(this.lead,(1-appIn)*targetTextIn);
    }

    const cueOut=mix(p,.004,.028);
    materialOpacity(this.scrollCue,1-cueOut);
    this.scrollCue.position.set(0,portrait?-4.50:-2.58,.2);
    this.scrollCue.scale.setScalar(portrait?.76:.72);

    this.renderer.render(this.scene,this.camera);
  }
}
