import { TGWorld3D as TGWorld3DBase } from './world3d-r23-r28.js';
import { clamp, mix, lerp } from './r20/motion.js';
import {
  updateTGDeskSystemR22,
  updatePremiumWordmarkR22
} from './r25/tgdesk-system.js';
import {
  createTGDeskPreview,
  updateTGDeskPreview,
  hideTGDeskPreview
} from './r29/tgdesk-preview.js';

/**
 * r29 — complete cinematic product timeline.
 *
 * Existing timeline is preserved byte-for-byte through the TGDesk reveal:
 * loading -> TGDevs -> transition -> TGBusinessCenter -> CRM preview ->
 * TGBC closing -> particle transition -> TGDesk presentation.
 *
 * This layer adds:
 * TGDesk presentation -> center-core zoom -> TGDesk Hub -> remote Windows ->
 * drawing -> user message -> input lock -> hardware tests -> Hub ->
 * core contraction -> TGDesk closing identity.
 *
 * Every state derives exclusively from scroll position. There is no autonomous
 * time source, so pausing freezes the exact frame and reverse scroll reverses
 * the entire presentation.
 */
export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.tgdeskPreviewR29=createTGDeskPreview();
    this.tgdeskPreviewR29.position.set(0,0,4.8);
    this.scene.add(this.tgdeskPreviewR29);
  }

  _hideDeskCopy(){
    if(this.deskWordR22){
      updatePremiumWordmarkR22(
        this.deskWordR22,
        {alpha:0,sweep:0}
      );
    }

    if(this.deskSlogan){
      this.deskSlogan.visible=false;
      if(this.deskSlogan.material?.uniforms?.uAlpha){
        this.deskSlogan.material.uniforms.uAlpha.value=0;
      }
    }

    if(this.deskLine){
      this.deskLine.visible=false;
      if(this.deskLine.material){
        this.deskLine.material.opacity=0;
      }
    }
  }

  _setDeskCopy(alpha,p){
    const a=clamp(alpha);

    if(this.deskWordR22){
      updatePremiumWordmarkR22(
        this.deskWordR22,
        {
          alpha:a,
          sweep:mix(p,3.66,3.80)
        }
      );
    }

    if(this.deskSlogan){
      this.deskSlogan.visible=a>.001;
      if(this.deskSlogan.material?.uniforms?.uAlpha){
        this.deskSlogan.material.uniforms.uAlpha.value=a;
      }
      if(this.deskSlogan.material?.uniforms?.uReveal){
        this.deskSlogan.material.uniforms.uReveal.value=a;
      }
    }

    if(this.deskLine){
      this.deskLine.visible=a>.001;
      if(this.deskLine.material){
        this.deskLine.material.opacity=a;
      }
    }
  }

  _renderTGDeskPreview(p,portrait,state){
    const enter=
      mix(
        p,
        2.50,
        2.70
      );

    const copyOut=
      mix(
        p,
        2.50,
        2.62
      );

    const close=
      mix(
        p,
        3.60,
        3.78
      );

    // During the opening the resolved favicon itself becomes the camera target.
    // The three comets keep using the exact same controlled triangular motion
    // while the entire system expands around the central sphere.
    const zoom=
      clamp(
        enter*
        (1-close)
      );

    const baseScale=
      portrait
      ? .82
      : .92;

    const zoomScale=
      portrait
      ? 10.2
      : 8.45;

    const flow=
      9.0+
      Math.max(
        0,
        p-2.45
      )*12.0;

    const phase=
      .20+
      Math.max(
        0,
        p-2.45
      )*1.32;

    this.deskSystemR22.position.set(
      0,
      lerp(
        portrait?.20:0,
        0,
        zoom
      ),
      lerp(
        .32,
        .18,
        zoom
      )
    );

    this.deskSystemR22.scale.setScalar(
      lerp(
        baseScale,
        zoomScale,
        zoom
      )
    );

    this.deskSystemR22.rotation.set(
      0,
      0,
      0
    );

    updateTGDeskSystemR22(
      this.deskSystemR22,
      {
        alpha:1,
        flow,
        motion:1,
        phase
      }
    );

    // Text identity gets out of the way as the viewer enters the central core.
    // On the way back it resolves before the preview disappears completely,
    // making the interface physically close into the same logo it came from.
    const copyAlpha=
      Math.max(
        1-copyOut,
        close
      );

    this._setDeskCopy(
      copyAlpha,
      p
    );

    const screenIn=
      mix(
        p,
        2.56,
        2.69
      );

    const screenOut=
      mix(
        p,
        3.70,
        3.79
      );

    const screenAlpha=
      screenIn*
      (1-screenOut);

    const openAperture=
      lerp(
        .035,
        portrait?1.08:1.18,
        enter
      );

    const aperture=
      lerp(
        openAperture,
        .035,
        close
      );

    const warp=
      lerp(
        .115,
        0,
        enter
      )+
      close*.08;

    // The interface is a full-resolution deterministic canvas, but the reveal
    // is a WebGL radial aperture. At the start only the exact center of the
    // TGDesk sphere is visible; as the sphere approaches camera the aperture
    // grows until the Hub occupies the whole viewport.
    updateTGDeskPreview(
      this.tgdeskPreviewR29,
      {
        p,
        alpha:screenAlpha,
        aperture,
        aspect:
          Math.max(
            .35,
            state.width/
            Math.max(1,state.height)
          ),
        warp,
        width:this.viewW*1.015,
        height:this.viewH*1.015
      }
    );

    // While the application fully occupies the viewport, the old particle
    // universe is irrelevant and would only leak through antialiased edges.
    if(
      this.continuity &&
      p>2.71 &&
      p<3.68
    ){
      this.continuity.visible=false;
    }

    // At the final frame the override converges exactly to the already existing
    // TGDesk presentation. The base scene can then continue owning the result.
    if(close>.998){
      hideTGDeskPreview(
        this.tgdeskPreviewR29
      );

      this.deskSystemR22.position.set(
        0,
        portrait?.20:0,
        .32
      );

      this.deskSystemR22.scale.setScalar(
        baseScale
      );

      updateTGDeskSystemR22(
        this.deskSystemR22,
        {
          alpha:1,
          flow,
          motion:1,
          phase
        }
      );

      this._setDeskCopy(
        1,
        p
      );
    }
  }

  render(state){
    // No future frame survives a reverse scroll.
    hideTGDeskPreview(
      this.tgdeskPreviewR29
    );

    super.render(state);

    const p=
      state.p||
      0;

    if(
      p<2.50 ||
      p>3.82
    ){
      return;
    }

    this._renderTGDeskPreview(
      p,
      !!state.portrait,
      state
    );

    // Base classes already rendered once. r29 owns the final composited frame
    // only while its scene is active.
    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}
