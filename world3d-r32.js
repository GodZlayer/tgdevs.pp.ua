import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r31.js';
import { clamp, mix, lerp } from './r20/motion.js';
import { getResponsiveProfile } from './r32/responsive-layout.js';
import {
  updateTGDeskPreview,
  hideTGDeskPreview
} from './r30/tgdesk-preview.js';
import {
  updateTGDeskSystemR22,
  updatePremiumWordmarkR22
} from './r25/tgdesk-system.js';

function setCanvasTextureQuality(root,maxAnisotropy){
  if(!root)return;
  root.traverse?.(o=>{
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      const tune=tex=>{
        if(!tex?.isTexture)return;
        tex.anisotropy=Math.max(tex.anisotropy||1,Math.min(16,maxAnisotropy||1));
        tex.needsUpdate=true;
      };
      for(const key of ['map','alphaMap','emissiveMap','roughnessMap','metalnessMap']){
        tune(m[key]);
      }
      Object.values(m.uniforms||{}).forEach(u=>tune(u?.value));
    });
  });
}

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);
    this.responsive=getResponsiveProfile(innerWidth,innerHeight);
    this._responsiveQualityApplied=false;
  }

  _profile(state){
    return state?.responsive||getResponsiveProfile(
      state?.width||innerWidth,
      state?.height||innerHeight
    );
  }

  resize(w,h,portrait){
    const profile=getResponsiveProfile(w,h);
    this.responsive=profile;

    // Preserve all inherited build/cache semantics, but feed them only a
    // compatibility orientation bit. The actual composition below is continuous.
    super.resize(w,h,profile.compatibilityPortrait);

    this.renderer.setPixelRatio(profile.dpr);
    this.renderer.setSize(profile.width,profile.height,false);

    this.camera.aspect=profile.aspect;
    this.camera.fov=profile.cameraFov;
    this.camera.position.z=profile.cameraZ;
    this.camera.updateProjectionMatrix();

    const halfH=
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*
      this.camera.position.z;
    this.viewH=halfH*2;
    this.viewW=this.viewH*this.camera.aspect;

    if(this.appBackdrop){
      const d=Math.abs(this.camera.position.z-this.appBackdrop.position.z);
      const planeH=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*d;
      this.appBackdrop.scale.set(
        planeH*this.camera.aspect*1.025,
        planeH*1.025,
        1
      );
    }

    // Geometry density follows available rendering budget instead of a binary
    // mobile/desktop switch.
    const density=profile.particleDensity;
    this.cloud?.geometry?.setDrawRange(0,Math.round(9000+7000*density));
    if(this.markFragments?.geometry){
      this.markFragments.geometry.instanceCount=Math.round(1300+900*density);
    }
    if(this.wordFragments?.geometry){
      this.wordFragments.geometry.instanceCount=Math.round(2200+2000*density);
    }

    if(!this._responsiveQualityApplied){
      const maxA=this.renderer.capabilities.getMaxAnisotropy?.()||8;
      setCanvasTextureQuality(this.scene,maxA);
      this._responsiveQualityApplied=true;
    }
  }

  _layoutCRMResponsive(p){
    if(!this.appTour||!this.viewW||!this.viewH)return;
    const r=this.responsive;
    const W=this.appTour.userData.W;
    const H=this.appTour.userData.H;
    const contain=Math.min(this.viewW/W,this.viewH/H);

    // Tall screens show the same live CRM, but the world itself reframes it:
    // zoom toward the useful content column and let the existing infinite bleed
    // carry the interface beyond the viewport. No 16:9 thumbnail treatment.
    const scale=contain*r.crmZoom;
    const contentLocalX=this.appTour.userData.contentRoot?.position?.x||.92;

    this.appTour.scale.setScalar(scale);
    this.appTour.position.set(
      -contentLocalX*scale*r.crmFocusX,
      this.viewH*r.crmFocusY,
      0
    );

    // Keep the embedded brand physically attached to the app shell after the
    // fluid scaling/reframing pass.
    this._layoutCRMBrand?.();
  }

  _stabilizeCRMPreview(p){
    super._stabilizeCRMPreview(p);
    if(p>=.44&&p<1.535){
      this._layoutCRMResponsive(p);
    }
  }

  _applyFluidHero(state){
    const p=state.p||0;
    const r=this.responsive;
    const t=r.vertical;

    if(this.cloud?.material?.uniforms?.uPortrait){
      this.cloud.material.uniforms.uPortrait.value=t;
    }

    if(this.identity){
      this.identity.scale.setScalar(r.heroScale);
    }

    const build=mix(p,.005,.13);
    const wordIn=mix(build,.54,.96);
    const wordExit=mix(p,.19,.255);
    const targetTextIn=mix(p,.405,.445)*mix(mix(p,.265,.405),.86,1.0);

    if(this.sourceWord){
      const rawW=Math.max(.001,this.sourceWord.userData.width||1);
      const rawH=Math.max(.001,this.sourceWord.userData.height||1);
      const landScale=Math.min(.92,3.10/rawW);
      const portScale=Math.min(.66,3.05/rawW);
      const landW=rawW*landScale;
      const portH=rawH*portScale;
      const landX=lerp(.42,1.0+.30+landW/2,wordIn);
      const portY=-1.0-.24-portH/2;
      this.sourceWord.scale.setScalar(lerp(landScale,portScale,t));
      this.sourceWord.position.set(
        lerp(landX,0,t),
        lerp(-.01,portY,t),
        lerp(-.08,-.34,wordExit)
      );
    }

    if(this.targetWord){
      const rawW=Math.max(.001,this.targetWord.userData.width||1);
      const rawH=Math.max(.001,this.targetWord.userData.height||1);
      const landScale=Math.min(.54,3.10/rawW);
      const portScale=Math.min(.54,3.12/rawW);
      const landW=rawW*landScale;
      const portH=rawH*portScale;
      const landX=1.0+.32+landW/2;
      const portY=-1.0-.24-portH/2;
      this.targetWord.scale.setScalar(lerp(landScale,portScale,t));
      this.targetWord.position.set(
        lerp(landX,0,t),
        lerp(-.01,portY,t),
        lerp(-.20,0,targetTextIn)
      );
    }

    if(this.textReady&&this.slogans){
      this.slogans.forEach(item=>{
        const rawW=Math.max(.001,item.children?.[0]?.userData?.width||1);
        const landScale=Math.min(.80,3.20/rawW);
        const portScale=Math.min(.52,3.20/rawW);
        const portW=rawW*portScale;
        item.scale.setScalar(lerp(landScale,portScale,t));
        item.position.x=lerp(-4.25,-portW/2,t);
        item.position.y=lerp(.05,2.38,t);
        item.rotation.y=lerp(.012,0,t);
      });
    }

    if(this.lead){
      const rawW=Math.max(.001,this.lead.children?.[0]?.userData?.width||1);
      const landScale=Math.min(.74,3.15/rawW);
      const portScale=Math.min(.48,3.20/rawW);
      const portW=rawW*portScale;
      this.lead.scale.setScalar(lerp(landScale,portScale,t));
      this.lead.position.x=lerp(-4.30,-portW/2,t);
      this.lead.position.y=lerp(.18,2.18,t);
      this.lead.rotation.y=lerp(.01,0,t);
    }

    if(this.scrollCue){
      this.scrollCue.position.y=r.scrollCueY;
      this.scrollCue.scale.setScalar(r.scrollCueScale);
    }
  }

  _applyFluidTGDeskIdentity(p){
    if(p<1.95||p>2.70)return;
    const t=this.responsive.vertical;
    const markScale=lerp(.92,.82,t);

    if(this.deskSystemR22){
      this.deskSystemR22.position.x=0;
      this.deskSystemR22.position.y=lerp(0,.20,t);
      if(p<2.50){
        const favIn=mix(p,2.175,2.335);
        this.deskSystemR22.scale.setScalar(
          lerp(markScale*.95,markScale,favIn)
        );
      }
    }

    if(this.deskWordR22){
      const wordScale=lerp(.92,.86,t);
      const halfMark=(this.deskSystemR22?.userData?.halfWidth||1.08)*markScale;
      const wordW=(this.deskWordR22.userData.width||1)*wordScale;
      const landX=halfMark+.29+wordW*.5;
      this.deskWordR22.position.set(
        lerp(landX,0,t),
        lerp(0,-1.18,t),
        .34
      );
      this.deskWordR22.scale.setScalar(wordScale);
    }
  }

  _renderTGDeskPreview(p,portrait,state){
    const r=this.responsive;
    const t=r.vertical;
    const enter=mix(p,2.50,2.70);
    const copyOut=mix(p,2.50,2.62);
    const close=mix(p,3.60,3.78);
    const zoom=clamp(enter*(1-close));

    const baseScale=lerp(.92,.82,t);
    const zoomScale=lerp(8.45,10.2,t);
    const flow=9.0+Math.max(0,p-2.45)*12.0;
    const phase=.20+Math.max(0,p-2.45)*1.32;

    this.deskSystemR22.position.set(
      0,
      lerp(.20*t,0,zoom),
      lerp(.32,.18,zoom)
    );
    this.deskSystemR22.scale.setScalar(lerp(baseScale,zoomScale,zoom));
    this.deskSystemR22.rotation.set(0,0,0);

    updateTGDeskSystemR22(this.deskSystemR22,{
      alpha:1,flow,motion:1,phase
    });

    const copyAlpha=Math.max(1-copyOut,close);
    this._setDeskCopy(copyAlpha,p);

    const screenIn=mix(p,2.56,2.69);
    const screenOut=mix(p,3.70,3.79);
    const screenAlpha=screenIn*(1-screenOut);
    const openAperture=lerp(.035,lerp(1.18,1.08,t),enter);
    const aperture=lerp(openAperture,.035,close);
    const warp=lerp(.115,0,enter)+close*.08;

    updateTGDeskPreview(this.tgdeskPreviewR30,{
      p,
      alpha:screenAlpha,
      aperture,
      aspect:Math.max(.35,r.aspect),
      warp,
      width:this.viewW*1.015,
      height:this.viewH*1.015
    });

    if(this.continuity&&p>2.71&&p<3.68){
      this.continuity.visible=false;
    }

    if(close>.998){
      hideTGDeskPreview(this.tgdeskPreviewR30);
      this.deskSystemR22.position.set(0,.20*t,.32);
      this.deskSystemR22.scale.setScalar(baseScale);
      updateTGDeskSystemR22(this.deskSystemR22,{
        alpha:1,flow,motion:1,phase
      });
      this._setDeskCopy(1,p);
    }
  }

  render(state){
    this.responsive=this._profile(state);
    super.render({
      ...state,
      portrait:this.responsive.compatibilityPortrait,
      responsive:this.responsive
    });

    this._applyFluidHero(state);
    this._applyFluidTGDeskIdentity(state.p||0);

    // Parent render already produced the deterministic state. This final pass
    // only applies the fluid viewport composition to that exact same frame.
    this.renderer.render(this.scene,this.camera);
  }
}
