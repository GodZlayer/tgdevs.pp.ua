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
    new THREE.SphereGeometry(radius,96,64),
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

  const N=128;
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
      bevelSegments:5,
      curveSegments:5
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
    new THREE.SphereGeometry(1,48,32),
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

function qBezier(a,b,c,t){
  const mt=1-t;
  return [
    mt*mt*a[0]+2*mt*t*b[0]+t*t*c[0],
    mt*mt*a[1]+2*mt*t*b[1]+t*t*c[1]
  ];
}

function outwardControl(a,b,strength=.31){
  const mx=(a[0]+b[0])*.5;
  const my=(a[1]+b[1])*.5;
  const len=Math.max(.001,Math.hypot(mx,my));
  return [
    mx+(mx/len)*strength,
    my+(my/len)*strength
  ];
}

function triangularCometPath(from,to){
  const control=outwardControl(from,to,.295);
  const points=[];
  const N=7;

  for(let i=0;i<N;i++){
    const t=i/(N-1);
    // Tail does not occupy the full side. It starts after the previous corner
    // and thickens aggressively only when approaching its own head.
    const tt=.15+t*.78;
    points.push(qBezier(from,control,to,tt));
  }

  return points;
}

export function createTGDeskMark3D(){
  const root=new THREE.Group();

  // The center remains circular, but the orbital logic is deliberately NOT circular.
  // The three comet heads sit on the vertices of a controlled equilateral triangle.
  const core=sphere(.420,'full',-.04);
  core.position.set(0,0,.035);
  root.add(core);

  const R=.925;
  const vertices=[
    polarPoint(Math.PI/2,R),
    polarPoint(Math.PI/2-Math.PI*2/3,R),
    polarPoint(Math.PI/2-Math.PI*4/3,R)
  ];

  const modes=['blue','green','blue'];
  const biases=[.015,-.020,.050];

  const heads=[];
  const tails=[];

  for(let i=0;i<3;i++){
    const head=vertices[i];
    const previous=vertices[(i+2)%3];

    // Each tail follows one rounded side of the triangle.
    // That gives the mark the "perfectly controlled orbit" requested:
    // a three-fold engineered path rather than a natural orbital circle.
    const tail=taperedRibbon(
      triangularCometPath(previous,head),
      .010,
      .186,
      .086,
      modes[i],
      biases[i]
    );

    tails.push(tail);
    root.add(tail);

    const orb=sphere(
      .205,
      modes[i],
      biases[i]
    );

    orb.position.set(
      head[0],
      head[1],
      .082
    );

    heads.push(orb);
    root.add(orb);
  }

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
    halfWidth:1.08,
    halfHeight:1.12,
    canonicalHeight:2.24,
    triangleRadius:R,
    vertices:vertices.map(v=>[v[0],v[1]])
  };

  root.rotation.set(0,0,0);

  return root;
}
