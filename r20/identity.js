import * as THREE from 'three';
import { clamp, seeded } from './motion.js';

export function edgeKeyTexture(image){
  const w=image.naturalWidth||image.width;
  const h=image.naturalHeight||image.height;
  const canvas=document.createElement('canvas');
  canvas.width=w;
  canvas.height=h;

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
    return a>0 && mn>228 && mx-mn<28;
  };

  const push=(x,y)=>{
    const n=y*w+x;
    if(seen[n]||!nearWhite(x,y))return;
    seen[n]=1;
    qx[tail]=x;
    qy[tail]=y;
    tail++;
  };

  for(let x=0;x<w;x++){
    push(x,0);
    push(x,h-1);
  }

  for(let y=1;y<h-1;y++){
    push(0,y);
    push(w-1,y);
  }

  while(head<tail){
    const x=qx[head],y=qy[head];
    head++;

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

export function sampleTextureAlpha(
  texture,
  count,
  targetHeight,
  offsetX=0,
  offsetY=0,
  offsetZ=.28
){
  const canvas=texture.image;
  const w=canvas.width,h=canvas.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const d=ctx.getImageData(0,0,w,h).data;
  const pts=[];
  const step=Math.max(1,Math.floor(Math.min(w,h)/220));

  for(let y=0;y<h;y+=step){
    for(let x=0;x<w;x+=step){
      if(d[(y*w+x)*4+3]>48)pts.push([x,y]);
    }
  }

  const out=new Float32Array(count*3);
  if(!pts.length)return out;

  const ratio=w/h;
  const targetWidth=targetHeight*ratio;

  for(let i=0;i<count;i++){
    const p=pts[Math.floor(seeded(i*31.71+.27)*pts.length)%pts.length];

    out[i*3]=(p[0]/w-.5)*targetWidth+offsetX;
    out[i*3+1]=(.5-p[1]/h)*targetHeight+offsetY;
    out[i*3+2]=(seeded(i*9.77)-.5)*.045+offsetZ;
  }

  return out;
}

export function revealPlane(texture,ratio,height){
  const mat=new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uReveal:{value:0},
      uAlpha:{value:0}
    },
    transparent:true,
    depthWrite:false,
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
      uniform float uReveal;
      uniform float uAlpha;
      varying vec2 vUv;

      void main(){
        vec4 px=texture2D(uMap,vUv);
        float edge=smoothstep(vUv.x-.09,vUv.x+.025,uReveal);
        float glint=exp(-pow((vUv.x-uReveal)*22.0,2.0));
        vec3 col=min(vec3(1.0),px.rgb+vec3(.05,.22,.24)*glint);
        float a=px.a*edge*uAlpha;

        if(a<.004)discard;
        gl_FragColor=vec4(col,a);
      }
    `
  });

  const mesh=new THREE.Mesh(
    new THREE.PlaneGeometry(height*ratio,height),
    mat
  );
  mesh.renderOrder=30;
  return mesh;
}

export function sloganTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=1900;
  canvas.height=300;

  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font='700 106px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#f4f7f8';
  ctx.fillText('Sua equipe merece qualidade !',950,150);

  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  return tex;
}

export function gradientLine(){
  const geo=new THREE.BoxGeometry(2.85,.035,.045,48,1,1);
  const p=geo.getAttribute('position');
  const colors=new Float32Array(p.count*3);

  const blue=new THREE.Color('#0b7cff');
  const cyan=new THREE.Color('#00c7d9');
  const green=new THREE.Color('#00e66b');
  const tmp=new THREE.Color();

  for(let i=0;i<p.count;i++){
    const t=clamp((p.getX(i)+1.425)/2.85);

    if(t<.55){
      tmp.copy(blue).lerp(cyan,t/.55);
    }else{
      tmp.copy(cyan).lerp(green,(t-.55)/.45);
    }

    colors[i*3]=tmp.r;
    colors[i*3+1]=tmp.g;
    colors[i*3+2]=tmp.b;
  }

  geo.setAttribute(
    'color',
    new THREE.BufferAttribute(colors,3)
  );

  const mat=new THREE.MeshBasicMaterial({
    vertexColors:true,
    transparent:true,
    opacity:0,
    depthWrite:false
  });

  mat.toneMapped=false;

  const mesh=new THREE.Mesh(geo,mat);
  mesh.renderOrder=29;
  mesh.scale.x=0;
  return mesh;
}
