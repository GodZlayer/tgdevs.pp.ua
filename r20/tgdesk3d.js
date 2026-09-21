import * as THREE from 'three';
import { clamp } from './motion.js';

const BLUE=new THREE.Color('#0b6cff');
const CYAN=new THREE.Color('#08d8f2');
const GREEN=new THREE.Color('#08e98b');

function brandColor(t,target=new THREE.Color()){
  t=clamp(t);
  if(t<.56)return target.copy(BLUE).lerp(CYAN,t/.56);
  return target.copy(CYAN).lerp(GREEN,(t-.56)/.44);
}

function glossyVertexMaterial(){
  return new THREE.MeshPhysicalMaterial({
    color:0xffffff,
    vertexColors:true,
    roughness:.18,
    metalness:.035,
    clearcoat:1,
    clearcoatRoughness:.075,
    transparent:true,
    opacity:1,
    emissive:0x00151c,
    emissiveIntensity:.18,
    side:THREE.DoubleSide
  });
}

function colorizeGeometry(geo,{mode='full',bias=0}={}){
  const p=geo.getAttribute('position');
  const c=new Float32Array(p.count*3);
  const tmp=new THREE.Color();

  geo.computeBoundingBox();
  const b=geo.boundingBox;
  const dx=Math.max(.001,b.max.x-b.min.x);
  const dy=Math.max(.001,b.max.y-b.min.y);

  for(let i=0;i<p.count;i++){
    const nx=(p.getX(i)-b.min.x)/dx;
    const ny=(p.getY(i)-b.min.y)/dy;
    let t=.68*nx+.32*ny+bias;

    if(mode==='blue')t*=.62;
    if(mode==='green')t=.48+t*.52;

    brandColor(t,tmp);
    c[i*3]=tmp.r;
    c[i*3+1]=tmp.g;
    c[i*3+2]=tmp.b;
  }

  geo.setAttribute('color',new THREE.BufferAttribute(c,3));
  return geo;
}

function sphere(radius,mode='full',bias=0){
  const geo=colorizeGeometry(
    new THREE.SphereGeometry(radius,56,40),
    {mode,bias}
  );
  const m=new THREE.Mesh(geo,glossyVertexMaterial());
  m.castShadow=false;
  m.receiveShadow=false;
  return m;
}

function taperedRibbon(points,startWidth,endWidth,depth=.085,mode='full',bias=0){
  const curve=new THREE.CatmullRomCurve3(
    points.map(([x,y])=>new THREE.Vector3(x,y,0)),
    false,
    'centripetal',
    .50
  );

  const N=72;
  const left=[];
  const right=[];
  const prev=new THREE.Vector3();
  const next=new THREE.Vector3();
  const tangent=new THREE.Vector3();

  for(let i=0;i<N;i++){
    const t=i/(N-1);
    const p=curve.getPoint(t);

    curve.getPoint(Math.max(0,t-.004),prev);
    curve.getPoint(Math.min(1,t+.004),next);

    tangent.subVectors(next,prev).normalize();
    const nx=-tangent.y;
    const ny=tangent.x;

    const ease=t*t*(3-2*t);
    const width=startWidth+(endWidth-startWidth)*ease;

    // Slight asymmetry is intentional: it reproduces the comet/blade silhouette
    // instead of reading as a uniform tube.
    left.push(new THREE.Vector2(
      p.x+nx*width*.58,
      p.y+ny*width*.58
    ));
    right.push(new THREE.Vector2(
      p.x-nx*width*.42,
      p.y-ny*width*.42
    ));
  }

  const shape=new THREE.Shape();
  shape.moveTo(left[0].x,left[0].y);

  for(let i=1;i<left.length;i++){
    shape.lineTo(left[i].x,left[i].y);
  }

  for(let i=right.length-1;i>=0;i--){
    shape.lineTo(right[i].x,right[i].y);
  }

  shape.closePath();

  const geo=colorizeGeometry(
    new THREE.ExtrudeGeometry(shape,{
      depth,
      bevelEnabled:true,
      bevelThickness:.018,
      bevelSize:.016,
      bevelSegments:3,
      curveSegments:2
    }),
    {mode,bias}
  );

  geo.translate(0,0,-depth/2);

  const mesh=new THREE.Mesh(
    geo,
    glossyVertexMaterial()
  );

  return mesh;
}

function addSoftHighlight(parent,x,y,z,sx,sy,opacity=.50){
  const mat=new THREE.MeshBasicMaterial({
    color:0xffffff,
    transparent:true,
    opacity,
    depthWrite:false,
    blending:THREE.AdditiveBlending
  });
  mat.toneMapped=false;

  const h=new THREE.Mesh(
    new THREE.SphereGeometry(1,24,16),
    mat
  );

  h.position.set(x,y,z);
  h.scale.set(sx,sy,.025);
  h.renderOrder=42;
  parent.add(h);
  return h;
}

function polarPoint(angle,radius){
  return [
    Math.cos(angle)*radius,
    Math.sin(angle)*radius
  ];
}

export function createTGDeskMark3D(){
  const root=new THREE.Group();

  // Canonical three-fold symmetry. Every comet is the same geometry rotated
  // exactly 120 degrees; only the brand gradient changes across the mark.
  const core=sphere(.420,'full',-.04);
  core.position.set(0,0,.035);
  root.add(core);

  const headAngles=[
    Math.PI/2,
    Math.PI/2+Math.PI*2/3,
    Math.PI/2+Math.PI*4/3
  ];

  const modes=['blue','blue','green'];
  const biases=[.02,.055,-.025];

  const tails=[];
  const heads=[];

  for(let i=0;i<3;i++){
    const a=headAngles[i];

    // Far tip -> thick neck under the sphere.
    // The angular sweep is identical for all three comets.
    const points=[
      polarPoint(a+THREE.MathUtils.degToRad(80),.820),
      polarPoint(a+THREE.MathUtils.degToRad(63),.838),
      polarPoint(a+THREE.MathUtils.degToRad(47),.855),
      polarPoint(a+THREE.MathUtils.degToRad(32),.875),
      polarPoint(a+THREE.MathUtils.degToRad(18),.888),
      polarPoint(a+THREE.MathUtils.degToRad(8),.858)
    ];

    const tail=taperedRibbon(
      points,
      .014,
      .183,
      .088,
      modes[i],
      biases[i]
    );

    tails.push(tail);
    root.add(tail);

    const head=sphere(
      .205,
      modes[i],
      biases[i]
    );

    head.position.set(
      Math.cos(a)*.915,
      Math.sin(a)*.915,
      .082
    );

    heads.push(head);
    root.add(head);
  }

  // One global light direction, so the highlights stay physically coherent
  // while the geometry itself remains perfectly symmetric.
  addSoftHighlight(
    core,
    -.155,
    .165,
    .430,
    .108,
    .048,
    .44
  );

  for(const head of heads){
    addSoftHighlight(
      root,
      head.position.x-.052,
      head.position.y+.060,
      .262,
      .052,
      .022,
      .47
    );
  }

  root.userData={
    halfWidth:1.05,
    halfHeight:1.10,
    canonicalHeight:2.20,
    headRadius:.915
  };

  // No baked asymmetry in the canonical resting state.
  root.rotation.set(0,0,0);

  return root;
}
