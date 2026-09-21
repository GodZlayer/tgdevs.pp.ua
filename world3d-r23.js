import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r22.js';
import {
  clamp,
  mix,
  lerp,
  opacity,
  sampleWorldRoots
} from './r20/motion.js';
import {
  createSurfaceParticlePhase,
  setSurfaceParticlePhase,
  staggeredResolve,
  resolveTGDeskSolid
} from './r23/surface-phase.js';
import {
  updateTGDeskSystemR22
} from './r24/tgdesk-system.js';

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.tgbcSurfaceR23=null;
    this.deskSurfaceR23=null;
    this._r23SurfaceKey='';
  }

  resize(w,h,portrait){
    const old=this._sizeKey;

    super.resize(
      w,
      h,
      portrait
    );

    if(old!==this._sizeKey){
      this._r23SurfaceKey='';
    }
  }

  _buildR20(portrait,p){
    super._buildR20(
      portrait,
      p
    );

    if(
      !this.targetMark ||
      !this.deskSystemR22 ||
      p<1.40
    )return;

    const key=
      this._sizeKey+
      '|surface-r23';

    if(this._r23SurfaceKey===key){
      return;
    }

    this._r23SurfaceKey=key;

    if(this.tgbcSurfaceR23){
      this.scene.remove(
        this.tgbcSurfaceR23
      );
      this.tgbcSurfaceR23=null;
    }

    if(this.deskSurfaceR23){
      this.scene.remove(
        this.deskSurfaceR23
      );
      this.deskSurfaceR23=null;
    }

    const count=
      portrait
      ? 4300
      : 6800;

    // --- TGBC exact resolved surface ---
    const markSnap={
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
      .05
    );

    this.targetMark.scale.setScalar(
      1/rawHalf
    );

    this.targetMark.quaternion.identity();
    this.targetMark.visible=true;
    this.targetMark.updateMatrixWorld(true);

    const tgbcSurface=
      sampleWorldRoots(
        [this.targetMark],
        count
      );

    this.tgbcSurfaceR23=
      createSurfaceParticlePhase(
        tgbcSurface,
        count
      );

    this.scene.add(
      this.tgbcSurfaceR23
    );

    this.targetMark.position.copy(
      markSnap.position
    );

    this.targetMark.scale.copy(
      markSnap.scale
    );

    this.targetMark.quaternion.copy(
      markSnap.quaternion
    );

    this.targetMark.visible=
      markSnap.visible;

    // --- TGDesk exact resolved surface ---
    const desk=
      this.deskSystemR22;

    const deskSnap={
      position:desk.position.clone(),
      scale:desk.scale.clone(),
      quaternion:desk.quaternion.clone(),
      visible:desk.visible
    };

    desk.position.set(
      0,
      portrait?.20:0,
      .32
    );

    desk.scale.setScalar(
      portrait?.82:.92
    );

    desk.quaternion.identity();
    desk.visible=true;
    desk.updateMatrixWorld(true);

    const {
      core,
      nodes,
      guide
    }=desk.userData;

    const deskSurface=
      sampleWorldRoots(
        [
          core,
          ...nodes,
          guide
        ],
        count
      );

    this.deskSurfaceR23=
      createSurfaceParticlePhase(
        deskSurface,
        count
      );

    this.scene.add(
      this.deskSurfaceR23
    );

    desk.position.copy(
      deskSnap.position
    );

    desk.scale.copy(
      deskSnap.scale
    );

    desk.quaternion.copy(
      deskSnap.quaternion
    );

    desk.visible=
      deskSnap.visible;
  }

  _renderClosing(p){
    super._renderClosing(p);

    if(!this.tgbcSurfaceR23)return;

    const progress=
      mix(
        p,
        1.535,
        1.945
      );

    // Particles are already on the route before the solid exists.
    // They tighten onto the exact favicon surface and only then become material.
    const resolve=
      mix(
        progress,
        .23,
        .82
      );

    const particleAlpha=
      mix(
        progress,
        .06,
        .24
      )*
      (
        1-
        mix(
          progress,
          .80,
          .985
        )
      );

    setSurfaceParticlePhase(
      this.tgbcSurfaceR23,
      {
        phase:1-resolve,
        alpha:particleAlpha,
        flow:progress*5.20,
        pointScale:1.0,
        foreground:true
      }
    );

    // The solid does not fade in globally.
    // Its physical groups resolve progressively under the particle skin.
    this.targetMark.visible=
      resolve>.001;

    staggeredResolve(
      this.targetMark,
      resolve,
      opacity
    );

    // Avoid a double silhouette: the generic continuity particles relinquish
    // the logo while the exact surface particles perform the materialization.
    if(
      this.continuity?.material?.uniforms?.uLogoAlpha
    ){
      this.continuity.material.uniforms
        .uLogoAlpha.value=
          clamp(
            .42*
            (1-resolve)
          );
    }
  }

  _renderDeskTransition(p,portrait){
    super._renderDeskTransition(
      p,
      portrait
    );

    if(
      !this.tgbcSurfaceR23 ||
      !this.deskSurfaceR23
    )return;

    // -----------------------------
    // TGBC solid -> TGBC particles
    // -----------------------------
    const particleize=
      mix(
        p,
        1.955,
        2.125
      );

    const tgbcBridge=
      Math.sin(
        clamp(particleize)*
        Math.PI
      );

    this.targetMark.visible=
      particleize<.999;

    staggeredResolve(
      this.targetMark,
      1-particleize,
      opacity
    );

    setSurfaceParticlePhase(
      this.tgbcSurfaceR23,
      {
        phase:particleize,
        alpha:tgbcBridge,
        flow:
          5.2+
          particleize*3.8,
        pointScale:1.0,
        foreground:true
      }
    );

    // The generic logo population takes over only after it has inherited
    // the exact TGBC surface particle state.
    if(
      this.continuity?.material?.uniforms?.uLogoAlpha
    ){
      this.continuity.material.uniforms
        .uLogoAlpha.value=
          mix(
            particleize,
            .22,
            .92
          );
    }

    // ---------------------------------
    // TGDesk particles -> TGDesk object
    // ---------------------------------
    const deskResolve=
      mix(
        p,
        2.155,
        2.355
      );

    const deskParticleAlpha=
      mix(
        p,
        2.095,
        2.175
      )*
      (
        1-
        mix(
          p,
          2.315,
          2.410
        )
      );

    setSurfaceParticlePhase(
      this.deskSurfaceR23,
      {
        phase:1-deskResolve,
        alpha:deskParticleAlpha,
        flow:
          8.8+
          (p-2.10)*6.0,
        pointScale:1.02,
        foreground:true
      }
    );

    // Keep the technical agents still while matter is resolving.
    // Motion begins only once they are recognizably physical objects.
    const resolvedMotion=
      mix(
        p,
        2.335,
        2.520
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

    const phase=
      Math.max(
        0,
        (p-2.335)*.92
      );

    this.deskSystemR22.position.set(
      0,
      portrait?.20:0,
      lerp(
        -.08,
        .32,
        deskResolve
      )
    );

    this.deskSystemR22.scale.setScalar(
      lerp(
        markScale*.97,
        markScale,
        deskResolve
      )
    );

    updateTGDeskSystemR22(
      this.deskSystemR22,
      {
        alpha:1,
        flow,
        motion:resolvedMotion,
        phase
      }
    );

    resolveTGDeskSolid(
      this.deskSystemR22,
      deskResolve
    );

    // As the exact TGDesk surface crystallizes into the physical mark,
    // the generic logo particles disappear underneath it.
    if(
      this.continuity?.material?.uniforms?.uLogoAlpha
    ){
      const genericOut=
        1-
        mix(
          p,
          2.165,
          2.365
        );

      this.continuity.material.uniforms
        .uLogoAlpha.value=
          clamp(genericOut);
    }

    if(p>2.410){
      this.deskSurfaceR23.visible=false;
    }

    if(p>2.140){
      this.tgbcSurfaceR23.visible=false;
    }
  }

  render(state){
    if(this.tgbcSurfaceR23){
      this.tgbcSurfaceR23.visible=false;
    }

    if(this.deskSurfaceR23){
      this.deskSurfaceR23.visible=false;
    }

    super.render(state);
  }
}
