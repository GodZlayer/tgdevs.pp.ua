(() => {
  "use strict";

  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const mixRange=(v,a,b)=>smooth(clamp((v-a)/(b-a)));

  const PARTICLE_VS=`#version 300 es
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_dpr;
  uniform float u_build;
  uniform float u_visibility;
  uniform float u_flow;
  uniform float u_portrait;
  uniform float u_orbMorph;
  uniform float u_orbExpand;
  out vec4 v_color;

  float hash(float n){return fract(sin(n*12.9898+78.233)*43758.5453);}
  vec3 grad3(vec3 a,vec3 b,vec3 c,float t){return t<.5?mix(a,b,t*2.0):mix(b,c,(t-.5)*2.0);}

  void main(){
    const float COLS=256.0;
    const float ROWS=78.0;
    const float PER=COLS*ROWS;

    float gid=float(gl_VertexID);
    float surface=step(PER,gid);
    float id=mod(gid,PER);
    float col=mod(id,COLS);
    float row=floor(id/COLS);
    float u=col/(COLS-1.0);
    float d=row/(ROWS-1.0);
    bool reverse=surface>.5;

    float seed=id+surface*23000.0+1.0;
    float reveal=clamp((reverse?1.0-u:u)*.91+hash(seed+171.0)*.09,0.0,1.0);
    float born=smoothstep(reveal*.91,reveal*.91+.12,u_build);

    float phase=(reverse?2.05:.3)+(hash(seed+1337.0)-.5)*.42;
    float freq1=reverse?7.1:8.4;
    float freq2=reverse?15.2:16.8;
    float w1=sin(u*freq1+d*3.2+phase+u_flow*1.35);
    float w2=sin(u*freq2-d*5.1+phase*.7-u_flow*.72);
    float w3=cos(u*9.5+d*6.4+phase*.5+u_flow*.55);

    float portrait=u_portrait;
    float baseY=mix(reverse?-.37:-.13,reverse?-.28:-.08,portrait);
    float amp=mix(reverse ? .28 : .25,reverse ? .23 : .21,portrait);
    float shear=reverse?-.43:.39;

    vec3 p;
    p.x=mix(-1.55,1.55,u)+(d-.5)*shear+w3*.025+(hash(seed)-.5)*.018+(u_flow-.5)*(reverse?-.055:.065);
    p.y=baseY+w1*amp+w2*amp*.24+(d-.5)*.34+(hash(seed+3107.0)-.5)*.016+(u_flow-.5)*(reverse ? .035 : -.04);
    p.z=mix(-.92,.72,d)+w2*.075+w3*.045;

    /* The world collapses into a real spherical point cloud around the brand. */
    float theta=u*6.28318530718+surface*3.14159265359;
    float phi=(d*.94+.03)*3.14159265359;
    vec3 sphere=vec3(sin(phi)*cos(theta),cos(phi),sin(phi)*sin(theta));
    float sphereRadius=mix(.86,.96,u_portrait);
    sphere*=sphereRadius;
    sphere.y+=mix(0.0,-.16,u_portrait);
    sphere.z*=.78;

    p=mix(p,sphere,u_orbMorph);
    p.xy*=mix(1.0,3.65,u_orbExpand);
    p.z*=mix(1.0,2.15,u_orbExpand);

    float yaw=mix(-.055,.045,u_flow);
    float cy=cos(yaw),sy=sin(yaw);
    p.xz=mat2(cy,-sy,sy,cy)*p.xz;

    float cameraZ=3.15;
    float persp=1.38/max(.72,cameraZ-p.z);
    float aspect=u_resolution.x/max(1.0,u_resolution.y);
    vec2 clip=vec2(p.x*persp/max(.72,aspect*.72),p.y*persp*1.72);
    gl_Position=vec4(clip,clamp((p.z+1.2)/3.0,0.0,1.0),1.0);

    float edge=sin(3.14159265*clamp(u,0.0,1.0));
    float alpha=born*u_visibility*edge*mix(.06,.46,d)*mix(.55,1.0,hash(seed+701.0));
    alpha*=mix(1.0,.16,u_orbExpand);
    if(reverse)alpha*=.94;

    vec3 blue=vec3(.043,.486,1.0),cyan=vec3(0.0,.78,.85),green=vec3(0.0,.90,.42);
    float ct=reverse?1.0-u:u;
    vec3 color=reverse?grad3(green,cyan,blue,ct):grad3(blue,cyan,vec3(0.0,.90,.70),ct);

    gl_PointSize=mix(1.0,3.9,d)*mix(.82,1.30,hash(seed+991.0))*mix(1.0,1.32,u_orbMorph)*u_dpr;
    v_color=vec4(color,alpha);
  }`;

  const PARTICLE_FS=`#version 300 es
  precision highp float;
  in vec4 v_color;
  out vec4 outColor;
  void main(){
    vec2 d=gl_PointCoord*2.0-1.0;
    float r2=dot(d,d);
    if(r2>1.0)discard;
    float soft=1.0-smoothstep(.42,1.0,r2);
    outColor=vec4(v_color.rgb,v_color.a*soft);
  }`;

  const GEO_VS=`#version 300 es
  precision highp float;
  layout(location=0) in vec3 a_pos;
  layout(location=1) in vec4 a_color;
  out vec4 v_color;
  void main(){gl_Position=vec4(a_pos,1.0);v_color=a_color;}
  `;

  const GEO_FS=`#version 300 es
  precision highp float;
  in vec4 v_color;
  out vec4 outColor;
  void main(){outColor=v_color;}
  `;

  function compile(gl,type,src){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"shader compile failed");
    return s;
  }
  function makeProgram(gl,vs,fs){
    const p=gl.createProgram();
    gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));
    gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||"program link failed");
    return p;
  }

  function rgba(hex,a=1){
    const h=hex.replace("#","");
    return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255,a];
  }
  function colorMix(a,b,t,alpha){
    return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t),alpha];
  }

  const BLUE=rgba("#0b7cff"),CYAN=rgba("#00c7d9"),GREEN=rgba("#00e66b");
  const WHITE=rgba("#f5f7f8"),MUTED=rgba("#60717a");

  function tr(x,y,z,w,h,ry=0,rx=0){return {x,y,z,w,h,ry,rx};}
  const SCENES={
    tgbc:[
      tr(.58,.02,.05,1.48,.88,-.10),tr(-.70,.58,-.30,.56,.25,.22),tr(-.82,.12,.05,.62,.27,.16),
      tr(-.65,-.42,.22,.58,.27,.12),tr(.15,.70,-.42,.64,.28,-.08),tr(.18,-.68,-.22,.64,.28,.04),
      tr(1.55,.55,-.40,.52,.24,-.25),tr(1.62,.03,-.10,.58,.26,-.24),tr(1.48,-.53,.20,.58,.26,-.18),
      tr(.78,.94,-.70,.44,.18,-.05),tr(.90,-.94,-.58,.44,.18,.06),tr(-1.40,.82,-.72,.38,.16,.30)
    ],
    desk:[
      tr(-.38,.00,.00,1.72,1.02,.10),tr(-1.48,.42,.18,.50,.76,.28),tr(1.02,.38,-.12,.72,.40,-.20),
      tr(1.18,-.18,.08,.70,.38,-.16),tr(-1.36,-.55,-.12,.64,.30,.23),tr(.32,-.82,-.38,.72,.24,-.05),
      tr(.70,.78,-.52,.44,.20,-.12),tr(1.50,.72,-.72,.36,.16,-.30),tr(1.52,-.72,-.60,.36,.16,-.28),
      tr(-.60,.92,-.72,.36,.16,.08),tr(-1.76,.00,-.68,.34,.15,.34),tr(.10,.98,-.85,.28,.13,0)
    ],
    partners:[
      tr(-1.52,.18,.25,.74,.92,.32),tr(-.90,.04,.05,.74,.92,.18),tr(-.26,-.04,-.08,.74,.92,.06),
      tr(.40,-.05,-.06,.74,.92,-.06),tr(1.05,.03,.08,.74,.92,-.18),tr(1.66,.16,.28,.74,.92,-.31),
      tr(-1.18,-.84,-.68,.38,.16,.22),tr(-.54,-.88,-.72,.38,.16,.12),tr(.08,-.90,-.74,.38,.16,0),
      tr(.70,-.88,-.72,.38,.16,-.12),tr(1.32,-.82,-.66,.38,.16,-.22),tr(.10,.96,-.88,.44,.16,0)
    ],
    demos:[
      tr(-.72,.00,.08,1.52,1.05,.12),tr(.90,.00,-.02,1.52,1.05,-.12),tr(-1.35,.74,-.62,.44,.16,.18),
      tr(1.46,.74,-.66,.44,.16,-.18),tr(-1.42,-.74,-.60,.44,.16,.18),tr(1.48,-.74,-.62,.44,.16,-.18),
      tr(-.05,.95,-.82,.34,.13,0),tr(.04,-.98,-.78,.34,.13,0),tr(-1.86,.05,-.88,.30,.12,.24),
      tr(1.88,.05,-.88,.30,.12,-.24),tr(-.10,.00,-1.05,.25,.11,0),tr(.12,.55,-1.02,.25,.11,0)
    ]
  };

  function sceneBlend(q){
    if(q<.26)return {a:"tgbc",b:"desk",t:mixRange(q,.20,.31),phase:"tgbc"};
    if(q<.54)return {a:"desk",b:"partners",t:mixRange(q,.46,.58),phase:"desk"};
    if(q<.82)return {a:"partners",b:"demos",t:mixRange(q,.74,.86),phase:"partners"};
    return {a:"demos",b:"demos",t:0,phase:"demos"};
  }

  function lerpTr(a,b,t){
    return {
      x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),
      w:lerp(a.w,b.w,t),h:lerp(a.h,b.h,t),ry:lerp(a.ry,b.ry,t),rx:lerp(a.rx,b.rx,t)
    };
  }

  function cameraFor(q,portrait){
    const keys=[
      {q:0,x:.12,y:.02,z:4.55,yaw:.12,pitch:-.02,fov:1.55},
      {q:.32,x:-.18,y:.00,z:4.35,yaw:-.10,pitch:.01,fov:1.58},
      {q:.62,x:.00,y:.02,z:4.95,yaw:.00,pitch:-.015,fov:1.68},
      {q:1,x:.04,y:0,z:4.45,yaw:.045,pitch:0,fov:1.58}
    ];
    let a=keys[0],b=keys[1];
    for(let i=0;i<keys.length-1;i++){if(q>=keys[i].q&&q<=keys[i+1].q){a=keys[i];b=keys[i+1];break;}}
    const t=smooth(clamp((q-a.q)/(b.q-a.q||1)));
    const p=portrait?1:0;
    return {
      x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)+p*.08,z:lerp(a.z,b.z,t)+p*.55,
      yaw:lerp(a.yaw,b.yaw,t),pitch:lerp(a.pitch,b.pitch,t),fov:lerp(a.fov,b.fov,t)*(portrait ? .92 : 1)
    };
  }

  function project(p,cam,aspect){
    let x=p[0]-cam.x,y=p[1]-cam.y,z=p[2];
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
    const x1=cy*x-sy*z,z1=sy*x+cy*z;
    const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    const y1=cp*y-sp*z1,z2=sp*y+cp*z1;
    const depth=Math.max(.35,cam.z-z2);
    const s=cam.fov/depth;
    return [x1*s/aspect,y1*s,z2/10];
  }

  function rotatePoint(local,t){
    let x=local[0],y=local[1],z=local[2];
    const cy=Math.cos(t.ry),sy=Math.sin(t.ry);
    let x1=cy*x+sy*z,z1=-sy*x+cy*z;
    const cx=Math.cos(t.rx),sx=Math.sin(t.rx);
    let y1=cx*y-sx*z1,z2=sx*y+cx*z1;
    return [x1+t.x,y1+t.y,z2+t.z];
  }

  function pushV(arr,p,c){arr.push(p[0],p[1],p[2],c[0],c[1],c[2],c[3]);}
  function pushTri(arr,a,b,c,col){pushV(arr,a,col);pushV(arr,b,col);pushV(arr,c,col);}
  function pushLine(arr,a,b,col){pushV(arr,a,col);pushV(arr,b,col);}

  class GeometryBuilder{
    constructor(cam,aspect){this.cam=cam;this.aspect=aspect;this.tris=[];this.lines=[];}
    P(world){return project(world,this.cam,this.aspect);}
    line(a,b,c){pushLine(this.lines,this.P(a),this.P(b),c);}
    quad(t,col){
      const a=rotatePoint([-t.w/2,-t.h/2,0],t),b=rotatePoint([t.w/2,-t.h/2,0],t),
            c=rotatePoint([t.w/2,t.h/2,0],t),d=rotatePoint([-t.w/2,t.h/2,0],t);
      const pa=this.P(a),pb=this.P(b),pc=this.P(c),pd=this.P(d);
      pushTri(this.tris,pa,pb,pc,col);pushTri(this.tris,pa,pc,pd,col);
      return {a,b,c,d};
    }
    panel(t,accent,alpha=.86,kind=0){
      const body=[.022,.035,.042,alpha];
      const edge=[accent[0],accent[1],accent[2],Math.min(1,alpha*.95)];
      const g=this.quad(t,body);
      this.line(g.a,g.b,edge);this.line(g.b,g.c,edge);this.line(g.c,g.d,edge);this.line(g.d,g.a,edge);

      const front=(lx,ly,lw,lh,boost=.12)=>{
        const z=.012;
        const tt={...t,w:lw*t.w,h:lh*t.h};
        const c0=rotatePoint([(lx-.5)*t.w,(ly-.5)*t.h,z],t);
        tt.x=c0[0];tt.y=c0[1];tt.z=c0[2];tt.ry=t.ry;tt.rx=t.rx;
        this.quad(tt,[accent[0],accent[1],accent[2],boost*alpha]);
      };

      if(kind===0){
        front(.07,.84,.84,.09,.32);front(.08,.64,.22,.11,.18);front(.34,.64,.26,.11,.13);front(.64,.64,.27,.11,.16);
        front(.08,.41,.40,.15,.09);front(.52,.41,.39,.15,.12);front(.08,.16,.83,.12,.08);
      }else if(kind===1){
        front(.06,.86,.88,.08,.27);front(.06,.12,.16,.66,.12);front(.25,.64,.67,.15,.12);front(.25,.43,.31,.14,.08);
        front(.61,.43,.31,.14,.10);front(.25,.20,.67,.12,.07);
      }else if(kind===2){
        front(.07,.84,.86,.07,.22);front(.07,.57,.86,.20,.08);front(.07,.30,.40,.18,.12);front(.53,.30,.40,.18,.10);
        front(.07,.11,.86,.08,.07);
      }else{
        front(.07,.84,.86,.08,.28);front(.07,.58,.25,.18,.14);front(.36,.58,.25,.18,.10);front(.65,.58,.28,.18,.16);
        front(.07,.32,.86,.13,.08);front(.07,.12,.58,.10,.09);front(.70,.12,.23,.10,.13);
      }
    }
    circle(cx,cy,cz,r,col,segments=48){
      let prev=null,first=null;
      for(let i=0;i<=segments;i++){
        const a=i/segments*Math.PI*2;
        const p=[cx+Math.cos(a)*r,cy+Math.sin(a)*r,cz];
        if(!first)first=p;if(prev)this.line(prev,p,col);prev=p;
      }
    }
  }

  class TGWorld3D{
    constructor(canvas){
      this.canvas=canvas;
      this.gl=canvas?.getContext("webgl2",{alpha:true,antialias:false,depth:true,stencil:false,premultipliedAlpha:true,powerPreference:"high-performance"})||null;
      this.fallback=null;this.ready=false;
      if(!this.gl){this.fallback=canvas?.getContext("2d",{alpha:true})||null;return;}
      const gl=this.gl;
      this.particleProgram=makeProgram(gl,PARTICLE_VS,PARTICLE_FS);
      this.geoProgram=makeProgram(gl,GEO_VS,GEO_FS);
      this.particleVAO=gl.createVertexArray();
      this.geoVAO=gl.createVertexArray();
      this.geoBuffer=gl.createBuffer();
      this.particleCount=256*78*2;

      this.pu={};
      ["u_resolution","u_dpr","u_build","u_visibility","u_flow","u_portrait","u_orbMorph","u_orbExpand"].forEach(n=>this.pu[n]=gl.getUniformLocation(this.particleProgram,n));

      gl.bindVertexArray(this.geoVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.geoBuffer);
      const stride=7*4;
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,stride,3*4);

      gl.enable(gl.BLEND);
      gl.clearColor(0,0,0,0);
      this.ready=true;
    }

    resize(w,h){
      if(!this.canvas)return;
      const dpr=Math.min(devicePixelRatio||1,1.5);
      const rw=Math.max(1,Math.round(w*dpr)),rh=Math.max(1,Math.round(h*dpr));
      if(this.canvas.width!==rw||this.canvas.height!==rh){this.canvas.width=rw;this.canvas.height=rh;}
      this.canvas.style.width=w+"px";this.canvas.style.height=h+"px";
      if(this.gl)this.gl.viewport(0,0,rw,rh);
    }

    renderParticles(state){
      const gl=this.gl;
      if(state.introVisibility<=.001||state.introBuild<=.001)return;
      gl.disable(gl.DEPTH_TEST);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      gl.useProgram(this.particleProgram);
      gl.bindVertexArray(this.particleVAO);
      gl.uniform2f(this.pu.u_resolution,this.canvas.width,this.canvas.height);
      gl.uniform1f(this.pu.u_dpr,Math.min(devicePixelRatio||1,1.5));
      gl.uniform1f(this.pu.u_build,state.introBuild);
      gl.uniform1f(this.pu.u_visibility,state.introVisibility);
      gl.uniform1f(this.pu.u_flow,state.flow);
      gl.uniform1f(this.pu.u_portrait,state.portrait?1:0);
      gl.uniform1f(this.pu.u_orbMorph,state.orbMorph||0);
      gl.uniform1f(this.pu.u_orbExpand,state.orbExpand||0);
      gl.drawArrays(gl.POINTS,0,this.particleCount);
    }

    sceneGeometry(tour,portrait){
      const cam=cameraFor(tour,portrait);
      const aspect=(this.canvas.width||1)/(this.canvas.height||1);
      const b=new GeometryBuilder(cam,aspect);
      const sb=sceneBlend(tour);
      const A=SCENES[sb.a],B=SCENES[sb.b];
      const sceneIndex={tgbc:0,desk:1,partners:2,demos:3}[sb.phase]||0;
      const palette=[
        [BLUE,CYAN],[CYAN,GREEN],[BLUE,GREEN],[CYAN,GREEN]
      ][sceneIndex];

      for(let i=0;i<A.length;i++){
        const t=lerpTr(A[i],B[i],sb.t);
        const ct=(i%6)/5;
        const accent=colorMix(palette[0],palette[1],ct,1);
        const alpha=i<6 ? .90 : .58;
        let kind=0;
        if(sb.phase==="desk")kind=1;
        else if(sb.phase==="partners")kind=2;
        else if(sb.phase==="demos")kind=3;
        b.panel(t,accent,alpha,kind);
      }

      if(sb.phase==="tgbc"){
        const c=[.58,.02,.12];
        const glow=[CYAN[0],CYAN[1],CYAN[2],.55];
        b.circle(c[0],c[1],c[2],.30,glow,56);
        b.circle(c[0],c[1],c[2]-.03,.43,[BLUE[0],BLUE[1],BLUE[2],.25],56);
        for(let i=1;i<9;i++){
          const t=lerpTr(A[i],B[i],sb.t);
          b.line([c[0],c[1],c[2]],[t.x,t.y,t.z],[CYAN[0],CYAN[1],CYAN[2],.18]);
        }
      }

      if(sb.phase==="desk"){
        const main=lerpTr(A[0],B[0],sb.t);
        for(let i=1;i<6;i++){
          const t=lerpTr(A[i],B[i],sb.t);
          b.line([main.x,main.y,main.z],[t.x,t.y,t.z],[GREEN[0],GREEN[1],GREEN[2],.16]);
        }
      }

      if(sb.phase==="partners"){
        for(let i=0;i<5;i++){
          const a=lerpTr(A[i],B[i],sb.t),c=lerpTr(A[i+1],B[i+1],sb.t);
          b.line([a.x,a.y-.58,a.z],[c.x,c.y-.58,c.z],[CYAN[0],CYAN[1],CYAN[2],.12]);
        }
      }

      if(sb.phase==="demos"){
        const left=lerpTr(A[0],B[0],sb.t),right=lerpTr(A[1],B[1],sb.t);
        b.line([left.x+.75,left.y,left.z],[right.x-.75,right.y,right.z],[GREEN[0],GREEN[1],GREEN[2],.22]);
      }

      return b;
    }

    uploadAndDraw(data,mode){
      const gl=this.gl;
      if(!data.length)return;
      gl.bindVertexArray(this.geoVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.geoBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
      gl.drawArrays(mode,0,data.length/7);
    }

    renderGeometry(state){
      if(state.tour<=.001)return;
      const gl=this.gl;
      const b=this.sceneGeometry(state.tour,state.portrait);
      gl.useProgram(this.geoProgram);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      this.uploadAndDraw(b.tris,gl.TRIANGLES);
      gl.disable(gl.DEPTH_TEST);
      this.uploadAndDraw(b.lines,gl.LINES);
    }

    render(state){
      const width=state.width||1440,height=state.height||900;
      this.resize(width,height);
      if(!this.ready){this.renderFallback(state);return;}
      const gl=this.gl;
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      this.renderParticles(state);
      this.renderGeometry(state);
    }

    renderFallback(state){
      const ctx=this.fallback;if(!ctx)return;
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      const sx=this.canvas.width/state.width,sy=this.canvas.height/state.height;
      ctx.save();ctx.scale(sx,sy);
      if(state.introVisibility>.001){
        ctx.globalCompositeOperation="lighter";
        for(let i=0;i<700;i++){
          const u=(i%70)/69,d=Math.floor(i/70)/9;
          if(u>state.introBuild*1.08)continue;
          const x=u*state.width,y=state.height*.63+Math.sin(u*8.4+d*3.2+state.flow)*state.height*.095+(d-.5)*state.height*.12;
          ctx.globalAlpha=state.introVisibility*(.025+d*.10)*Math.sin(Math.PI*u);
          ctx.fillStyle=u<.5?"#0b7cff":"#00d9a7";ctx.beginPath();ctx.arc(x,y,.7+d*1.2,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  window.TGWorld3D=TGWorld3D;
})();