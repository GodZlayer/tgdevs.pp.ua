import * as THREE from 'three';
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
} from './r30/tgdesk-preview.js';

/**
 * r30 — previews preserve their native aspect ratio.
 *
 * Both application previews now use the same visual grammar:
 * - the real interface is always fully visible (contain);
 * - the remaining viewport is filled by a blurred/darkened continuation
 *   of that same live interface (cover);
 * - no hard letterbox/frame edge is left visible.
 */
export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);

    this.tgdeskPreviewR30=createTGDeskPreview();
    this.tgdeskPreviewR30.position.set(0,0,4.8);
    this.scene.add(this.tgdeskPreviewR30);

    // TGBC is geometry rather than a texture, so its bleed is built from the
    // already-rendered current frame. We crop exactly the contained 16:9
    // application rectangle, blur that live image on a small canvas, and
    // place it behind the sharp 3D interface.
    this.crmBleedCanvas=document.createElement('canvas');
    this.crmBleedCanvas.width=640;
    this.crmBleedCanvas.height=360;
    this.crmBleedCtx=this.crmBleedCanvas.getContext('2d',{alpha:false});

    this.crmBleedTexture=new THREE.CanvasTexture(this.crmBleedCanvas);
    this.crmBleedTexture.colorSpace=THREE.SRGBColorSpace;
    this.crmBleedTexture.minFilter=THREE.LinearFilter;
    this.crmBleedTexture.magFilter=THREE.LinearFilter;
    this.crmBleedTexture.generateMipmaps=false;

    this.crmBleedMaterial=new THREE.MeshBasicMaterial({
      map:this.crmBleedTexture,
      transparent:true,
      opacity:0,
      depthWrite:false,
      depthTest:false,
      toneMapped:false
    });

    this.crmBleedPlane=new THREE.Mesh(
      new THREE.PlaneGeometry(1,1),
      this.crmBleedMaterial
    );
    this.crmBleedPlane.position.z=-1.08;
    this.crmBleedPlane.renderOrder=-100;
    this.crmBleedPlane.frustumCulled=false;
    this.crmBleedPlane.visible=false;
    this.scene.add(this.crmBleedPlane);
  }

  resize(w,h,portrait){
    super.resize(w,h,portrait);

    // The real TGBC UI is never cropped anymore.
    if(this.appTour && this.viewW && this.viewH){
      const W=this.appTour.userData.W;
      const H=this.appTour.userData.H;
      const contain=Math.min(
        this.viewW/W,
        this.viewH/H
      );

      this.appTour.scale.setScalar(contain);
      this.appTour.position.set(0,0,0);
    }

    if(this.crmBleedPlane){
      const d=Math.abs(
        this.camera.position.z-
        this.crmBleedPlane.position.z
      );
      const planeH=
        2*
        Math.tan(
          THREE.MathUtils.degToRad(
            this.camera.fov*.5
          )
        )*
        d;
      const planeW=
        planeH*
        this.camera.aspect;

      this.crmBleedPlane.scale.set(
        planeW*1.025,
        planeH*1.025,
        1
      );
    }
  }

  _captureCRMInfiniteBleed(){
    if(
      !this.crmBleedCtx ||
      !this.canvas ||
      !this.appTour
    )return;

    const src=this.canvas;
    const sw=src.width;
    const sh=src.height;
    if(sw<2||sh<2)return;

    const designAspect=
      this.appTour.userData.W/
      this.appTour.userData.H;
    const viewportAspect=sw/sh;

    let sx=0;
    let sy=0;
    let cw=sw;
    let ch=sh;

    // Crop ONLY the exact on-screen contained application. The blur therefore
    // derives from the actual current CRM frame rather than from a decorative
    // approximation.
    if(viewportAspect>designAspect){
      cw=sh*designAspect;
      sx=(sw-cw)*.5;
    }else{
      ch=sw/designAspect;
      sy=(sh-ch)*.5;
    }

    const ctx=this.crmBleedCtx;
    const W=this.crmBleedCanvas.width;
    const H=this.crmBleedCanvas.height;

    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.filter='none';
    ctx.fillStyle='#0b1118';
    ctx.fillRect(0,0,W,H);

    // Overscan avoids transparent/empty blur edges. The blur is deliberately
    // strong enough to destroy legibility while retaining color/layout rhythm.
    ctx.filter='blur(22px) saturate(1.08) brightness(.74)';
    ctx.drawImage(
      src,
      sx,sy,cw,ch,
      -24,-14,
      W+48,H+28
    );
    ctx.filter='none';

    const vignette=ctx.createRadialGradient(
      W*.5,H*.48,H*.08,
      W*.5,H*.48,H*.72
    );
    vignette.addColorStop(0,'rgba(3,6,8,.03)');
    vignette.addColorStop(.68,'rgba(3,6,8,.13)');
    vignette.addColorStop(1,'rgba(3,6,8,.42)');
    ctx.fillStyle=vignette;
    ctx.fillRect(0,0,W,H);
    ctx.restore();

    this.crmBleedTexture.needsUpdate=true;
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
    const enter=mix(p,2.50,2.70);
    const copyOut=mix(p,2.50,2.62);
    const close=mix(p,3.60,3.78);

    const zoom=clamp(
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

    this.deskSystemR22.rotation.set(0,0,0);

    updateTGDeskSystemR22(
      this.deskSystemR22,
      {
        alpha:1,
        flow,
        motion:1,
        phase
      }
    );

    const copyAlpha=Math.max(
      1-copyOut,
      close
    );
    this._setDeskCopy(copyAlpha,p);

    const screenIn=mix(p,2.56,2.69);
    const screenOut=mix(p,3.70,3.79);
    const screenAlpha=
      screenIn*
      (1-screenOut);

    const openAperture=lerp(
      .035,
      portrait?1.08:1.18,
      enter
    );

    const aperture=lerp(
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

    updateTGDeskPreview(
      this.tgdeskPreviewR30,
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

    if(
      this.continuity &&
      p>2.71 &&
      p<3.68
    ){
      this.continuity.visible=false;
    }

    if(close>.998){
      hideTGDeskPreview(
        this.tgdeskPreviewR30
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

      this._setDeskCopy(1,p);
    }
  }

  render(state){
    hideTGDeskPreview(
      this.tgdeskPreviewR30
    );

    if(this.crmBleedPlane){
      this.crmBleedPlane.visible=false;
      this.crmBleedMaterial.opacity=0;
    }

    super.render(state);

    const p=state.p||0;

    // TGBC/CRM preview: first render produces the sharp contained interface.
    // Capture it, create the blurred infinite bleed, then composite once more.
    if(
      p>=.44 &&
      p<1.535 &&
      this.appTour?.visible
    ){
      this._captureCRMInfiniteBleed();

      const bleedIn=mix(p,.44,.49);
      const bleedOut=mix(p,1.49,1.535);
      const bleedA=
        bleedIn*
        (1-bleedOut);

      this.crmBleedPlane.visible=bleedA>.001;
      this.crmBleedMaterial.opacity=.98*bleedA;

      // The old white full-viewport backdrop existed only to hide letterbox
      // space. Once that space is the live blurred continuation, keeping the
      // white plane would paint over the bleed. Hide it only for this final
      // composite pass; the sharp appTour still carries its own real white
      // application surface.
      const backdropVisible=
        this.appBackdrop?.visible;
      const backdropOpacity=
        this.appBackdrop?.material?.opacity;

      if(this.appBackdrop){
        this.appBackdrop.visible=false;
      }

      this.renderer.render(
        this.scene,
        this.camera
      );

      if(this.appBackdrop){
        this.appBackdrop.visible=
          !!backdropVisible;
        if(
          this.appBackdrop.material &&
          backdropOpacity!==undefined
        ){
          this.appBackdrop.material.opacity=
            backdropOpacity;
        }
      }
    }

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

    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}
