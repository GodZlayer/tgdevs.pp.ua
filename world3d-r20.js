import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r16.js';
import {
  clamp,
  mix,
  lerp,
  opacity,
  copyTransform,
  restoreTransform,
  sampleWorldRoots,
  createMorph,
  setMorph
} from './r20/motion.js';
import {
  edgeKeyTexture,
  revealPlane,
  sloganTexture,
  gradientLine
} from './r20/identity.js';
import {
  createApiCycle,
  createMatterMorph
} from './r20/matter.js';
import { createTGDeskMark3D } from './r20/tgdesk3d.js';

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.apiCycle=createApiCycle();
    this.identity.add(this.apiCycle);

    this.galleryMorphs=[];
    this.closeMorphs=[];
    this.matter=null;
    this.deskMorph=null;

    this.deskFav=null;
    this.deskWord=null;

    // Canonical TGDesk favicon is a real 3D object now.
    // The raster is no longer used as the final mark.
    this.deskMark3D=createTGDeskMark3D();
    this.scene.add(this.deskMark3D);
    opacity(this.deskMark3D,0);

    this.deskSlogan=revealPlane(
      sloganTexture(),
      1900/300,
      .76
    );

    this.deskLine=gradientLine();

    this.scene.add(
      this.deskSlogan,
      this.deskLine
    );

    this.deskSlogan.visible=false;
    this.deskLine.visible=false;

    this._r20Snapshots=null;
    this._r20BuildKey='';
    const loader=new THREE.TextureLoader();

    loader.load(
      './tgdesk-wordmark-r1.webp',
      source=>{
        const tex=edgeKeyTexture(source.image);

        this.deskWord=revealPlane(
          tex,
          898/190,
          .62
        );

        this.deskWord.renderOrder=52;
        this.scene.add(this.deskWord);
        this.deskWord.visible=false;

        window.dispatchEvent(
          new Event('tgworldready')
        );
      }
    );
  }

  _snapshot(){
    if(!this.appTour || this._r20Snapshots)return;

    const u=this.appTour.userData;

    const roots=[
      u.shell,
      u.headerDetails,
      u.sidebarTitle,
      u.cargos,
      u.subheader,
      u.customers,
      u.stockScreen,
      u.fiscalScreen,
      u.statsScreen,
      u.servicesScreen,
      u.tiersScreen,
      ...u.navMeshes.map(n=>n.holder)
    ].filter(Boolean);

    this._r20Snapshots=
      new Map(
        roots.map(
          o=>[o,copyTransform(o)]
        )
      );
  }

  _restore(){
    if(!this._r20Snapshots)return;

    for(const [o,s] of this._r20Snapshots){
      restoreTransform(o,s);
    }
  }

  resize(w,h,portrait){
    const before=this._sizeKey;

    super.resize(w,h,portrait);

    if(this.appTour && this.viewW && this.viewH){
      const W=this.appTour.userData.W;
      const H=this.appTour.userData.H;

      // The TGBC application is the viewport,
      // not a picture floating inside a white frame.
      const cover=
        Math.max(
          this.viewW/W,
          this.viewH/H
        )*1.004;

      this.appTour.scale.setScalar(cover);
      this.appTour.position.set(0,0,0);
    }

    if(before!==this._sizeKey){
      this._r20BuildKey='';
    }
  }

  _clearBuilt(){
    for(const m of [
      ...this.galleryMorphs,
      ...this.closeMorphs
    ]){
      this.scene.remove(m);
    }

    this.galleryMorphs=[];
    this.closeMorphs=[];

    if(this.matter){
      this.scene.remove(this.matter);
      this.matter=null;
    }

    if(this.deskMorph){
      this.scene.remove(this.deskMorph);
      this.deskMorph=null;
    }
  }

  _buildR20(portrait,p){
    if(
      !this.textReady ||
      !this.appTour ||
      !this.targetMark ||
      p<.94
    )return;

    const key=
      this._sizeKey+
      '|desk3d';

    if(this._r20BuildKey===key)return;

    this._r20BuildKey=key;
    this._clearBuilt();
    this._snapshot();

    const u=this.appTour.userData;

    // The low-quality gallery is replaced by physical screen-to-screen matter.
    const galleryPairs=[
      [u.customers,u.stockScreen],
      [u.stockScreen,u.fiscalScreen],
      [u.fiscalScreen,u.statsScreen],
      [u.statsScreen,u.servicesScreen],
      [u.servicesScreen,u.tiersScreen]
    ];

    galleryPairs.forEach(
      ([a,b],i)=>{
        const count=portrait?1350:2600;

        const morph=createMorph(
          sampleWorldRoots([a],count),
          sampleWorldRoots([b],count),
          count,
          .009,
          {ui:true}
        );

        morph.visible=false;
        morph.renderOrder=22+i;

        this.scene.add(morph);
        this.galleryMorphs.push(morph);
      }
    );

    // Closing grammar:
    // eight visible interface regions become the eight physical TGBC groups.
    const tierChildren=[
      ...u.tiersScreen.children
    ];

    const third=
      Math.max(
        1,
        Math.ceil(tierChildren.length/3)
      );

    const nav=
      u.navMeshes.map(n=>n.holder);

    const closeSources=[
      [u.headerDetails,this.targetWordLight],
      [u.sidebarTitle,nav[0],nav[1]],
      [nav[2],nav[3],nav[4],nav[5],u.cargos],
      [
        u.subheader,
        u.searchGeneric,
        u.searchClients,
        u.searchStock
      ],
      tierChildren.slice(0,third),
      tierChildren.slice(third,third*2),
      tierChildren.slice(third*2),
      [u.shell]
    ];

    const targetPieces=[
      this.targetMark.userData.first,
      this.targetMark.userData.steps[0],
      this.targetMark.userData.steps[1],
      this.targetMark.userData.steps[2],
      this.targetMark.userData.steps[3],
      this.targetMark.userData.steps[4],
      this.targetMark.userData.steps[5],
      this.targetMark.userData.center
    ];

    const markPos=
      this.targetMark.position.clone();

    const markScale=
      this.targetMark.scale.clone();

    const markQuat=
      this.targetMark.quaternion.clone();

    const markVisible=
      this.targetMark.visible;

    const rawHalf=
      Math.max(
        .001,
        this.targetMark.userData.halfWidth||1
      );

    this.targetMark.position.set(0,0,0);
    this.targetMark.scale.setScalar(1/rawHalf);
    this.targetMark.quaternion.identity();
    this.targetMark.visible=true;
    this.targetMark.updateMatrixWorld(true);

    closeSources.forEach(
      (roots,i)=>{
        const count=portrait?1000:1800;

        const morph=createMorph(
          sampleWorldRoots(
            roots.filter(Boolean),
            count
          ),
          sampleWorldRoots(
            [targetPieces[i]],
            count
          ),
          count,
          .011
        );

        morph.visible=false;
        this.scene.add(morph);
        this.closeMorphs.push(morph);
      }
    );

    // Only the actually visible final TGBC composition feeds the cloud.
    const matterRoots=[
      u.shell,
      u.headerDetails,
      u.sidebarTitle,
      u.cargos,
      u.subheader,
      u.tiersScreen,
      this.targetWordLight,
      ...u.navMeshes.map(n=>n.holder)
    ].filter(Boolean);

    const matterCount=
      portrait?9000:15000;

    this.matter=createMatterMorph(
      sampleWorldRoots(
        matterRoots,
        matterCount
      ),
      matterCount
    );

    this.matter.visible=false;
    this.scene.add(this.matter);

    {
      const count=portrait?2200:3800;

      const deskPos=this.deskMark3D.position.clone();
      const deskScale=this.deskMark3D.scale.clone();
      const deskQuat=this.deskMark3D.quaternion.clone();

      this.deskMark3D.position.set(
        portrait?0:1.12,
        portrait?.28:.06,
        .34
      );
      this.deskMark3D.scale.setScalar(
        portrait?.80:.92
      );
      this.deskMark3D.updateMatrixWorld(true);

      this.deskMorph=createMorph(
        sampleWorldRoots(
          [this.targetMark],
          count
        ),
        sampleWorldRoots(
          [this.deskMark3D],
          count
        ),
        count,
        .011
      );

      this.deskMorph.visible=false;
      this.scene.add(this.deskMorph);

      this.deskMark3D.position.copy(deskPos);
      this.deskMark3D.scale.copy(deskScale);
      this.deskMark3D.quaternion.copy(deskQuat);
    }

    this.targetMark.position.copy(markPos);
    this.targetMark.scale.copy(markScale);
    this.targetMark.quaternion.copy(markQuat);
    this.targetMark.visible=markVisible;
  }

  _renderApiCycle(p){
    const build=mix(p,.265,.405);
    const alpha=
      mix(p,.255,.285)*
      (1-mix(p,.410,.455));

    const u=this.apiCycle.userData;

    this.apiCycle.visible=alpha>.001;

    u.path.geometry.setDrawRange(
      0,
      Math.floor(u.count*build)
    );

    u.path.material.opacity=.46*alpha;

    const a=
      Math.PI/2-
      build*Math.PI*2;

    u.runner.position.set(
      Math.cos(a)*.625,
      Math.sin(a)*.625,
      .20
    );

    u.runner.material.opacity=.92*alpha;

    u.runner.scale.setScalar(
      .72+
      Math.sin(build*Math.PI)*.40
    );

    u.bubbles.forEach((b,i)=>{
      const threshold=(i+.40)/6;
      const local=
        mix(
          build,
          threshold-.035,
          threshold+.075
        );

      const pulse=
        Math.sin(
          clamp(local)*Math.PI
        );

      b.group.visible=local>.001;

      b.halo.material.opacity=
        alpha*
        (.18+.50*pulse)*
        (1-mix(local,.75,1));

      b.halo.scale.setScalar(
        lerp(.12,1.35,pulse)
      );
    });
  }

  _renderGallery(p){
    if(
      !this.appTour ||
      !this.galleryMorphs.length
    )return;

    const u=this.appTour.userData;

    const screens=[
      u.customers,
      u.stockScreen,
      u.fiscalScreen,
      u.statsScreen,
      u.servicesScreen,
      u.tiersScreen
    ];

    const ranges=[
      [.970,1.025],
      [1.095,1.150],
      [1.220,1.275],
      [1.345,1.400],
      [1.470,1.535]
    ];

    screens.forEach(
      s=>opacity(s,0)
    );

    this.galleryMorphs.forEach(
      m=>setMorph(m,0,0)
    );

    if(p<ranges[0][0]){
      opacity(screens[0],1);
      return;
    }

    let shown=5;

    for(let i=0;i<ranges.length;i++){
      const [a,b]=ranges[i];

      if(p<a){
        shown=i;
        break;
      }

      if(p<=b){
        const t=
          clamp((p-a)/(b-a));

        const crispOut=
          1-mix(t,.00,.26);

        const particles=
          mix(t,.08,.25)*
          (1-mix(t,.76,.96));

        const crispIn=
          mix(t,.74,1.0);

        opacity(
          screens[i],
          crispOut
        );

        opacity(
          screens[i+1],
          crispIn
        );

        setMorph(
          this.galleryMorphs[i],
          t,
          particles
        );

        return;
      }
    }

    opacity(screens[shown],1);
  }

  _closingSources(){
    const u=this.appTour.userData;
    const nav=
      u.navMeshes.map(n=>n.holder);

    const tier=[
      ...u.tiersScreen.children
    ];

    const third=
      Math.max(
        1,
        Math.ceil(tier.length/3)
      );

    return [
      [u.headerDetails,this.targetWordLight],
      [u.sidebarTitle,nav[0],nav[1]],
      [nav[2],nav[3],nav[4],nav[5],u.cargos],
      [
        u.subheader,
        u.searchGeneric,
        u.searchClients,
        u.searchStock
      ],
      tier.slice(0,third),
      tier.slice(third,third*2),
      tier.slice(third*2),
      [u.shell]
    ];
  }

  _renderClosing(p){
    const sources=
      this._closingSources();

    const targets=[
      this.targetMark.userData.first,
      ...this.targetMark.userData.steps,
      this.targetMark.userData.center
    ];

    this.appBackdrop.visible=true;

    if(this.appBackdrop.material){
      this.appBackdrop.material.opacity=
        1-mix(p,1.62,1.92);
    }

    const rawHalf=
      Math.max(
        .001,
        this.targetMark.userData.halfWidth||1
      );

    this.targetMark.position.set(0,0,0);
    this.targetMark.scale.setScalar(1/rawHalf);
    this.targetMark.quaternion.identity();
    this.targetMark.visible=true;

    targets.forEach(
      t=>opacity(t,0)
    );

    sources.forEach(
      group=>
        group.forEach(
          o=>opacity(o,1)
        )
    );

    this.closeMorphs.forEach(
      m=>setMorph(m,0,0)
    );

    for(let i=0;i<8;i++){
      const a=1.555+i*.036;
      const b=a+.112;
      const local=
        clamp((p-a)/(b-a));

      const sourceA=
        1-mix(local,.05,.35);

      const particleA=
        mix(local,.05,.28)*
        (1-mix(local,.76,.98));

      const targetA=
        mix(local,.72,1.0);

      sources[i].forEach(
        o=>opacity(o,sourceA)
      );

      setMorph(
        this.closeMorphs[i],
        local,
        particleA
      );

      opacity(
        targets[i],
        targetA
      );
    }

    // Interface debris does not fade into a static cloud.
    // Individual particles are born from the page, detach on different schedules
    // and move through a deterministic turbulence field driven by scroll.
    if(this.matter?.material?.uniforms){
      const birth=
        mix(p,1.545,1.835);

      const cloud=
        mix(p,1.565,1.930);

      const m=this.matter.material.uniforms;

      this.matter.visible=
        birth>.001;

      this.matter.renderOrder=18;

      m.uBirth.value=birth;
      m.uCloud.value=cloud;
      m.uPrism.value=0;
      m.uCover.value=0;
      m.uFlow.value=(p-1.535)*10.5;
      m.uCoverCenter.value.set(0,0);
      m.uAlpha.value=1;
    }

    const shellGone=
      mix(p,1.80,1.94);

    this.appTour.visible=
      shellGone<.999;

    if(p>1.925){
      this.appTour.visible=false;

      if(this.appBackdrop){
        this.appBackdrop.visible=false;
      }

      targets.forEach(
        t=>opacity(t,1)
      );
    }

    // The opaque environment does not cut.
    // It loses density into the same matter field.
    if(this.bg?.material?.uniforms?.uAlpha){
      this.bg.visible=true;

      this.bg.material.uniforms
        .uAlpha.value=
          1-mix(p,1.56,1.82);

      this.bg.scale.setScalar(
        lerp(
          1,
          1.14,
          mix(p,1.56,1.82)
        )
      );
    }

    if(
      this.cloud?.material?.uniforms?.uAlpha
    ){
      this.cloud.material.uniforms
        .uAlpha.value=0;
    }

    opacity(this.targetWord,0);
  }

  _renderDeskTransition(p,portrait){
    // r16 still evaluates its gallery for p > .955.
    // Once the closing page has finished, none of that legacy TGBC surface
    // is allowed to reappear behind the cloud/prism.
    if(p>=1.935){
      if(this.appTour)this.appTour.visible=false;
      if(this.appBackdrop)this.appBackdrop.visible=false;

      if(this.bg?.material?.uniforms?.uAlpha){
        this.bg.material.uniforms.uAlpha.value=0;
        this.bg.visible=false;
      }

      if(this.cloud?.material?.uniforms?.uAlpha){
        this.cloud.material.uniforms.uAlpha.value=0;
        this.cloud.visible=false;
      }

      if(this.markFragments?.material?.uniforms?.uAlpha){
        this.markFragments.material.uniforms.uAlpha.value=0;
        this.markFragments.visible=false;
      }

      if(this.wordFragments?.material?.uniforms?.uAlpha){
        this.wordFragments.material.uniforms.uAlpha.value=0;
        this.wordFragments.visible=false;
      }

      opacity(this.targetWordLight,0);
      opacity(this.targetWord,0);
      opacity(this.lead,0);
      opacity(this.scrollCue,0);
    }

    // TGBC favicon is the only survivor from the previous world.
    // Keep it at the canonical hero center while it becomes TGDesk.
    const rawHalf=Math.max(
      .001,
      this.targetMark?.userData?.halfWidth||1
    );
    this.targetMark.position.set(0,0,0);
    this.targetMark.scale.setScalar(1/rawHalf);
    this.targetMark.quaternion.identity();

    // The cloud first surges toward camera and physically covers the logo.
    // It then retreats behind the identity and only then hardens into the prism.
    const coverIn=
      mix(p,1.935,2.055);

    const coverOut=
      mix(p,2.075,2.205);

    const cover=
      coverIn*(1-coverOut);

    const prism=
      mix(p,2.175,2.465);

    if(this.matter?.material?.uniforms){
      const m=this.matter.material.uniforms;

      this.matter.visible=true;
      this.matter.renderOrder=
        cover>.025?60:-2;

      m.uBirth.value=1;
      m.uCloud.value=1;
      m.uCover.value=cover;
      m.uPrism.value=prism;
      m.uFlow.value=(p-1.535)*10.5;
      m.uCoverCenter.value.set(
        portrait?0:.72,
        portrait?.08:.03
      );
      m.uAlpha.value=1;
    }

    // TGBC itself becomes TGDesk underneath that moving particle veil.
    const breakFav=
      mix(p,1.970,2.085);

    const morph=
      mix(p,2.025,2.205);

    const particleA=
      mix(p,1.965,2.030)*
      (1-mix(p,2.175,2.245));

    opacity(
      this.targetMark,
      1-breakFav
    );

    setMorph(
      this.deskMorph,
      morph,
      particleA
    );

    const favIn=
      mix(p,2.115,2.255);

    const wordIn=
      mix(p,2.245,2.405);

    const sloganIn=
      mix(p,2.275,2.430);

    const lineIn=
      mix(p,2.325,2.455);

    const settle=
      mix(p,2.180,2.470);

    const markX=portrait?0:1.12;
    const markY=portrait?.28:.06;
    const markScale=portrait?.80:.92;

    this.deskMark3D.position.set(
      markX+
        Math.sin((p-1.92)*7.3)*
        .035*
        (1-settle),
      markY+
        Math.cos((p-1.92)*6.1)*
        .026*
        (1-settle),
      lerp(.06,.34,favIn)
    );

    this.deskMark3D.scale.setScalar(
      lerp(
        markScale*.73,
        markScale,
        favIn
      )+
      Math.sin(favIn*Math.PI)*
      .045
    );

    this.deskMark3D.rotation.set(
      lerp(.085,0,settle),
      lerp(-.120,0,settle),
      lerp(.105,0,settle)+
        Math.sin((p-1.90)*5.4)*
        .018*
        (1-settle)
    );

    opacity(
      this.deskMark3D,
      favIn
    );

    if(this.deskWord){
      this.deskWord.visible=
        wordIn>.001;

      this.deskWord.material.uniforms
        .uAlpha.value=wordIn;

      this.deskWord.material.uniforms
        .uReveal.value=
          mix(p,2.245,2.405);

      if(portrait){
        this.deskWord.position.set(
          0,
          -1.18+
            Math.sin((p-2.22)*4.8)*
            .025*
            (1-settle),
          lerp(-.26,.36,wordIn)
        );

        this.deskWord.scale
          .setScalar(
            .86*
            lerp(.94,1,wordIn)
          );
      }else{
        // Derived from the real favicon half-width + exact wordmark width:
        // there is now an intentional gap, so "TGDesk" is always complete.
        this.deskWord.position.set(
          3.68+
            Math.sin((p-2.22)*4.6)*
            .030*
            (1-settle),
          .06,
          lerp(-.26,.36,wordIn)
        );

        this.deskWord.scale
          .setScalar(
            .88*
            lerp(.94,1,wordIn)
          );
      }

      if(wordIn>.995){
        this.deskWord.material.uniforms
          .uReveal.value=1;
      }
    }

    this.deskSlogan.visible=
      sloganIn>.001;

    this.deskSlogan.material.uniforms
      .uAlpha.value=sloganIn;

    this.deskSlogan.material.uniforms
      .uReveal.value=
        mix(p,2.275,2.430);

    if(portrait){
      this.deskSlogan.position.set(
        0,
        2.35,
        .33
      );

      this.deskSlogan.scale
        .setScalar(.68);
    }else{
      this.deskSlogan.position.set(
        -2.55+
          Math.sin((p-2.24)*3.8)*
          .028*
          (1-settle),
        .18,
        lerp(-.22,.33,sloganIn)
      );

      this.deskSlogan.scale
        .setScalar(.74);
    }

    this.deskLine.visible=
      lineIn>.001;

    this.deskLine.material.opacity=
      lineIn;

    if(portrait){
      this.deskLine.position.set(
        0,
        1.82,
        .31
      );

      this.deskLine.scale.set(
        lineIn*.73,
        1,
        1
      );
    }else{
      this.deskLine.position.set(
        -2.55,
        -.34,
        lerp(-.12,.31,lineIn)
      );

      this.deskLine.scale.set(
        lineIn*.82,
        1,
        1
      );
    }

    if(this.deskFav)this.deskFav.visible=false;

    if(p>2.255){
      opacity(this.targetMark,0);
    }
  }

  render(state){
    this._snapshot();
    this._restore();

    super.render(state);

    const p=state.p||0;
    const portrait=!!state.portrait;

    this._snapshot();
    this._buildR20(portrait,p);

    // Every r20 object is reset before the current scroll frame is evaluated.
    // This is what keeps reverse scrolling perfectly deterministic.
    this.apiCycle.visible=false;
    this.galleryMorphs.forEach(m=>setMorph(m,0,0));
    this.closeMorphs.forEach(m=>setMorph(m,0,0));
    if(this.matter)this.matter.visible=false;
    if(this.deskMorph)setMorph(this.deskMorph,0,0);
    if(this.deskFav)this.deskFav.visible=false;
    opacity(this.deskMark3D,0);
    if(this.deskWord)this.deskWord.visible=false;
    this.deskSlogan.visible=false;
    this.deskLine.visible=false;

    // Opening:
    // line = fiscal/API path;
    // modules are born only when the path reaches them.
    if(p<.470){
      this._renderApiCycle(p);
    }else{
      this.apiCycle.visible=false;
    }

    // Same shell, same world, actual matter moves between module screens.
    if(p>=.955 && p<=1.535){
      this._renderGallery(p);
    }

    // The page physically becomes the TGBC mark in clock order.
    if(p>1.535 && p<=1.940){
      this._renderClosing(p);
    }

    // Page matter -> centered cloud -> prism.
    // TGBC favicon -> TGDesk.
    if(p>1.900){
      this._renderDeskTransition(
        p,
        portrait
      );
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}
