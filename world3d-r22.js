import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r21.js';
import {
  clamp,
  mix,
  lerp,
  opacity,
  sampleWorldRoots
} from './r20/motion.js';
import { edgeKeyTexture } from './r20/identity.js';
import { setContinuity } from './r21/continuity.js';
import {
  createTGDeskSystemR22,
  updateTGDeskSystemR22,
  setTGDeskSystemOpacity,
  createPremiumWordmarkR22,
  updatePremiumWordmarkR22
} from './r22/tgdesk-system.js';

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.deskSystemR22=
      createTGDeskSystemR22();

    this.deskSystemR22.userData.roles=[
      'dados',
      'dispositivos',
      'supervisores'
    ];

    this.scene.add(
      this.deskSystemR22
    );

    setTGDeskSystemOpacity(
      this.deskSystemR22,
      0
    );

    this.deskWordR22=null;
    this._r22DeskTargetKey='';

    const loader=
      new THREE.TextureLoader();

    loader.load(
      './tgdesk-wordmark-r1.webp',
      source=>{
        const tex=
          edgeKeyTexture(
            source.image
          );

        this.deskWordR22=
          createPremiumWordmarkR22(
            tex
          );

        this.scene.add(
          this.deskWordR22
        );

        updatePremiumWordmarkR22(
          this.deskWordR22,
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
      this._r22DeskTargetKey='';
    }
  }

  _buildR20(portrait,p){
    super._buildR20(
      portrait,
      p
    );

    if(
      !this.continuity ||
      !this.deskSystemR22 ||
      p<1.40
    )return;

    const key=
      this._sizeKey+
      '|desk-target-r22';

    if(this._r22DeskTargetKey===key){
      return;
    }

    this._r22DeskTargetKey=key;

    const attr=
      this.continuity.geometry
        .getAttribute('position');

    const count=
      attr?.count||0;

    if(!count)return;

    const root=
      this.deskSystemR22;

    const snap={
      position:root.position.clone(),
      scale:root.scale.clone(),
      quaternion:root.quaternion.clone(),
      visible:root.visible
    };

    root.position.set(
      0,
      portrait?.20:0,
      .10
    );

    root.scale.setScalar(
      portrait?.82:.92
    );

    root.quaternion.identity();
    root.visible=true;
    root.updateMatrixWorld(true);

    const desk=
      sampleWorldRoots(
        [root],
        count
      );

    this.continuity.geometry
      .setAttribute(
        'aDesk',
        new THREE.BufferAttribute(
          desk,
          3
        )
      );

    this.continuity.geometry
      .getAttribute('aDesk')
      .needsUpdate=true;

    root.position.copy(
      snap.position
    );

    root.scale.copy(
      snap.scale
    );

    root.quaternion.copy(
      snap.quaternion
    );

    root.visible=
      snap.visible;
  }

  _renderClosing(p){
    super._renderClosing(p);

    if(!this.continuity)return;

    const progress=
      mix(
        p,
        1.535,
        1.945
      );

    // Fix frame continuity:
    // the original TGBC world does NOT disappear before the particle world is mature.
    // Both states overlap, with brightness conserved through the hand-off.
    const fieldA=
      mix(
        progress,
        .015,
        .22
      );

    const fieldBuild=
      mix(
        progress,
        .00,
        .74
      );

    setContinuity(
      this.continuity,
      {
        build:fieldBuild,
        pattern:
          mix(
            progress,
            .10,
            .94
          )*.76,
        desk:0,
        prism:0,
        veil:0,
        flow:
          progress*4.25,
        alpha:fieldA,
        foreground:false
      }
    );

    if(
      this.bg?.material?.uniforms?.uAlpha
    ){
      const oldWorld=
        1-
        mix(
          progress,
          .50,
          .96
        );

      this.bg.material.uniforms
        .uAlpha.value=
          oldWorld;

      this.bg.visible=
        oldWorld>.001;
    }

    // TGBC stays readable as the invariant center while its own interface
    // is converted into the particle population around it.
    const rawHalf=
      Math.max(
        .001,
        this.targetMark?.userData?.halfWidth||1
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
        .055,
        .23
      )*.30;

    const resolved=
      mix(
        progress,
        .43,
        .80
      );

    opacity(
      this.targetMark,
      Math.max(
        guide,
        resolved
      )
    );

    setTGDeskSystemOpacity(
      this.deskSystemR22,
      0
    );

    if(this.deskWordR22){
      updatePremiumWordmarkR22(
        this.deskWordR22,
        {alpha:0}
      );
    }
  }

  _renderDeskTransition(p,portrait){
    super._renderDeskTransition(
      p,
      portrait
    );

    // The r21 geometry and its experimental wordmark are now only transition
    // scaffolding. The resolved TGDesk identity is exclusively the r22 system.
    opacity(
      this.deskMark3D,
      0
    );

    if(this.deskWordR21){
      this.deskWordR21.visible=false;
    }

    if(this.deskWord){
      this.deskWord.visible=false;
    }

    // Keep the outgoing background alive until the particle field is fully present.
    // This removes the "background vanishes, then reappears" frame discontinuity.
    if(
      this.bg?.material?.uniforms?.uAlpha
    ){
      const bgA=
        1-
        mix(
          p,
          1.955,
          2.105
        );

      this.bg.material.uniforms
        .uAlpha.value=
          bgA;

      this.bg.visible=
        bgA>.001;
    }

    const favIn=
      mix(
        p,
        2.175,
        2.335
      );

    const motion=
      mix(
        p,
        2.235,
        2.455
      );

    const markScale=
      portrait
      ? .82
      : .92;

    const flow=
      Math.max(
        0,
        (p-2.145)*8.20
      );

    // The three technical actors have their own speeds, but all obey the
    // established triangular route. Their old trail is data being absorbed by
    // the central TGDesk system.
    const phase=
      Math.max(
        0,
        (p-2.235)*.92
      );

    this.deskSystemR22.position.set(
      0,
      portrait?.20:0,
      lerp(
        -.12,
        .32,
        favIn
      )
    );

    this.deskSystemR22.scale.setScalar(
      lerp(
        markScale*.95,
        markScale,
        favIn
      )
    );

    this.deskSystemR22.rotation.set(
      lerp(
        .030,
        0,
        favIn
      ),
      lerp(
        -.035,
        0,
        favIn
      ),
      0
    );

    updateTGDeskSystemR22(
      this.deskSystemR22,
      {
        alpha:favIn,
        flow,
        motion,
        phase
      }
    );

    // Exact face + layered depth. This avoids the low-resolution / edge-shader
    // look of r21 while preserving the official proportions of TGDesk.
    const wordIn=
      mix(
        p,
        2.285,
        2.455
      );

    if(this.deskWordR22){
      const wordScale=
        portrait
        ? .86
        : .92;

      const halfMark=
        (this.deskSystemR22.userData.halfWidth||1.08)*
        markScale;

      const wordW=
        this.deskWordR22.userData.width*
        wordScale;

      if(portrait){
        this.deskWordR22.position.set(
          0,
          -1.18,
          .34
        );

        this.deskWordR22.scale.setScalar(
          wordScale
        );
      }else{
        const gap=.29;

        this.deskWordR22.position.set(
          halfMark+
          gap+
          wordW*.5,
          0,
          .34
        );

        this.deskWordR22.scale.setScalar(
          wordScale
        );
      }

      updatePremiumWordmarkR22(
        this.deskWordR22,
        {
          alpha:wordIn,
          sweep:
            mix(
              p,
              2.315,
              2.515
            )
        }
      );
    }

    // Preserve the composition already approved in r21:
    // slogan left, identity center/right, moving technical system as the semantic core.
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

    if(this.deskSlogan){
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
    }

    if(this.deskLine){
      this.deskLine.visible=
        lineIn>.001;

      this.deskLine.material.opacity=
        lineIn;
    }
  }

  render(state){
    if(this.deskSystemR22){
      setTGDeskSystemOpacity(
        this.deskSystemR22,
        0
      );
    }

    if(this.deskWordR22){
      updatePremiumWordmarkR22(
        this.deskWordR22,
        {alpha:0}
      );
    }

    super.render(state);
  }
}
