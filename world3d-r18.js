import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r17.js';

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
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      m.transparent=true;
      if(m.uniforms?.uAlpha)m.uniforms.uAlpha.value=v;
      else if(typeof m.opacity==='number')m.opacity=v;
      m.depthWrite=v>.96;
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
    entries.push({pos,localMatrix,weight,cumulative:totalWeight});
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
    out[i*3+2]=v.z+(seeded(i*7.37+.2)-.5)*.006;
  }
  return out;
}

function sampleImageMask(image,count,targetHeight){
  const c=document.createElement('canvas');
  const h=280;
  const w=Math.max(120,Math.round(h*(image.naturalWidth||image.width)/(image.naturalHeight||image.height)));
  c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,w,h);
  const data=ctx.getImageData(0,0,w,h).data;
  const pts=[];
  for(let y=0;y<h;y+=2){
    for(let x=0;x<w;x+=2){
      const k=(y*w+x)*4;
      const r=data[k],g=data[k+1],b=data[k+2];
      const whiteDistance=Math.sqrt((255-r)**2+(255-g)**2+(255-b)**2);
      const chroma=Math.max(r,g,b)-Math.min(r,g,b);
      if(whiteDistance>30 || chroma>18)pts.push([x,y]);
    }
  }
  const ratio=w/h;
  const targetWidth=targetHeight*ratio;
  const out=new Float32Array(count*3);
  if(!pts.length)return out;
  for(let i=0;i<count;i++){
    const pt=pts[Math.floor(seeded(i*31.77+.43)*pts.length)%pts.length];
    const jitterX=(seeded(i*5.13)-.5)*2;
    const jitterY=(seeded(i*9.21)-.5)*2;
    out[i*3]=((pt[0]+jitterX)/w-.5)*targetWidth;
    out[i*3+1]=(.5-(pt[1]+jitterY)/h)*targetHeight;
    out[i*3+2]=(seeded(i*13.3)-.5)*.045;
  }
  return out;
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
    order[i]=((Math.PI/2-angle+TAU)%TAU)/TAU*.88+sd*.04;
  }
  geo.setAttribute('iSeed',new THREE.InstancedBufferAttribute(seed,1));
  geo.setAttribute('iOrder',new THREE.InstancedBufferAttribute(order,1));

  const mat=new THREE.ShaderMaterial({
    uniforms:{uBreak:{value:0},uMorph:{value:0},uAlpha:{value:0}},
    transparent:true,
    depthWrite:true,
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
        scatter.xy+=vec2(cos(phase),sin(phase))*(.08+.34*iSeed)*b;
        scatter.z+=sin(phase*1.71)*(.08+.38*iSeed)*b;
        float local=smoothstep(iOrder-.055,iOrder+.10,uMorph);
        vec3 c=mix(scatter,iTo,local);
        float lift=sin(local*3.14159265);
        c.z+=lift*(.10+.24*iSeed);
        vec3 p=c+position*(1.0+lift*.40);
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
        float t=clamp((vP.x+1.4)/2.8,0.0,1.0);
        vec3 blue=vec3(.015,.36,1.0);
        vec3 cyan=vec3(.00,.86,.96);
        vec3 green=vec3(.00,.92,.52);
        vec3 col=t<.58?mix(blue,cyan,t/.58):mix(cyan,green,(t-.58)/.42);
        vec3 L=normalize(vec3(-.4,.75,1.0));
        float lit=.70+.38*max(0.0,dot(normalize(vN),L));
        gl_FragColor=vec4(min(col*lit,vec3(1.0)),uAlpha);
      }
    `
  });
  mat.toneMapped=false;
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=10;
  return mesh;
}

function keyedImagePlane(texture,ratio,height){
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  const mat=new THREE.ShaderMaterial({
    uniforms:{uMap:{value:texture},uAlpha:{value:0}},
    transparent:true,
    depthWrite:false,
    toneMapped:false,
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      uniform sampler2D uMap;
      uniform float uAlpha;
      varying vec2 vUv;
      void main(){
        vec4 px=texture2D(uMap,vUv);
        float mn=min(px.r,min(px.g,px.b));
        float mx=max(px.r,max(px.g,px.b));
        float chroma=mx-mn;
        float bg=smoothstep(.965,.997,mn)*(1.0-smoothstep(.018,.07,chroma));
        float a=(1.0-bg)*uAlpha;
        if(a<.008)discard;
        gl_FragColor=vec4(px.rgb,a);
      }
    `
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*ratio,height),mat);
  mesh.renderOrder=12;
  return mesh;
}

function createSloganPlane(){
  const canvas=document.createElement('canvas');
  canvas.width=1600;canvas.height=260;
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font='700 96px Arial, Helvetica, sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle='#f4f7f8';
  ctx.fillText('Sua equipe merece qualidade !',800,130);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false});
  mat.toneMapped=false;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(5.25,.85),mat);
  plane.renderOrder=13;
  return plane;
}

function createPCBBackground(){
  const mat=new THREE.ShaderMaterial({
    uniforms:{uAlpha:{value:0},uFlow:{value:0},uAspect:{value:1.777}},
    transparent:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      uniform float uAlpha;
      uniform float uFlow;
      uniform float uAspect;
      varying vec2 vUv;

      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      vec2 seg(vec2 p,vec2 a,vec2 b){
        vec2 ab=b-a;
        float t=clamp(dot(p-a,ab)/dot(ab,ab),0.0,1.0);
        return vec2(length(p-(a+ab*t)),t);
      }
      float sdBox(vec2 p,vec2 b){
        vec2 d=abs(p)-b;
        return length(max(d,0.0))+min(max(d.x,d.y),0.0);
      }
      float pulse(vec2 q,float phase){
        float along=abs(fract(q.y-uFlow-phase+.5)-.5);
        return exp(-q.x*240.0)*exp(-along*along*1500.0);
      }
      float lineGlow(vec2 q){return exp(-q.x*310.0);}

      void main(){
        vec2 p=(vUv-.5)*vec2(uAspect,1.0);
        vec3 col=vec3(.006,.020,.023);

        vec2 cell=floor((p+2.0)*vec2(34.0,34.0));
        float grain=(hash(cell)-.5)*.018;
        col+=grain;
        float gridX=1.0-smoothstep(.485,.5,abs(fract((p.x+2.0)*20.0)-.5));
        float gridY=1.0-smoothstep(.485,.5,abs(fract((p.y+1.0)*20.0)-.5));
        col+=vec3(.00,.055,.045)*(gridX+gridY)*.18;

        vec2 s1=seg(p,vec2(-.82,.34),vec2(-.23,.34));
        vec2 s2=seg(p,vec2(-.23,.34),vec2(-.06,.17));
        vec2 s3=seg(p,vec2(-.06,.17),vec2(.54,.17));
        vec2 s4=seg(p,vec2(.54,.17),vec2(.71,.00));
        vec2 s5=seg(p,vec2(.71,.00),vec2(.71,-.37));
        vec2 s6=seg(p,vec2(-.74,-.34),vec2(-.16,-.34));
        vec2 s7=seg(p,vec2(-.16,-.34),vec2(.04,-.14));
        vec2 s8=seg(p,vec2(.04,-.14),vec2(.48,-.14));
        vec2 s9=seg(p,vec2(-.58,.05),vec2(-.32,.05));
        vec2 s10=seg(p,vec2(-.32,.05),vec2(-.20,-.07));
        vec2 s11=seg(p,vec2(.18,.40),vec2(.18,.25));
        vec2 s12=seg(p,vec2(.18,.25),vec2(.38,.05));
        vec2 s13=seg(p,vec2(.38,.05),vec2(.84,.05));
        vec2 s14=seg(p,vec2(.08,-.42),vec2(.08,-.28));
        vec2 s15=seg(p,vec2(.08,-.28),vec2(.28,-.08));

        float copper=0.0;
        copper+=lineGlow(s1)+lineGlow(s2)+lineGlow(s3)+lineGlow(s4)+lineGlow(s5);
        copper+=lineGlow(s6)+lineGlow(s7)+lineGlow(s8)+lineGlow(s9)+lineGlow(s10);
        copper+=lineGlow(s11)+lineGlow(s12)+lineGlow(s13)+lineGlow(s14)+lineGlow(s15);
        copper=clamp(copper,0.0,1.0);
        col=mix(col,vec3(.015,.24,.18),copper*.72);

        float electric=0.0;
        electric+=pulse(s1,.00)+pulse(s2,.07)+pulse(s3,.14)+pulse(s4,.20)+pulse(s5,.26);
        electric+=pulse(s6,.31)+pulse(s7,.38)+pulse(s8,.44);
        electric+=pulse(s9,.51)+pulse(s10,.57);
        electric+=pulse(s11,.63)+pulse(s12,.69)+pulse(s13,.76);
        electric+=pulse(s14,.83)+pulse(s15,.90);
        electric=clamp(electric,0.0,2.2);
        col+=vec3(.00,.66,.92)*electric*.88;
        col+=vec3(.00,.95,.56)*electric*electric*.26;

        float d1=length(p-vec2(-.82,.34));
        float d2=length(p-vec2(.71,-.37));
        float d3=length(p-vec2(-.74,-.34));
        float d4=length(p-vec2(.48,-.14));
        float d5=length(p-vec2(-.58,.05));
        float d6=length(p-vec2(.84,.05));
        float d7=length(p-vec2(.18,.40));
        float d8=length(p-vec2(.08,-.42));
        float d9=length(p-vec2(.04,-.14));
        float d10=length(p-vec2(.38,.05));
        float pad=(1.0-smoothstep(.018,.028,d1))+(1.0-smoothstep(.018,.028,d2))
          +(1.0-smoothstep(.018,.028,d3))+(1.0-smoothstep(.018,.028,d4))
          +(1.0-smoothstep(.018,.028,d5))+(1.0-smoothstep(.018,.028,d6))
          +(1.0-smoothstep(.018,.028,d7))+(1.0-smoothstep(.018,.028,d8))
          +(1.0-smoothstep(.018,.028,d9))+(1.0-smoothstep(.018,.028,d10));
        float padGlow=exp(-d1*45.0)+exp(-d2*45.0)+exp(-d3*45.0)+exp(-d4*45.0)+exp(-d5*45.0)
          +exp(-d6*45.0)+exp(-d7*45.0)+exp(-d8*45.0)+exp(-d9*45.0)+exp(-d10*45.0);
        col+=vec3(.00,.50,.38)*padGlow*.18;
        col+=vec3(.10,.42,.29)*clamp(pad,0.0,1.0)*.65;

        float chip=1.0-smoothstep(.006,.014,sdBox(p-vec2(-.35,-.15),vec2(.115,.075)));
        float chip2=1.0-smoothstep(.006,.014,sdBox(p-vec2(.50,.31),vec2(.095,.060)));
        col=mix(col,vec3(.012,.016,.018),max(chip,chip2));
        float pins=(1.0-smoothstep(.015,.025,abs(abs(p.x+.35)-.145)))*(1.0-smoothstep(.12,.13,abs(p.y+.15)));
        pins+= (1.0-smoothstep(.015,.025,abs(abs(p.x-.50)-.125)))*(1.0-smoothstep(.10,.11,abs(p.y-.31)));
        col+=vec3(.28,.46,.40)*clamp(pins,0.0,1.0)*.38;

        float vignette=smoothstep(1.04,.25,length((vUv-.5)*vec2(1.18,1.0)));
        col*=.72+.28*vignette;
        gl_FragColor=vec4(col,uAlpha);
      }
    `
  });
  mat.toneMapped=false;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);
  mesh.position.z=-3.0;
  mesh.renderOrder=-5;
  return mesh;
}

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.pcb=createPCBBackground();
    this.scene.add(this.pcb);

    this.tgdeskGroup=new THREE.Group();
    this.scene.add(this.tgdeskGroup);

    const loader=new THREE.TextureLoader();
    this.tgdeskFavTexture=loader.load('./tgdesk-favicon-r1.webp',tex=>{
      tex.colorSpace=THREE.SRGBColorSpace;
      const count=2300;
      const rawHalf=Math.max(.001,this.targetMark?.userData?.halfWidth||1);
      const from=sampleObjectGeometry(this.targetMark,count,1/rawHalf);
      const to=sampleImageMask(tex.image,count,2.08);
      this.tgdeskMorph=createFragmentMorph(from,to,count,.014);
      this.scene.add(this.tgdeskMorph);
      window.dispatchEvent(new Event('tgworldready'));
    });
    this.tgdeskWordTexture=loader.load('./tgdesk-wordmark-r1.webp',tex=>{tex.colorSpace=THREE.SRGBColorSpace;window.dispatchEvent(new Event('tgworldready'));});

    this.tgdeskFav=keyedImagePlane(this.tgdeskFavTexture,683/644,2.08);
    this.tgdeskWord=keyedImagePlane(this.tgdeskWordTexture,898/190,.64);
    this.slogan=createSloganPlane();
    this.tgdeskGroup.add(this.tgdeskFav,this.tgdeskWord,this.slogan);
    opacity(this.tgdeskFav,0);
    opacity(this.tgdeskWord,0);
    this.slogan.material.opacity=0;
  }

  resize(w,h,portrait){
    super.resize(w,h,portrait);

    // TGBC must occupy the browser window itself — no white letterbox frame.
    // Cover is deliberate: preserve UI proportions and crop only the excess edge.
    if(this.appTour && this.viewW && this.viewH){
      const W=this.appTour.userData.W,H=this.appTour.userData.H;
      const cover=Math.max(this.viewW/W,this.viewH/H)*1.006;
      this.appTour.scale.setScalar(cover);
      this.appTour.position.set(0,0,0);
    }

    if(this.pcb){
      const d=Math.abs(this.camera.position.z-this.pcb.position.z);
      const planeH=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*d;
      const planeW=planeH*this.camera.aspect;
      this.pcb.scale.set(planeW/2*1.03,planeH/2*1.03,1);
      this.pcb.material.uniforms.uAspect.value=w/Math.max(1,h);
    }
  }

  render(state){
    super.render(state);
    const p=state.p||0;
    const portrait=!!state.portrait;

    // Bring the TGBC wordmark back with the centered favicon before the next product.
    if(p>1.665 && this.targetWord && this.targetMark){
      const wordReturn=mix(p,1.675,1.770);
      const wordOut=mix(p,1.825,1.905);
      const a=wordReturn*(1-wordOut);
      if(portrait){
        const fit=Math.min(.54,3.12/Math.max(.001,this.targetWord.userData.width));
        const visibleH=this.targetWord.userData.height*fit;
        this.targetWord.scale.setScalar(fit);
        this.targetWord.position.set(0,-1.0-.24-visibleH/2,0);
      }else{
        const fit=Math.min(.54,3.10/Math.max(.001,this.targetWord.userData.width));
        const visibleW=this.targetWord.userData.width*fit;
        this.targetWord.scale.setScalar(fit);
        this.targetWord.position.set(1.0+.32+visibleW/2,-.01,0);
      }
      this.targetWord.rotation.set(0,0,0);
      opacity(this.targetWord,a);
    }

    // New phase: TGBC breaks into the exact reverse-style fragment transition,
    // then those fragments assemble the TGDesk favicon.
    const pcbIn=mix(p,1.840,2.000);
    const breakIn=mix(p,1.825,1.925);
    const morph=mix(p,1.900,2.075);
    const favIn=mix(p,2.015,2.105);
    const settle=mix(p,2.090,2.220);
    const wordIn=mix(p,2.125,2.235);
    const sloganIn=mix(p,2.155,2.285);

    if(p>1.805){
      if(this.bg?.material?.uniforms?.uAlpha)this.bg.material.uniforms.uAlpha.value=1-pcbIn;
      if(this.pcb?.material?.uniforms){
        this.pcb.visible=pcbIn>.001;
        this.pcb.material.uniforms.uAlpha.value=pcbIn;
        // Electrical motion is scroll-derived only. Stop scrolling = electricity freezes.
        this.pcb.material.uniforms.uFlow.value=(p-1.84)*2.85;
      }

      opacity(this.targetMark,1-breakIn);
      if(this.tgdeskMorph?.material?.uniforms){
        this.tgdeskMorph.visible=p>1.825 && p<2.15;
        this.tgdeskMorph.material.uniforms.uBreak.value=breakIn;
        this.tgdeskMorph.material.uniforms.uMorph.value=morph;
        this.tgdeskMorph.material.uniforms.uAlpha.value=mix(p,1.830,1.875)*(1-mix(p,2.055,2.145));
      }

      const desktopX=1.58*settle;
      const desktopY=.18*settle;
      const portraitY=.38*settle;
      this.tgdeskFav.position.set(portrait?0:desktopX,portrait?portraitY:desktopY,.22);
      this.tgdeskFav.scale.setScalar(lerp(1,portrait?.92:.88,settle));
      opacity(this.tgdeskFav,favIn);

      if(portrait){
        this.tgdeskWord.position.set(0,-1.15,.24);
        this.tgdeskWord.scale.setScalar(.92);
        this.slogan.position.set(0,2.18,.22);
        this.slogan.scale.setScalar(.76);
      }else{
        this.tgdeskWord.position.set(3.78,.10,.24);
        this.tgdeskWord.scale.setScalar(.76);
        this.slogan.position.set(-2.78,.02,.22);
        this.slogan.scale.setScalar(.82);
      }
      opacity(this.tgdeskWord,wordIn);
      this.slogan.visible=sloganIn>.001;
      this.slogan.material.opacity=sloganIn;
      this.slogan.position.z=.24;

      if(p>2.145){
        opacity(this.targetWord,0);
        opacity(this.targetMark,0);
      }
    }else{
      this.pcb.visible=false;
      if(this.tgdeskMorph)this.tgdeskMorph.visible=false;
      opacity(this.tgdeskFav,0);
      opacity(this.tgdeskWord,0);
      this.slogan.visible=false;
    }

    this.renderer.render(this.scene,this.camera);
  }
}
