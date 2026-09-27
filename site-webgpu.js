import * as THREE from 'three/webgpu';
import { attribute, color, cos, max, mix, sin, smoothstep, sqrt, uniform, vec3 } from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const canvas=document.querySelector('#world');
const status=document.querySelector('#status');
const sceneBackdrop=document.querySelector('#sceneBackdrop');
canvas.style.opacity='1';
sceneBackdrop.style.opacity='0';
window.addEventListener('error',()=>{if(status.textContent==='INICIANDO EXPERIÊNCIA 3D'){status.textContent='ERRO AO INICIAR EXPERIÊNCIA 3D';status.style.opacity='1';}});
window.addEventListener('unhandledrejection',()=>{if(status.textContent==='INICIANDO EXPERIÊNCIA 3D'){status.textContent='FALHA AO CARREGAR EXPERIÊNCIA 3D';status.style.opacity='1';}});
if(!navigator.gpu){status.textContent='WEBGPU NÃO DISPONÍVEL NESTE NAVEGADOR';status.style.opacity='1';throw new Error('Esta experiência requer suporte WebGPU.');}
let renderer;
try{
  renderer=new THREE.WebGPURenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  await renderer.init();
}catch(error){status.textContent='NÃO FOI POSSÍVEL INICIAR WEBGPU';status.style.opacity='1';throw error;}
if(!renderer.backend?.isWebGPUBackend){status.textContent='NÃO FOI POSSÍVEL INICIAR WEBGPU';status.style.opacity='1';throw new Error('WebGPU não iniciou; não será usado um backend WebGL como substituto.');}

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,100);
camera.position.set(0,0,10);
scene.add(new THREE.HemisphereLight(0xc7f4ff,0x071017,2));
const key=new THREE.DirectionalLight(0xc6f1ff,3.5);key.position.set(-4,6,9);scene.add(key);
const rim=new THREE.PointLight(0x00d9c6,36,30,2);rim.position.set(5,-2,5);scene.add(rim);

const world=new THREE.Group();scene.add(world);
const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath('./vendor/webgpu/draco/');loader.setDRACOLoader(draco);
const artworkGLTF=await loader.loadAsync('./blender/assets/site_artwork_r1.glb?v=9'),artwork=artworkGLTF.scene;world.add(artwork);
const arcGLTF=await loader.loadAsync('./blender/assets/site_arc_r1.glb?v=6');world.add(arcGLTF.scene);
const art=name=>{const object=world.getObjectByName(name);if(!object)throw new Error(`Objeto Blender ausente no export: ${name}`);return object;};
const tgdevs={mark:art('TGDEVS_MARK'),arc:art('TGDEVS_ARC'),arcMesh:art('TGDEVS_ARC_MESH'),gear:art('TGDEVS_GEAR'),counter:art('TGDEVS_COUNTER'),counterHub:art('TGDEVS_COUNTER_HUB'),word:art('TGDEVS_WORD')};
const tgbc={first:art('TGBC_MODULE_0'),steps:Array.from({length:6},(_,i)=>art(`TGBC_MODULE_${i+1}`)),center:art('TGBC_MODULE_CENTER'),word:art('TGBC_WORD')};
const tgdevsWordBox=new THREE.Box3().setFromObject(tgdevs.word),tgdevsWordHeight=tgdevsWordBox.getSize(new THREE.Vector3()).y;
const slogans=Array.from({length:4},(_,i)=>art(`SLOGAN_0${i+1}`)),leadText=art('TGBC_LEAD');
if(!tgdevs.arcMesh.geometry.index)throw new Error('Geometria segmentada do arco Blender sem índices');
world.traverse(object=>{if(!object.isMesh)return;object.castShadow=false;object.receiveShadow=false;for(const material of(Array.isArray(object.material)?object.material:[object.material])){if(material){material.transparent=true;material.depthWrite=false;material.toneMapped=false;}}
  if(['TGDEVS_GEAR_ART','TGDEVS_ARC_MESH','TGDEVS_COUNTER_NEEDLE'].includes(object.name)){
    const source=Array.isArray(object.material)?object.material[0]:object.material;
    object.material=new THREE.MeshBasicMaterial({map:source.map,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  }
});
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const between=(p,a,b)=>smooth(clamp((p-a)/(b-a)));
const compactLayout=()=>innerHeight>innerWidth||innerWidth/innerHeight<1.5;
async function sampleBlenderVectorPoints(path,count){
  const response=await fetch(path);if(!response.ok)throw new Error(`Falha ao carregar pontos vetoriais Blender: ${path}`);
  const bytes=await response.arrayBuffer(),view=new DataView(bytes),header=14,record=11;
  if(bytes.byteLength<header||view.getUint32(0,true)!==0x50564754||view.getUint16(4,true)!==1)throw new Error(`Arquivo de pontos vetoriais Blender inválido: ${path}`);
  const storedCount=view.getUint16(6,true),aspect=view.getFloat32(10,true);
  if(storedCount!==count||bytes.byteLength!==header+count*record)throw new Error(`Quantidade inesperada de pontos vetoriais Blender: ${storedCount}`);
  const positions=new Float32Array(count*3),rgb=new Float32Array(count*3);
  for(let i=0;i<count;i++){const offset=header+i*record;positions[i*3]=view.getFloat32(offset,true);positions[i*3+1]=view.getFloat32(offset+4,true);rgb[i*3]=view.getUint8(offset+8)/255;rgb[i*3+1]=view.getUint8(offset+9)/255;rgb[i*3+2]=view.getUint8(offset+10)/255;}
  return {positions,rgb,aspect};
}
function createMorph(from,to,count,customOrder=null){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(from.positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(count*3),3));
  geometry.setAttribute('fromPosition',new THREE.BufferAttribute(from.positions,3));geometry.setAttribute('toPosition',new THREE.BufferAttribute(to.positions,3));
  geometry.setAttribute('fromColor',new THREE.BufferAttribute(from.rgb,3));geometry.setAttribute('toColor',new THREE.BufferAttribute(to.rgb,3));
  const progress=uniform(0),breakup=uniform(0),fade=uniform(0),morphPhase=uniform(0),seed=new Float32Array(count),order=new Float32Array(count);
  const seeded=n=>{const value=Math.sin(n*12.9898+78.233)*43758.5453;return value-Math.floor(value);};
  for(let i=0;i<count;i++){
    const currentSeed=seeded(i*8.71),x=to.positions[i*3],y=to.positions[i*3+1],radius=Math.hypot(x,y);
    seed[i]=currentSeed;order[i]=customOrder?customOrder[i]:(radius<.27?.91+currentSeed*.06:(((Math.PI/2-Math.atan2(y,x)+Math.PI*2)%(Math.PI*2))/(Math.PI*2))*.84);
  }
  geometry.setAttribute('seed',new THREE.BufferAttribute(seed,1));geometry.setAttribute('order',new THREE.BufferAttribute(order,1));
  const a=attribute('fromPosition','vec3'),b=attribute('toPosition','vec3'),ca=attribute('fromColor','vec3'),cb=attribute('toColor','vec3'),s=attribute('seed','float'),o=attribute('order','float');
  const breakupT=smoothstep(0,1,breakup),phase=s.mul(Math.PI*2),scatter=vec3(a.x.add(cos(phase).mul(s.mul(.9).add(.65).mul(breakupT))),a.y.add(sin(phase).mul(s.mul(.9).add(.65).mul(breakupT))),a.z.add(sin(phase.mul(1.7)).mul(s.mul(.8).add(.35).mul(breakupT))));
  const local=smoothstep(o.sub(.035),o.add(.085),progress),motion=sin(local.mul(Math.PI)),point=mix(scatter,b,local);
  const mat=new THREE.PointsNodeMaterial({size:2.2,transparent:true,depthWrite:false,sizeAttenuation:false});
  mat.sizeNode=motion.mul(.32).add(1).mul(1.8);mat.positionNode=vec3(point.x,point.y,point.z.add(motion.mul(s.mul(.12).add(.05))));
  mat.colorNode=mix(ca,cb,local);mat.opacityNode=fade.mul(mix(1,smoothstep(.02,.45,local),morphPhase));mat.alphaTest=.01;
  const points=new THREE.Points(geometry,mat);points.frustumCulled=false;
  return {points,progress,breakup,fade,morphPhase};
}
function particleFitScale(samples,solids){
  const pointBounds=new THREE.Box3().makeEmpty();
  for(let i=0;i<samples.positions.length;i+=3)pointBounds.expandByPoint(new THREE.Vector3(samples.positions[i],samples.positions[i+1],samples.positions[i+2]));
  const solidBounds=new THREE.Box3().makeEmpty();solids.forEach(root=>solidBounds.union(new THREE.Box3().setFromObject(root)));
  const pointSize=pointBounds.getSize(new THREE.Vector3()),solidSize=solidBounds.getSize(new THREE.Vector3());
  return new THREE.Vector3(solidSize.x/pointSize.x,solidSize.y/pointSize.y,1);
}
function setGroupOpacity(root,alpha){root.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(!m)continue;m.transparent=true;m.opacity=alpha;m.depthWrite=alpha>.03;}});}
const logoCount=7200;
const [markA,markB]=await Promise.all([
  sampleBlenderVectorPoints('./blender/assets/tgdevsMark-points-r2.bin?v=22',logoCount),
  sampleBlenderVectorPoints('./blender/assets/tgbcMark-points-r2.bin?v=22',logoCount)
]);
// Blender's image pixel rows start at the bottom; the TGDevs source sampler
// stored them with the image-space Y direction, so flip only that particle
// source into the same upright world coordinates used by the solid favicon.
for(let i=0;i<logoCount;i++)markA.positions[i*3+1]*=-1;
world.updateMatrixWorld(true);
const tgdevsParticleScale=particleFitScale(markA,[tgdevs.gear,tgdevs.arcMesh]);
const tgbcParticleScale=particleFitScale(markB,[tgbc.first,...tgbc.steps,tgbc.center]);
// Two independently authored point sets crossfade: TGDevs dissolves from its
// own upright silhouette while TGBC particles assemble from their own target.
// Partition target points by the six Blender-authored module regions and center.
// Their reveal order now follows the same staggered clock as the solid mark,
// instead of sweeping around the whole logo like another outer ring.
const tgbcParticleOrder=new Float32Array(logoCount);
const tgbcAssemblyGroups=[{x:0,y:1.16},{x:.82,y:.58},{x:.82,y:-.58},{x:0,y:-1.16},{x:-.82,y:-.58},{x:-.82,y:.58}];
for(let i=0;i<logoCount;i++){
  const x=markB.positions[i*3],y=markB.positions[i*3+1],radius=Math.hypot(x,y);
  if(radius<.29){tgbcParticleOrder[i]=.88+Math.sin(i*12.9898)*.035;continue;}
  let nearest=0,nearestDistance=Infinity;
  for(let group=0;group<tgbcAssemblyGroups.length;group++){
    const target=tgbcAssemblyGroups[group],distance=(x-target.x)**2+(y-target.y)**2;
    if(distance<nearestDistance){nearestDistance=distance;nearest=group;}
  }
  tgbcParticleOrder[i]=nearest*.12+.04+((i*0.61803398875)%1)*.035;
}
const tgdevsParticles=createMorph(markA,markA,logoCount),tgbcParticles=createMorph(markB,markB,logoCount,tgbcParticleOrder);
for(const cloud of [tgdevsParticles,tgbcParticles])cloud.points.material.size=1.8;
world.add(tgdevsParticles.points,tgbcParticles.points);
for(const node of [tgdevs.mark,tgdevs.arc,tgdevs.counter,tgdevs.counterHub,tgdevs.word,tgbc.first,...tgbc.steps,tgbc.center,tgbc.word,...slogans,leadText])setGroupOpacity(node,0);

// Blender authors the deterministic seed/layout fields; TSL evaluates their
// deformation per frame so the scroll can scrub backward without baking video.
const particleResponse=await fetch('./blender/assets/site_particles_r1.bin?v=4');if(!particleResponse.ok)throw new Error('Dados de partículas Blender ausentes');const particleBuffer=await particleResponse.arrayBuffer(),particleView=new DataView(particleBuffer),particleCount=particleView.getUint16(6,true),particleHeader=8,particleStride=16;
if(particleView.getUint32(0,true)!==0x46574754||particleView.getUint16(4,true)!==1||particleBuffer.byteLength!==particleHeader+particleCount*particleStride)throw new Error('Dados de partículas Blender inválidos');
const fieldCount=particleCount,fieldGeometry=new THREE.BufferGeometry(),waveU=new Float32Array(fieldCount),waveD=new Float32Array(fieldCount),waveLayer=new Float32Array(fieldCount),waveSeed=new Float32Array(fieldCount);
for(let i=0;i<fieldCount;i++){const offset=particleHeader+i*particleStride;waveU[i]=particleView.getFloat32(offset,true);waveD[i]=particleView.getFloat32(offset+4,true);waveLayer[i]=particleView.getFloat32(offset+8,true);waveSeed[i]=particleView.getFloat32(offset+12,true);}
fieldGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(fieldCount*3),3));fieldGeometry.setAttribute('waveU',new THREE.BufferAttribute(waveU,1));fieldGeometry.setAttribute('waveD',new THREE.BufferAttribute(waveD,1));fieldGeometry.setAttribute('waveLayer',new THREE.BufferAttribute(waveLayer,1));fieldGeometry.setAttribute('waveSeed',new THREE.BufferAttribute(waveSeed,1));
const fieldFlow=uniform(0),fieldBuild=uniform(0),orbMorph=uniform(0),orbExpand=uniform(0),orbSpreadExtent=uniform(1.8),orbSphereRadius=uniform(4.6),orbSphereOpacity=uniform(.95),fieldVisible=uniform(1),fieldPortrait=uniform(0),particleLogoClear=uniform(0),particleFocusX=uniform(0),particleFocusY=uniform(0),particleFocusRadius=uniform(1.2);
const u=attribute('waveU','float'),d=attribute('waveD','float'),layer=attribute('waveLayer','float'),seed=attribute('waveSeed','float');
const phase=mix(.3,2.1,layer).add(seed.sub(.5).mul(.55));
const w1=sin(u.mul(mix(8.3,7,layer)).add(d.mul(3.1)).add(phase).add(fieldFlow.mul(1.3)));
const w2=sin(u.mul(mix(16.2,15,layer)).sub(d.mul(5)).add(phase.mul(.7)).sub(fieldFlow.mul(.72)));
// Keep the authored two particle sheets close together. Wide vertical offsets
// made them read as two unrelated clumps that crossed the marks and text.
const sideOffset=mix(.22,-.22,layer),sheet=vec3(u.mul(7.1).sub(3.55).add(d.sub(.5).mul(sideOffset)),mix(-.05,-.14,layer).add(w1.mul(.30)).add(w2.mul(.075)).add(d.sub(.5).mul(.28)),mix(-1.18,-.86,d).add(w2.mul(.07)));
const theta=u.mul(Math.PI*2),sphereY=d.mul(-2).add(1),radial=sqrt(max(0,sphereY.mul(sphereY).oneMinus())),radius=orbSphereRadius.mul(mix(1,.82,fieldPortrait));
const sphere=vec3(radial.mul(cos(theta)),sphereY,radial.mul(sin(theta))).mul(radius),folded=mix(sheet,sphere,orbMorph),expanded=folded.mul(mix(1,orbSpreadExtent,orbExpand));
const reveal=mix(u,u.oneMinus(),layer),born=smoothstep(reveal.mul(.88),reveal.mul(.88).add(.14),fieldBuild),colorT=mix(u,u.oneMinus(),layer),brandColor=mix(mix(color('#0b7cff'),color('#00c7d9'),colorT.div(.55)),mix(color('#00c7d9'),color('#00e66b'),colorT.sub(.55).div(.45)),colorT.greaterThan(.55));
const fieldMaterial=new THREE.PointsNodeMaterial({transparent:true,depthWrite:false,sizeAttenuation:false});
const focusDX=expanded.x.sub(particleFocusX),focusDY=expanded.y.sub(particleFocusY),focusDistance=sqrt(focusDX.mul(focusDX).add(focusDY.mul(focusDY))),focusFeather=smoothstep(particleFocusRadius,particleFocusRadius.add(.48),focusDistance),logoExclusion=mix(0,1,focusFeather);
fieldMaterial.sizeNode=seed.mul(1.5).add(.65).mul(mix(1,.72,orbMorph));fieldMaterial.positionNode=expanded;fieldMaterial.colorNode=brandColor;fieldMaterial.opacityNode=born.mul(fieldVisible).mul(seed.mul(.22).add(.16)).mul(mix(1,.46,orbMorph)).mul(orbExpand.mul(-.38).add(1)).mul(mix(1,orbSphereOpacity,orbMorph)).mul(mix(1,logoExclusion,particleLogoClear));
const field=new THREE.Points(fieldGeometry,fieldMaterial);field.frustumCulled=false;scene.add(field);

const progressBar=document.querySelector('#progress'),hint=document.querySelector('#scrollHint');
const timelineResponse=await fetch('./blender/assets/site_timeline_r1.json?v=38');if(!timelineResponse.ok)throw new Error('Timeline Blender ausente');const sceneTimeline=await timelineResponse.json();
orbSpreadExtent.value=sceneTimeline.settings?.particleSpreadExtent??1.8;orbSphereRadius.value=sceneTimeline.settings?.particleOrbRadius??4.6;orbSphereOpacity.value=sceneTimeline.settings?.particleOrbOpacity??.95;
document.documentElement.style.setProperty('--scroll-range',`${sceneTimeline.scroll.trackHeightPx}px`);
function timelineValue(name,scroll){const track=sceneTimeline.tracks[name];if(!track)return 0;const frame=clamp(scroll)*sceneTimeline.frameEnd,index=Math.min(track.length-1,Math.floor(frame)),next=Math.min(track.length-1,index+1);return THREE.MathUtils.lerp(track[index],track[next],frame-index);}
function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),portrait=compactLayout(),cameraZ=portrait?12.4:10,cameraFov=portrait?32:34,portraitWorldScale=.74;renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=cameraFov;camera.position.z=cameraZ;camera.updateProjectionMatrix();
  // Scene 1 uses the original authored hero metrics: the favicon is centered
  // at the camera origin, unit scale on desktop, and .74 on portrait layouts.
  // Keep responsive changes in the camera framing instead of moving the mark.
  world.position.set(0,0,0);world.scale.setScalar(portrait?portraitWorldScale:1);
  for(const root of [tgdevs.mark,tgdevs.arc,tgdevs.counter,tgdevs.counterHub])root.position.set(0,0,.1);
  // Both brand symbols share one authored center across the entire transition.
  // Keep the TGBC modules directly over the TGDevs favicon on desktop too.
  for(const root of [...tgbc.steps,tgbc.first,tgbc.center])root.position.set(0,0,.1);
  const tgWordScale=portrait?Math.min(.66,3.05/5.3):Math.min(.92,3.1/5.3);
  tgdevs.word.position.set(portrait?0:.42,portrait?-1.24-tgdevsWordHeight*tgWordScale/2:0,0);
  tgdevs.word.scale.setScalar(tgWordScale);
  tgbc.word.position.set(0,-1.48,0);
  tgbc.word.scale.setScalar(portrait?.68:.68);
  for(const root of [...slogans,leadText])root.position.z=.05;
  field.geometry.setDrawRange(0,portrait?13000:16000);fieldPortrait.value=portrait?1:0;
}
async function render(){const maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight),p=clamp(scrollY/maxScroll),portrait=compactLayout(),at=name=>timelineValue(name,p);
  const wordBuild=at('tgdevs_word_build'),orb=at('particle_orb_morph'),clockBuild=at('tgbc_assembly'),expand=at('particle_spread'),targetTextIn=at('tgbc_word_opacity');
  const logoVisible=at('tgdevs_mark_opacity');setGroupOpacity(tgdevs.mark,logoVisible);setGroupOpacity(tgdevs.gear,at('gear_opacity'));setGroupOpacity(tgdevs.arc,logoVisible);setGroupOpacity(tgdevs.counter,at('counter_opacity'));setGroupOpacity(tgdevs.counterHub,at('counter_opacity'));
  const arcProgress=at('ring_progress'),arcIndexCount=tgdevs.arcMesh.geometry.index.count;tgdevs.arcMesh.geometry.setDrawRange(0,Math.floor(arcIndexCount*arcProgress/3)*3);
  tgdevs.gear.rotation.z=Math.PI*2*at('gear_turns_ccw');
  // The aligned source needle points about 40° above +X. These offsets place
  // its tip at 7 o'clock first and 2 o'clock last, rotating around the hub.
  const counterProgress=at('counter_progress');tgdevs.counter.rotation.z=THREE.MathUtils.lerp(-8*Math.PI/9,-37*Math.PI/18,counterProgress);
  // Reveal the wordmark only in its clear lockup position. Sliding it out
  // from the gear made the two silhouettes pass through each other.
  const tgWordScale=portrait?Math.min(.66,3.05/5.3):Math.min(.92,3.1/5.3);
  const wordFinalX=1.3+5.3*tgWordScale/2;tgdevs.word.position.x=portrait?0:wordFinalX;
  if(portrait)tgdevs.word.position.y=-1.24-tgdevsWordHeight*tgWordScale/2;
  setGroupOpacity(tgdevs.word,at('tgdevs_word_opacity'));
  tgdevs.mark.rotation.y=at('tgdevs_yaw');
  const dissolveOpacity=at('tgdevs_dissolve_opacity');
  const tgbcParticleProgress=at('tgbc_particle_progress'),tgbcParticleOpacity=at('tgbc_particle_opacity');
  tgdevsParticles.progress.value=1;tgdevsParticles.breakup.value=0;tgdevsParticles.fade.value=dissolveOpacity;
  // The point clouds are children of `world`; applying its responsive scale
  // locally as well would shrink them twice on portrait layouts.
  tgdevsParticles.points.scale.copy(tgdevsParticleScale);
  tgdevsParticles.points.position.set(0,0,.12);tgdevsParticles.points.visible=dissolveOpacity>.002;
  tgbcParticles.progress.value=tgbcParticleProgress;tgbcParticles.breakup.value=0;tgbcParticles.fade.value=tgbcParticleOpacity;tgbcParticles.morphPhase.value=1;
  tgbcParticles.points.scale.copy(tgbcParticleScale);
  // Both particle marks use the same origin so the TGBC forms directly over
  // the dissolving TGDevs favicon, independent of the responsive layout.
  tgbcParticles.points.position.set(0,0,.12);tgbcParticles.points.visible=tgbcParticleOpacity>.002;
  setGroupOpacity(tgbc.first,at('tgbc_first_opacity'));
  tgbc.steps.forEach((step,i)=>{const local=at(`tgbc_module_${i+1}_progress`);setGroupOpacity(step,at(`tgbc_module_${i+1}_opacity`));step.scale.setScalar(.76+.24*local);});
  const centerBuild=at('tgbc_center_build');setGroupOpacity(tgbc.center,at('tgbc_module_center_opacity'));tgbc.center.scale.setScalar(.76+.24*centerBuild);setGroupOpacity(tgbc.word,targetTextIn);
  fieldFlow.value=at('particle_flow');fieldBuild.value=at('particle_reveal');orbMorph.value=orb;orbExpand.value=expand;fieldVisible.value=at('particle_opacity');particleLogoClear.value=Math.max(at('tgdevs_build'),at('tgbc_full_mark_opacity'));particleFocusX.value=0;particleFocusY.value=0;particleFocusRadius.value=1.24*(portrait?.74:world.scale.x);
  const gradientIn=at('background_opacity');sceneBackdrop.style.opacity=String(gradientIn);
  world.rotation.y=at('scene_yaw');progressBar.style.width=`${p*100}%`;progressBar.parentElement.style.opacity=String(p>0?1:0);status.style.opacity=String(p>0?1:0);hint.style.opacity=String(at('scroll_hint_opacity'));
  const copyWidths=[3.4,2.6,4,3.6];slogans.forEach((root,i)=>{const alpha=at(`slogan_0${i+1}_opacity`),fit=portrait?Math.min(.95,4/copyWidths[i]):Math.min(1.15,4/copyWidths[i]);setGroupOpacity(root,alpha);root.position.set(0,portrait?2.38:2.28,-.08+.13*alpha);root.scale.setScalar(fit);});
  setGroupOpacity(leadText,at('tgbc_lead_opacity'));const leadScale=portrait?1.05:.96;leadText.position.set(0,2.18,.05);leadText.scale.setScalar(leadScale);
  await renderer.renderAsync(scene,camera);status.textContent='PRÉVIA VISUAL TGDEVS';
}
let pending=false,renderDirty=false;
function request(){renderDirty=true;if(pending)return;pending=true;requestAnimationFrame(async()=>{renderDirty=false;try{await render();}catch(error){console.error(error);status.textContent='ERRO AO RENDERIZAR A EXPERIÊNCIA 3D';status.style.opacity='1';}finally{pending=false;if(renderDirty)request();}});}
resize();request();addEventListener('scroll',request,{passive:true});addEventListener('resize',()=>{resize();request();},{passive:true});document.fonts?.ready.then(request);

