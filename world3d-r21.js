import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r20.js';
import {
  clamp,
  mix,
  lerp,
  opacity,
  copyTransform,
  restoreTransform,
  sampleWorldRoots,
  setMorph
} from './r20/motion.js';
import { edgeKeyTexture } from './r20/identity.js';
import {
  createContinuityField,
  setContinuity
} from './r21/continuity.js';
import {
  createDeskWordmark,
  setDeskWordmark
} from './r21/wordmark.js';

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.continuity=null;
    this._continuityKey='';

    this.deskWordR21=null;

    const loader=
      new THREE.TextureLoader();

    loader.load(
      './tgdesk-wordmark-r1.webp',
      source=>{
        const tex=
          edgeKeyTexture(
            source.image
          );

        this.deskWordR21=
          createDeskWordmark(
            tex
          );

        this.scene.add(
          this.deskWordR21
        );

        setDeskWordmark(
          this.deskWordR21,
          {alpha:0}
        );

        window.dispatchEvent(
          new Event('tgworldready')
        );
      }
    );
  }

  resize(w,h,portrait){
    const old=
      this._sizeKey;

    super.resize(
      w,
      h,
      portrait
    );

    if(old!==this._sizeKey){
      this._continuityKey='';
    }
  }

  _buildR20(portrait,p){
    super._buildR20(
      portrait,
      p
    );

    if(
      !this.appTour ||
      !this.targetMark ||
      !this.deskMark3D ||
      p<1.40
    )return;

    const key=
      this._sizeKey+
      '|continuity-r21';

    if(this._continuityKey===key){
      return;
    }

    this._continuityKey=key;

    if(this.continuity){
      this.scene.remove(
        this.continuity
      );
      this.continuity=null;
    }

    const u=
      this.appTour.userData;

    const roots=[
      u.shell,
      u.headerDetails,
      u.sidebarTitle,
      u.cargos,
      u.subheader,
      u.tiersScreen,
      this.targetWordLight,
      ...u.navMeshes.map(
        n=>n.holder
      )
    ].filter(Boolean);

    const count=
      portrait
      ? 11000
      : 19000;

    const source=
      sampleWorldRoots(
        roots,
        count
      );

    const markSnapshot={
      position:this.targetMark.position.clone(),
      scale:this.targetMark.scale.clone(),
      quaternion:this.targetMark.quaternion.clone(),
      visible:this.targetMark.visible
    };

    const rawHalf=
      Math.max(
        .001,
        this.targetMark.userData.halfWidth||1
      );

    this.targetMark.position.set(
      0,
      0,
      .02
    );

    this.targetMark.scale.setScalar(
      1/rawHalf
    );

    this.targetMark.quaternion.identity();
    this.targetMark.visible=true;
    this.targetMark.updateMatrixWorld(true);

    const tgbc=
      sampleWorldRoots(
        [this.targetMark],
        count
      );

    const deskSnapshot={
      position:this.deskMark3D.position.clone(),
      scale:this.deskMark3D.scale.clone(),
      quaternion:this.deskMark3D.quaternion.clone(),
      visible:this.deskMark3D.visible
    };

    this.deskMark3D.position.set(
      0,
      0,
      .10
    );

    this.deskMark3D.scale.setScalar(
      portrait
      ? .82
      : .92
    );

    this.deskMark3D.quaternion.identity();
    this.deskMark3D.visible=true;
    this.deskMark3D.updateMatrixWorld(true);

    const desk=
      sampleWorldRoots(
        [this.deskMark3D],
        count
      );

    this.continuity=
      createContinuityField({
        source,
        tgbc,
        desk,
        count,
        logoFraction:
          portrait
          ? .38
          : .34
      });

    this.scene.add(
      this.continuity
    );

    this.targetMark.position.copy(
      markSnapshot.position
    );
    this.targetMark.scale.copy(
      markSnapshot.scale
    );
    this.targetMark.quaternion.copy(
      markSnapshot.quaternion
    );
    this.targetMark.visible=
      markSnapshot.visible;

    this.deskMark3D.position.copy(
      deskSnapshot.position
    );
    this.deskMark3D.scale.copy(
      deskSnapshot.scale
    );
    this.deskMark3D.quaternion.copy(
      deskSnapshot.quaternion
    );
    this.deskMark3D.visible=
      deskSnapshot.visible;

    // r20 systems stay available for the earlier module gallery,
    // but from the final TGBC page onward there is only ONE particle population.
    if(this.matter){
      this.matter.visible=false;
    }

    this.closeMorphs.forEach(
      m=>setMorph(m,0,0)
    );

    if(this.deskMorph){
      setMorph(
        this.deskMorph,
        0,
        0
      );
    }
  }

  _renderClosing(p){
    if(!this.continuity){
      super._renderClosing(p);
      return;
    }

    if(this.matter){
      this.matter.visible=false;
    }

    this.closeMorphs.forEach(
      m=>setMorph(m,0,0)
    );

    if(this.deskMorph){
      setMorph(
        this.deskMorph,
        0,
        0
      );
    }

    const u=
      this.appTour.userData;

    const groups=
      this._closingSources();

    const progress=
      mix(
        p,
        1.535,
        1.945
      );

    // The favicon never jumps in after the page. It is already the stable
    // destination at the center while the interface is still visibly dissolving.
    const rawHalf=
      Math.max(
        .001,
        this.targetMark.userData.halfWidth||1
      );

    this.targetMark.position.set(
      0,
      0,
      .05
    );

    this.targetMark.scale.setScalar(
      1/rawHalf
    );

    this.targetMark.quaternion.identity();

    const guide=
      mix(
        progress,
        .08,
        .30
      )*.26;

    const resolve=
      mix(
        progress,
        .52,
        .92
      );

    opacity(
      this.targetMark,
      Math.max(
        guide,
        resolve
      )
    );

    // Interface regions do not vanish globally.
    // They release in sequence while particles leave those exact surfaces.
    groups.forEach(
      (group,i)=>{
        const start=
          .03+i*.055;

        const end=
          start+.32;

        const a=
          1-
          mix(
            progress,
            start,
            end
          );

        group.forEach(
          o=>opacity(o,a)
        );
      }
    );

    const appA=
      1-
      mix(
        progress,
        .62,
        .98
      );

    this.appTour.visible=
      appA>.001;

    if(this.appBackdrop){
      this.appBackdrop.visible=
        appA>.001;

      this.appBackdrop.material.opacity=
        appA;
    }

    // The same interface particles simultaneously do two jobs:
    // a subset holds the TGBC favicon, the rest develops a background pattern.
    // There is no independent "cloud" object anymore.
    setContinuity(
      this.continuity,
      {
        build:progress,
        pattern:
          mix(
            progress,
            .12,
            .96
          )*.74,
        desk:0,
        prism:0,
        veil:0,
        flow:
          progress*3.55,
        alpha:
          mix(
            progress,
            .015,
            .13
          ),
        foreground:false
      }
    );

    // The old opaque product world loses density into the SAME population.
    if(
      this.bg?.material?.uniforms?.uAlpha
    ){
      const bgA=
        1-
        mix(
          progress,
          .10,
          .68
        );

      this.bg.material.uniforms
        .uAlpha.value=
          bgA;

      this.bg.visible=
        bgA>.001;
    }

    if(
      this.cloud?.material?.uniforms?.uAlpha
    ){
      this.cloud.material.uniforms
        .uAlpha.value=0;

      this.cloud.visible=false;
    }

    opacity(
      this.targetWord,
      0
    );

    opacity(
      this.targetWordLight,
      1-progress
    );

    if(progress>.985){
      this.appTour.visible=false;

      if(this.appBackdrop){
        this.appBackdrop.visible=false;
      }
    }
  }

  _renderDeskTransition(p,portrait){
    if(!this.continuity){
      super._renderDeskTransition(
        p,
        portrait
      );
      return;
    }

    // Kill all legacy surfaces. From this point the visible universe is:
    // unified particle field + TGBC/TGDesk resolved identities.
    if(this.appTour){
      this.appTour.visible=false;
    }

    if(this.appBackdrop){
      this.appBackdrop.visible=false;
    }

    if(this.bg?.material?.uniforms?.uAlpha){
      this.bg.material.uniforms
        .uAlpha.value=0;

      this.bg.visible=false;
    }

    if(this.cloud?.material?.uniforms?.uAlpha){
      this.cloud.material.uniforms
        .uAlpha.value=0;

      this.cloud.visible=false;
    }

    if(this.matter){
      this.matter.visible=false;
    }

    this.closeMorphs.forEach(
      m=>setMorph(m,0,0)
    );

    if(this.deskMorph){
      setMorph(
        this.deskMorph,
        0,
        0
      );
    }

    if(this.deskWord){
      this.deskWord.visible=false;
    }

    const deskT=
      mix(
        p,
        1.985,
        2.255
      );

    const patternT=
      lerp(
        .74,
        2.0,
        mix(
          p,
          1.920,
          2.300
        )
      );

    const veilIn=
      mix(
        p,
        2.005,
        2.115
      );

    const veilOut=
      mix(
        p,
        2.125,
        2.275
      );

    const veil=
      veilIn*
      (1-veilOut);

    const prism=
      mix(
        p,
        2.305,
        2.625
      );

    setContinuity(
      this.continuity,
      {
        build:1,
        pattern:patternT,
        desk:deskT,
        prism,
        veil,
        flow:
          3.55+
          (p-1.90)*4.10,
        alpha:1,
        foreground:
          veil>.025
      }
    );

    // TGBC remains a precise solid anchor until its PARTICLE silhouette
    // is already on the way to TGDesk.
    const oldOut=
      mix(
        p,
        2.000,
        2.145
      );

    opacity(
      this.targetMark,
      1-oldOut
    );

    const favIn=
      mix(
        p,
        2.205,
        2.345
      );

    const markScale=
      portrait
      ? .82
      : .92;

    this.deskMark3D.position.set(
      0,
      portrait?.22:0,
      lerp(
        -.18,
        .32,
        favIn
      )
    );

    this.deskMark3D.scale.setScalar(
      lerp(
        markScale*.95,
        markScale,
        favIn
      )
    );

    this.deskMark3D.rotation.set(
      lerp(
        .035,
        0,
        favIn
      ),
      lerp(
        -.045,
        0,
        favIn
      ),
      0
    );

    opacity(
      this.deskMark3D,
      favIn
    );

    // Precision wordmark treatment:
    // exact official face, optical bevel, subtle depth, complete final reveal.
    const wordIn=
      mix(
        p,
        2.285,
        2.455
      );

    if(this.deskWordR21){
      const halfMark=
        (this.deskMark3D.userData.halfWidth||1.08)*
        markScale;

      const wordW=
        this.deskWordR21.userData.width;

      if(portrait){
        this.deskWordR21.position.set(
          0,
          -1.16,
          .34
        );

        this.deskWordR21.scale.setScalar(
          .86
        );
      }else{
        const gap=.285;

        this.deskWordR21.position.set(
          halfMark+
          gap+
          wordW*.5,
          0,
          .34
        );

        this.deskWordR21.scale.setScalar(
          .92
        );
      }

      setDeskWordmark(
        this.deskWordR21,
        {
          alpha:wordIn,
          reveal:
            wordIn>.995
            ? 1
            : mix(
                p,
                2.285,
                2.445
              ),
          sweep:
            mix(
              p,
              2.315,
              2.490
            )
        }
      );
    }

    const sloganIn=
      mix(
        p,
        2.315,
        2.475
      );

    const lineIn=
      mix(
        p,
        2.365,
        2.505
      );

    this.deskSlogan.visible=
      sloganIn>.001;

    this.deskSlogan.material.uniforms
      .uAlpha.value=
        sloganIn;

    this.deskSlogan.material.uniforms
      .uReveal.value=
        sloganIn>.995
        ? 1
        : sloganIn;

    this.deskLine.visible=
      lineIn>.001;

    this.deskLine.material.opacity=
      lineIn;

    if(portrait){
      this.deskSlogan.position.set(
        0,
        2.45,
        .31
      );

      this.deskSlogan.scale.setScalar(
        .68
      );

      this.deskLine.position.set(
        0,
        1.88,
        .30
      );

      this.deskLine.scale.set(
        lineIn*.73,
        1,
        1
      );
    }else{
      // Recover the deliberate balance of the opening TGDevs composition:
      // message on the left, exact identity on the right of the central favicon.
      this.deskSlogan.position.set(
        -3.18,
        .20,
        .31
      );

      this.deskSlogan.scale.setScalar(
        .72
      );

      this.deskLine.position.set(
        -3.18,
        -.34,
        .30
      );

      this.deskLine.scale.set(
        lineIn*.82,
        1,
        1
      );
    }

    if(p>2.350){
      opacity(
        this.targetMark,
        0
      );
    }
  }

  render(state){
    // Reverse scroll must never leave a future particle state alive.
    if(this.continuity){
      this.continuity.visible=false;
    }

    if(this.deskWordR21){
      setDeskWordmark(
        this.deskWordR21,
        {alpha:0}
      );
    }

    super.render(state);
  }
}
