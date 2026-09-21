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
  sampleTextureAlpha,
  revealPlane,
  sloganTexture,
  gradientLine
} from './r20/identity.js';
import {
  createApiCycle,
  createMatterMorph
} from './r20/matter.js';

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
    this._deskFavTexture=null;

    const loader=new THREE.TextureLoader();

    loader.load(
      './tgdesk-favicon-r1.webp',
      source=>{
        const tex=edgeKeyTexture(source.image);

        this._deskFavTexture=tex;

        this.deskFav=revealPlane(
          tex,
          683/644,
          2.08
        );

        this.scene.add(this.deskFav);
        this.deskFav.visible=false;

        this._r20BuildKey='';
        window.dispatchEvent(
          new Event('tgworldready')
        );
      }
    );

    loader.load(
      './tgdesk-wordmark-r1.webp',
      source=>{
        const tex=edgeKeyTexture(source.image);

        this.deskWord=revealPlane(
          tex,
          898/190,
          .62
        );

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
      '|'+
      (this._deskFavTexture?1:0);

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

    if(this._deskFavTexture){
      const count=portrait?1800:3200;

      const favX=portrait?0:1.42;
      const favY=portrait?.30:.08;
      const targetH=portrait?1.78:2.08;

      this.deskMorph=createMorph(
        sampleWorldRoots(
          [this.targetMark],
          count
        ),
        sampleTextureAlpha(
          this._deskFavTexture,
          count,
          targetH,
          favX,
          favY,
          .32
        ),
        count,
        .012
      );

      this.deskMorph.visible=false;
      this.scene.add(this.deskMorph);
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

    // Interface debris becomes the centered two-pattern cloud.
    if(this.matter?.material?.uniforms){
      const cloud=
        mix(p,1.585,1.925);

      this.matter.visible=
        cloud>.001;

      this.matter.material.uniforms
        .uCloud.value=cloud;

      this.matter.material.uniforms
        .uPrism.value=0;

      this.matter.material.uniforms
        .uAlpha.value=
          mix(p,1.570,1.640);
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
    const prism=
      mix(p,1.925,2.185);

    if(this.matter?.material?.uniforms){
      this.matter.visible=true;

      this.matter.material.uniforms
        .uCloud.value=1;

      this.matter.material.uniforms
        .uPrism.value=prism;

      this.matter.material.uniforms
        .uAlpha.value=1;
    }

    // TGBC itself becomes TGDesk while the cloud becomes the prism.
    const breakFav=
      mix(p,1.955,2.045);

    const morph=
      mix(p,2.015,2.175);

    const particleA=
      mix(p,1.965,2.015)*
      (1-mix(p,2.145,2.215));

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
      mix(p,2.135,2.225);

    const wordIn=
      mix(p,2.205,2.345);

    const sloganIn=
      mix(p,2.235,2.395);

    const lineIn=
      mix(p,2.290,2.410);

    if(this.deskFav){
      this.deskFav.visible=
        favIn>.001;

      this.deskFav.material.uniforms
        .uAlpha.value=favIn;

      this.deskFav.material.uniforms
        .uReveal.value=
          mix(p,2.145,2.235);

      this.deskFav.position.set(
        portrait?0:1.42,
        portrait?.30:.08,
        .34
      );

      this.deskFav.scale.setScalar(1);
    }

    if(this.deskWord){
      this.deskWord.visible=
        wordIn>.001;

      this.deskWord.material.uniforms
        .uAlpha.value=wordIn;

      this.deskWord.material.uniforms
        .uReveal.value=
          mix(p,2.205,2.345);

      if(portrait){
        this.deskWord.position.set(
          0,
          -1.18,
          .34
        );

        this.deskWord.scale
          .setScalar(.86);
      }else{
        this.deskWord.position.set(
          3.52,
          .08,
          .34
        );

        this.deskWord.scale
          .setScalar(.88);
      }
    }

    this.deskSlogan.visible=
      sloganIn>.001;

    this.deskSlogan.material.uniforms
      .uAlpha.value=sloganIn;

    this.deskSlogan.material.uniforms
      .uReveal.value=
        mix(p,2.235,2.395);

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
        -2.55,
        .22,
        .33
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
        -.32,
        .31
      );

      this.deskLine.scale.set(
        lineIn*.82,
        1,
        1
      );
    }

    if(p>2.235){
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
