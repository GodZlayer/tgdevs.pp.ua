import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const mix=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;

const C={
  bg:'#101317',
  surface:'#171b20',
  surface2:'#1d2228',
  surface3:'#242a31',
  border:'#343b45',
  borderSoft:'#2a3038',
  text:'#eef2f6',
  text2:'#aab3bf',
  text3:'#7f8995',
  primary:'#35a7ff',
  primaryContainer:'#173a5a',
  primaryText:'#d6ecff',
  ok:'#45c95a',
  warning:'#ffb020',
  critical:'#e5484d',
  cyan:'#18daf8',
  blue:'#078ff0'
};

function rr(ctx,x,y,w,h,r,fill,stroke=null,line=1){
  const q=Math.min(r,w*.5,h*.5);
  ctx.beginPath();
  ctx.moveTo(x+q,y);
  ctx.arcTo(x+w,y,x+w,y+h,q);
  ctx.arcTo(x+w,y+h,x,y+h,q);
  ctx.arcTo(x,y+h,x,y,q);
  ctx.arcTo(x,y,x+w,y,q);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
}

function txt(ctx,s,x,y,size=14,color=C.text,weight=400,align='left'){
  ctx.save();
  ctx.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;
  ctx.textAlign=align;
  ctx.textBaseline='top';
  ctx.fillStyle=color;
  ctx.fillText(s,x,y);
  ctx.restore();
}

function line(ctx,x1,y1,x2,y2,color,width=1){
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

function desktopIcon(ctx,x,y,color){
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.strokeRect(x,y,18,12);
  line(ctx,x+9,y+12,x+9,y+17,color,1.5);
  line(ctx,x+3,y+17,x+15,y+17,color,1.5);
}

function networkIcon(ctx,x,y,color){
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.strokeRect(x+5,y,16,11);
  line(ctx,x+13,y+11,x+13,y+18,color,1.5);
  line(ctx,x+13,y+18,x+4,y+23,color,1.5);
  line(ctx,x+13,y+18,x+22,y+23,color,1.5);
  ctx.fillStyle=color;
  ctx.fillRect(x+2,y+21,4,4);
  ctx.fillRect(x+20,y+21,4,4);
}

function shieldIcon(ctx,x,y,color){
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(x+10,y);
  ctx.lineTo(x+20,y+4);
  ctx.lineTo(x+18,y+16);
  ctx.lineTo(x+10,y+23);
  ctx.lineTo(x+2,y+16);
  ctx.lineTo(x,y+4);
  ctx.closePath();
  ctx.stroke();
}

function brand(ctx,x,y,scale=1){
  ctx.save();
  const g=ctx.createLinearGradient(x,y,x,y+24*scale);
  g.addColorStop(0,'#24e4ff');
  g.addColorStop(.55,'#08bff4');
  g.addColorStop(1,'#096bff');
  ctx.font=`700 ${24*scale}px Arial,Helvetica,sans-serif`;
  ctx.textBaseline='top';
  ctx.fillStyle=g;
  ctx.fillText('TG',x,y);
  const w=ctx.measureText('TG').width;
  ctx.fillStyle='#f4f9ff';
  ctx.fillText('Desk',x+w,y);
  ctx.restore();
}

function drawWindowChrome(ctx){
  ctx.fillStyle=C.surface;
  ctx.fillRect(0,0,1600,48);
  ctx.fillStyle=C.borderSoft;
  ctx.fillRect(0,47,1600,1);
  brand(ctx,16,10,.92);

  rr(ctx,1120,10,124,28,15,'#13251a');
  ctx.strokeStyle=C.ok;
  ctx.lineWidth=1.4;
  ctx.strokeRect(1133,19,9,8);
  ctx.beginPath();
  ctx.arc(1137.5,19,4,Math.PI,0);
  ctx.stroke();
  txt(ctx,'Canal seguro',1150,17,12,C.ok,500);
  txt(ctx,'v1.1.61',1260,18,11,C.text3);
  txt(ctx,'☰',1360,15,18,C.text2);
  txt(ctx,'—',1425,12,20,C.text2);
  txt(ctx,'□',1482,13,19,C.text2);
  txt(ctx,'×',1540,10,24,C.text2);
}

function drawHome(ctx,alpha=1,focus=0){
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.fillStyle=C.bg;
  ctx.fillRect(0,0,1600,900);
  drawWindowChrome(ctx);

  ctx.fillStyle=C.surface;
  ctx.fillRect(0,48,214,852);
  ctx.fillStyle=C.borderSoft;
  ctx.fillRect(213,48,1,852);

  txt(ctx,'OPERAÇÃO REMOTA',16,68,10,C.text3,700);
  ctx.fillStyle=C.ok;
  ctx.beginPath();ctx.arc(20,98,4,0,Math.PI*2);ctx.fill();
  txt(ctx,'Canal em tempo real',32,90,12,C.text2);

  rr(ctx,12,124,190,46,10,C.primaryContainer);
  // hub icon
  ctx.strokeStyle=C.primaryText;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(30,147,3,0,Math.PI*2);ctx.stroke();
  [[24,140],[38,140],[30,155]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fillStyle=C.primaryText;ctx.fill();});
  line(ctx,29,145,25,141,C.primaryText,1);
  line(ctx,31,145,37,141,C.primaryText,1);
  line(ctx,30,150,30,153,C.primaryText,1);
  txt(ctx,'Workspace',52,139,13,C.primaryText,700);

  shieldIcon(ctx,20,184,C.text3);
  txt(ctx,'Admin',52,188,13,C.text,500);
  txt(ctx,'REDE • SUBREDE • SESSÃO',16,865,9,C.text3,500);

  const left=238;
  const panelX=1300;
  txt(ctx,'Topologia de acesso',left,78,25,C.text,700);
  txt(ctx,'Selecione uma rede, sub-rede ou dispositivo para operar.',left,116,13,C.text2);
  rr(ctx,1236,74,36,36,8,C.surface2,C.border);
  txt(ctx,'+',1254,76,24,C.text,400,'center');

  // network selected
  rr(ctx,left,154,1038,154,12,C.primaryContainer,C.primary,1.3);
  networkIcon(ctx,left+18,178,C.primary);
  txt(ctx,'Loja Centro',left+58,172,15,C.text,700);
  txt(ctx,'10.70.6.0/24 · 2 sub-redes · 4 dispositivos',left+58,198,12,C.text2);
  txt(ctx,'3',1202,176,14,C.ok,700);
  rr(ctx,1234,168,32,32,8,C.surface2);
  txt(ctx,'Ⅱ',1250,175,13,C.text2,500,'center');
  line(ctx,left+16,232,1260,232,C.border,1);

  rr(ctx,left+18,250,175,34,17,C.surface3,C.border);
  txt(ctx,'⌘',left+33,256,13,C.text2);
  txt(ctx,'Caixas · 10.70.6.0/28',left+55,258,11,C.text2);
  rr(ctx,left+203,250,252,34,17,C.surface3,C.border);
  txt(ctx,'⌘',left+218,256,13,C.text2);
  txt(ctx,'Administrativo · 10.70.6.16/28',left+240,258,11,C.text2);

  rr(ctx,left,322,1038,82,12,C.surface,C.border);
  networkIcon(ctx,left+18,344,C.text3);
  txt(ctx,'Filial Pampulha',left+58,338,15,C.text,600);
  txt(ctx,'10.70.7.0/24 · 1 sub-rede · 3 dispositivos',left+58,365,12,C.text2);
  txt(ctx,'2',1202,344,14,C.ok,700);

  txt(ctx,'Dispositivos no escopo',left,438,13,C.text,700);
  const devs=[
    ['PDV-01','pronto para acesso',C.ok],
    ['Servidor-Loja','pronto para acesso',C.ok],
    ['Notebook-Gestão','presente, não pronto',C.warning],
    ['Estoque-02','offline',C.text3]
  ];
  let y=468;
  devs.forEach((d,i)=>{
    const selected=i===0;
    const pulse=selected?focus:0;
    if(selected){
      rr(ctx,left,y-6,1038,58,9,pulse>.02?'#223344':C.surface2,pulse>.02?C.primary:null,pulse>.02?1.2:1);
    }
    desktopIcon(ctx,left+16,y+8,d[2]);
    txt(ctx,d[0],left+52,y+1,13,C.text,500);
    txt(ctx,d[1],left+52,y+24,11,C.text3);
    txt(ctx,'›',1246,y+9,24,C.text3,400,'center');
    y+=62;
  });

  // context panel
  ctx.fillStyle=C.borderSoft;ctx.fillRect(panelX,48,1,852);
  txt(ctx,'Dispositivo',panelX+22,80,11,C.text3);
  txt(ctx,'PDV-01',panelX+22,105,20,C.text,700);
  txt(ctx,'pdv-caixa-01',panelX+22,136,12,C.text2);
  [['Presença','online'],['Acesso','pronto'],['Identidade','946 311 208']].forEach((r,i)=>{
    txt(ctx,r[0],panelX+22,188+i*58,10,C.text3,500);
    txt(ctx,r[1],panelX+22,207+i*58,12,C.text,500);
  });

  const btnPulse=.5+.5*Math.sin(focus*Math.PI);
  const btnY=818;
  rr(ctx,panelX+22,btnY,256,46,8,C.primary);
  desktopIcon(ctx,panelX+42,btnY+14,'#fff');
  txt(ctx,'Acessar remotamente',panelX+78,btnY+14,13,'#fff',700);
  if(focus>.1){
    ctx.strokeStyle=`rgba(53,167,255,${.25+.45*btnPulse})`;
    ctx.lineWidth=3;
    rr(ctx,panelX+18,btnY-4,264,54,10,null,ctx.strokeStyle,3);
  }
  ctx.restore();
}

function drawWindowsDesktop(ctx,alpha=1){
  ctx.save();
  ctx.globalAlpha*=alpha;

  const grad=ctx.createLinearGradient(0,0,1600,900);
  grad.addColorStop(0,'#07192f');
  grad.addColorStop(.45,'#0b4b84');
  grad.addColorStop(1,'#10223d');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,1600,900);

  // abstract Windows-like glow, original not copied
  const rg=ctx.createRadialGradient(980,410,40,980,410,480);
  rg.addColorStop(0,'rgba(58,181,255,.62)');
  rg.addColorStop(.45,'rgba(16,111,205,.23)');
  rg.addColorStop(1,'rgba(4,20,45,0)');
  ctx.fillStyle=rg;ctx.fillRect(0,0,1600,900);

  // desktop icons
  [['Este Computador',80,100],['Documentos',80,200],['Navegador',80,300]].forEach(([s,x,y])=>{
    rr(ctx,x,y,46,38,6,'rgba(255,255,255,.12)','rgba(255,255,255,.20)');
    txt(ctx,String(s),x-12,y+50,11,'#f2f6fb');
  });

  // fake app window
  rr(ctx,410,180,770,490,12,'rgba(245,248,252,.96)','rgba(255,255,255,.30)');
  ctx.fillStyle='#e8edf3';ctx.fillRect(410,180,770,42);
  txt(ctx,'Explorador de Arquivos',432,193,13,'#26313d',600);
  txt(ctx,'—   □   ×',1092,190,16,'#4b5560');
  rr(ctx,436,242,208,34,7,'#f7f9fb','#d5dce5');
  txt(ctx,'Acesso rápido',452,251,12,'#3b4752',600);
  const folders=['Desktop','Downloads','Documentos','Imagens'];
  folders.forEach((s,i)=>{
    rr(ctx,438,300+i*64,190,48,6,'#f5f7fa','#e0e5ea');
    rr(ctx,454,313+i*64,24,18,3,'#f4c542');
    txt(ctx,s,492,314+i*64,12,'#34404c',500);
  });
  rr(ctx,674,244,474,388,8,'#ffffff','#dfe4ea');
  txt(ctx,'Arquivos recentes',698,265,14,'#2d3742',700);
  for(let i=0;i<5;i++){
    line(ctx,698,310+i*54,1118,310+i*54,'#e4e8ed',1);
    txt(ctx,['Orçamento.xlsx','clientes.pdf','manual.pdf','Fotos','Backup.zip'][i],710,319+i*54,12,'#4d5864');
  }

  // taskbar
  ctx.fillStyle='rgba(10,18,30,.88)';
  ctx.fillRect(0,850,1600,50);
  rr(ctx,686,859,34,34,9,'rgba(255,255,255,.11)');
  // four squares
  ctx.fillStyle='#a9d9ff';
  [[694,867],[706,867],[694,879],[706,879]].forEach(([x,y])=>ctx.fillRect(x,y,8,8));
  rr(ctx,732,859,260,34,9,'rgba(255,255,255,.08)');
  txt(ctx,'Pesquisar',752,868,11,'#c8d2dd');
  txt(ctx,'10:27',1510,865,11,'#dbe3ec');

  ctx.restore();
}

function drawRemoteToolbar(ctx,active,alpha=1){
  ctx.save();ctx.globalAlpha*=alpha;
  rr(ctx,420,18,760,62,18,'rgba(15,20,27,.94)','rgba(86,108,130,.45)');
  const tools=[
    ['✎','Desenhar','draw'],
    ['●','Falar','talk'],
    ['⌁','Bloquear','lock'],
    ['◆','Testes','tests']
  ];
  tools.forEach((t,i)=>{
    const x=468+i*172;
    const on=active===t[2];
    rr(ctx,x,30,150,38,11,on?'rgba(53,167,255,.22)':'rgba(255,255,255,.04)',on?C.primary:'rgba(255,255,255,.08)');
    txt(ctx,t[0],x+18,38,16,on?C.primary:C.text2,700);
    txt(ctx,t[1],x+47,40,12,on?C.primaryText:C.text2,on?700:500);
  });
  ctx.restore();
}

function drawAnnotation(ctx,t){
  if(t<=0)return;
  const pts=[[520,520],[650,450],[790,475],[910,410],[1050,440]];
  ctx.save();
  ctx.strokeStyle='#ff3b30';
  ctx.lineWidth=8;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0],pts[0][1]);
  const seg=(pts.length-1)*clamp(t);
  const whole=Math.floor(seg);
  const frac=seg-whole;
  for(let i=1;i<=whole;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  if(whole<pts.length-1){
    const a=pts[whole],b=pts[whole+1];
    ctx.lineTo(lerp(a[0],b[0],frac),lerp(a[1],b[1],frac));
  }
  ctx.stroke();
  if(t>.82){
    txt(ctx,'verificar aqui',1062,421,18,'#ff6058',700);
  }
  ctx.restore();
}

function drawTalk(ctx,t){
  if(t<=0)return;
  ctx.save();ctx.globalAlpha*=clamp(t);
  const y=112+lerp(-20,0,mix(t,0,.45));
  rr(ctx,1060,y,430,112,18,'rgba(18,26,36,.96)','rgba(141,184,238,.32)');
  ctx.fillStyle=C.cyan;ctx.beginPath();ctx.arc(1096,y+35,13,0,Math.PI*2);ctx.fill();
  txt(ctx,'TGDesk',1120,y+21,12,C.primaryText,700);
  txt(ctx,'Olá! Vou verificar seu computador.',1092,y+55,15,C.text,600);
  txt(ctx,'Você pode acompanhar normalmente.',1092,y+79,12,C.text2);
  ctx.restore();
}

function drawLock(ctx,t){
  if(t<=0)return;
  ctx.save();ctx.globalAlpha*=clamp(t);
  rr(ctx,545,706,510,74,18,'rgba(12,18,26,.95)','rgba(255,176,32,.55)');
  ctx.strokeStyle=C.warning;ctx.lineWidth=3;
  ctx.strokeRect(576,730,20,18);
  ctx.beginPath();ctx.arc(586,730,9,Math.PI,0);ctx.stroke();
  txt(ctx,'Controle do usuário bloqueado',616,724,15,C.text,700);
  txt(ctx,'O técnico mantém o controle desta sessão.',616,748,12,C.text2);
  ctx.restore();
}

function drawTests(ctx,t){
  if(t<=0)return;
  ctx.save();ctx.globalAlpha*=clamp(t);
  const x=lerp(1600,1110,mix(t,0,.35));
  rr(ctx,x,96,450,690,18,'rgba(14,20,28,.98)','rgba(84,108,132,.48)');
  txt(ctx,'Diagnóstico rápido',x+28,122,22,C.text,700);
  txt(ctx,'Testes de hardware em tempo real',x+28,156,12,C.text2);
  const rows=[
    ['Processador','Estável',.78,C.ok],
    ['Memória','Adequada',.64,C.ok],
    ['Armazenamento','Verificando',.48,C.primary],
    ['Temperatura','42 °C',.57,C.ok]
  ];
  rows.forEach((r,i)=>{
    const y=214+i*112;
    rr(ctx,x+26,y,398,88,12,C.surface2,C.border);
    txt(ctx,r[0],x+44,y+17,13,C.text,700);
    txt(ctx,r[1],x+380,y+17,11,r[3],600,'right');
    rr(ctx,x+44,y+50,336,8,4,C.surface3);
    rr(ctx,x+44,y+50,336*r[2]*clamp((t-.15)*1.3),8,4,r[3]);
  });
  rr(ctx,x+26,690,398,62,12,'rgba(53,167,255,.10)','rgba(53,167,255,.38)');
  txt(ctx,'✓ Nenhum problema crítico detectado',x+50,711,13,C.primaryText,700);
  ctx.restore();
}

function drawRemote(ctx,alpha,effects){
  ctx.save();
  ctx.globalAlpha*=alpha;
  drawWindowsDesktop(ctx,1);

  const active=
    effects.tests>.06?'tests':
    effects.lock>.06?'lock':
    effects.talk>.06?'talk':
    effects.draw>.06?'draw':
    null;

  drawRemoteToolbar(ctx,active,1);
  drawAnnotation(ctx,effects.draw);
  drawTalk(ctx,effects.talk);
  drawLock(ctx,effects.lock);
  drawTests(ctx,effects.tests);

  // top-left remote identity tag
  rr(ctx,18,18,226,44,13,'rgba(12,18,27,.88)','rgba(92,120,145,.28)');
  ctx.fillStyle=C.ok;ctx.beginPath();ctx.arc(40,40,5,0,Math.PI*2);ctx.fill();
  txt(ctx,'PDV-01 · remoto',54,31,12,C.text,700);
  ctx.restore();
}


function makeApertureMaterial(texture){
  return new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uAlpha:{value:0},
      uAperture:{value:.05},
      uAspect:{value:16/9},
      uWarp:{value:.08},
      uEdge:{value:1}
    },
    transparent:true,
    depthWrite:false,
    depthTest:false,
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
      uniform float uAlpha;
      uniform float uAperture;
      uniform float uAspect;
      uniform float uWarp;
      uniform float uEdge;
      varying vec2 vUv;

      void main(){
        vec2 q=vUv-.5;
        vec2 qa=vec2(q.x*uAspect,q.y);
        float r=length(qa);
        vec2 uv=vUv+q*dot(q,q)*uWarp;
        vec4 px=texture2D(uMap,uv);
        float mask=1.0-smoothstep(uAperture,uAperture+.025,r);
        float edge=exp(-pow((r-uAperture)*82.0,2.0))*uEdge;
        vec3 glow=vec3(.08,.78,1.0)*edge*.34;
        gl_FragColor=vec4(min(px.rgb+glow,vec3(1.0)),px.a*uAlpha*mask);
      }
    `
  });
}

function makeBleedMaterial(texture){
  return new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:texture},
      uAlpha:{value:0},
      uAperture:{value:.05},
      uAspect:{value:16/9},
      uUvScale:{value:new THREE.Vector2(1,1)},
      uDark:{value:.76}
    },
    transparent:true,
    depthWrite:false,
    depthTest:false,
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
      uniform float uAlpha;
      uniform float uAperture;
      uniform float uAspect;
      uniform vec2 uUvScale;
      uniform float uDark;
      varying vec2 vUv;

      vec4 tap(vec2 uv,vec2 d){
        return texture2D(uMap,uv+d);
      }

      void main(){
        vec2 q=vUv-.5;
        vec2 qa=vec2(q.x*uAspect,q.y);
        float r=length(qa);
        float mask=1.0-smoothstep(uAperture,uAperture+.035,r);

        vec2 uv=.5+(vUv-.5)*uUvScale;
        vec2 px=vec2(.0034,.0060)*uUvScale;

        vec4 c=texture2D(uMap,uv)*.20;
        c+=tap(uv,vec2( px.x,0.0))*.12;
        c+=tap(uv,vec2(-px.x,0.0))*.12;
        c+=tap(uv,vec2(0.0, px.y))*.12;
        c+=tap(uv,vec2(0.0,-px.y))*.12;
        c+=tap(uv,vec2( px.x, px.y))*.08;
        c+=tap(uv,vec2(-px.x, px.y))*.08;
        c+=tap(uv,vec2( px.x,-px.y))*.08;
        c+=tap(uv,vec2(-px.x,-px.y))*.08;

        vec3 col=c.rgb*uDark;
        float vignette=1.0-smoothstep(.28,.78,length(q));
        col*=.82+.18*vignette;

        gl_FragColor=vec4(col,uAlpha*mask);
      }
    `
  });
}

export function createTGDeskPreview(){
  const canvas=document.createElement('canvas');
  const renderScale=Math.min(
    2.00,
    Math.max(1.35,globalThis.devicePixelRatio||1)
  );
  canvas.width=Math.round(1600*renderScale);
  canvas.height=Math.round(900*renderScale);
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.setTransform(renderScale,0,0,renderScale,0,0);

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=16;

  const bleedMaterial=makeBleedMaterial(texture);
  const bleed=new THREE.Mesh(
    new THREE.PlaneGeometry(1,1),
    bleedMaterial
  );
  bleed.position.z=-.035;
  bleed.renderOrder=219;
  bleed.frustumCulled=false;

  const material=makeApertureMaterial(texture);
  const screen=new THREE.Mesh(
    new THREE.PlaneGeometry(1,1),
    material
  );
  screen.renderOrder=220;
  screen.frustumCulled=false;

  const group=new THREE.Group();
  group.add(bleed,screen);
  group.visible=false;
  group.userData={
    canvas,
    ctx,
    texture,
    bleed,
    bleedMaterial,
    screen,
    material
  };
  return group;
}

export function updateTGDeskPreview(
  root,
  {
    p=0,
    alpha=0,
    aperture=.05,
    aspect=16/9,
    warp=.08,
    width=10,
    height=5.6
  }={}
){
  if(!root)return;
  const a=clamp(alpha);
  root.visible=a>.001;

  const designAspect=16/9;
  const viewportAspect=
    Math.max(.001,width/Math.max(.001,height));

  // Sharp program preview always uses CONTAIN: no pixel of the 1600x900
  // interface is discarded, regardless of browser ratio.
  let sharpW;
  let sharpH;
  if(viewportAspect>=designAspect){
    sharpH=height;
    sharpW=sharpH*designAspect;
  }else{
    sharpW=width;
    sharpH=sharpW/designAspect;
  }

  root.userData.screen.scale.set(
    sharpW,
    sharpH,
    1
  );

  // Bleed occupies the entire viewport. It samples the same live preview
  // in COVER mode, heavily blurred and darkened, so the unused aspect-ratio
  // area reads as continuation instead of a framed screen.
  root.userData.bleed.scale.set(
    width*1.012,
    height*1.012,
    1
  );

  const sharpU=root.userData.material.uniforms;
  sharpU.uAlpha.value=a;
  sharpU.uAperture.value=aperture;
  sharpU.uAspect.value=designAspect;
  sharpU.uWarp.value=warp;
  sharpU.uEdge.value=1-mix(aperture,.86,1.08);

  const bleedU=root.userData.bleedMaterial.uniforms;
  bleedU.uAlpha.value=a*.94;
  bleedU.uAperture.value=aperture;
  bleedU.uAspect.value=viewportAspect;

  if(viewportAspect>designAspect){
    bleedU.uUvScale.value.set(
      1,
      designAspect/viewportAspect
    );
  }else{
    bleedU.uUvScale.value.set(
      viewportAspect/designAspect,
      1
    );
  }

  const ctx=root.userData.ctx;
  ctx.clearRect(0,0,1600,900);

  // timeline local to TGDesk preview
  const access=mix(p,2.70,2.82);
  const remoteIn=mix(p,2.80,2.94);
  const draw=mix(p,2.94,3.08)*(1-mix(p,3.10,3.16));
  const talk=mix(p,3.08,3.18)*(1-mix(p,3.20,3.27));
  const lock=mix(p,3.19,3.30)*(1-mix(p,3.32,3.39));
  const tests=mix(p,3.30,3.43)*(1-mix(p,3.48,3.56));
  const returnHome=mix(p,3.48,3.62);

  const remoteA=remoteIn*(1-returnHome);
  const homeA=Math.max(1-remoteIn,returnHome);

  drawHome(ctx,homeA,access*(1-returnHome));
  drawRemote(ctx,remoteA,{draw,talk,lock,tests});

  if(returnHome>.001 && returnHome<.999){
    ctx.save();
    ctx.globalAlpha=.35*Math.sin(returnHome*Math.PI);
    ctx.strokeStyle=C.primary;
    ctx.lineWidth=4;
    rr(ctx,238,462,1038,58,10,null,C.primary,4);
    ctx.restore();
  }

  root.userData.texture.needsUpdate=true;
}

export function hideTGDeskPreview(root){
  if(!root)return;
  root.visible=false;
  root.userData.material.uniforms.uAlpha.value=0;
  root.userData.bleedMaterial.uniforms.uAlpha.value=0;
}
