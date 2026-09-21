import { TGWorld3D as TGWorld3DBase } from './world3d-r16.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const mix=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;

function attenuate(root,alpha){
  if(!root)return;
  const a=clamp(alpha);
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      if(m.uniforms?.uAlpha){
        m.uniforms.uAlpha.value*=a;
      }else if(typeof m.opacity==='number'){
        m.transparent=true;
        m.opacity*=a;
      }
    });
  });
  if(a<=.001)root.visible=false;
}

export class TGWorld3D extends TGWorld3DBase{
  render(state){
    super.render(state);

    const p=state.p||0;
    if(p<=1.535 || !this.appTour || !this.targetMark)return;

    // ------------------------------------------------------------
    // PHASE 4 — CLOSING.
    // The finished Cargos screen does not cut away. It resolves back
    // into the exact pre-application identity: project background +
    // centered TGBC favicon. Every value is scroll-derived, so reversing
    // the scroll rebuilds the application in the opposite direction.
    // ------------------------------------------------------------

    // 1) Hold the completed Cargos state briefly, then remove only its
    // content first. The shell remains readable for a few more frames.
    const contentOut=mix(p,1.565,1.625);
    const tiers=this.appTour.userData?.tiersScreen;
    if(tiers){
      attenuate(tiers,1-contentOut);
      tiers.position.z-=contentOut*.18;
      tiers.scale.multiplyScalar(lerp(1,.985,contentOut));
    }

    // 2) The TGBusinessCenter wordmark leaves the top bar before the
    // shell itself disappears. The favicon stays and becomes the anchor.
    const wordOut=mix(p,1.595,1.665);
    attenuate(this.targetWordLight,1-wordOut);

    // 3) The application shell recedes as a single physical surface.
    // No replacement screen is introduced.
    const shellOut=mix(p,1.615,1.725);
    attenuate(this.appTour,1-shellOut);
    this.appTour.position.z-=shellOut*.34;
    this.appTour.scale.multiplyScalar(lerp(1,.965,shellOut));

    // 4) The light application backdrop yields to the same TGBC project
    // background that existed immediately before the interface formed.
    const backdropOut=mix(p,1.625,1.735);
    if(this.appBackdrop?.material){
      this.appBackdrop.material.opacity*=1-backdropOut;
      if(backdropOut>=.999)this.appBackdrop.visible=false;
    }

    const backgroundIn=mix(p,1.615,1.735);
    if(this.bg?.material?.uniforms?.uAlpha){
      this.bg.visible=true;
      this.bg.material.uniforms.uAlpha.value=backgroundIn;
      this.bg.scale.setScalar(lerp(.90,1,backgroundIn));
      this.bg.rotation.y=lerp(-.04,.10,backgroundIn);
    }

    // The pre-application TGBC state is the clean gradient environment,
    // not the earlier particle cloud / morph fragments.
    if(this.cloud?.material?.uniforms?.uAlpha){
      this.cloud.material.uniforms.uAlpha.value=0;
    }
    if(this.markFragments?.material?.uniforms?.uAlpha){
      this.markFragments.material.uniforms.uAlpha.value=0;
      this.markFragments.visible=false;
    }
    if(this.wordFragments?.material?.uniforms?.uAlpha){
      this.wordFragments.material.uniforms.uAlpha.value=0;
      this.wordFragments.visible=false;
    }

    // 5) Detach the actual favicon from the topbar and return that same
    // object to absolute center while restoring its pre-app hero scale.
    const centerIn=mix(p,1.625,1.755);
    const x=this.targetMark.position.x;
    const y=this.targetMark.position.y;
    const z=this.targetMark.position.z;
    this.targetMark.position.set(
      lerp(x,0,centerIn),
      lerp(y,0,centerIn),
      lerp(z,0,centerIn)
    );

    const rawHalf=Math.max(.001,this.targetMark.userData?.halfWidth||1);
    const heroScale=1/rawHalf;
    const currentScale=this.targetMark.scale.x;
    this.targetMark.scale.setScalar(lerp(currentScale,heroScale,centerIn));
    this.targetMark.rotation.set(0,0,0);
    this.targetMark.visible=true;

    // 6) Final settle: only the centered favicon and project background
    // remain. Scrolling farther changes nothing; scrolling back reverses
    // every closing frame exactly.
    const finalSettle=mix(p,1.755,1.805);
    if(finalSettle>.001){
      if(this.appTour)attenuate(this.appTour,1-finalSettle);
      if(this.appBackdrop?.material){
        this.appBackdrop.material.opacity*=1-finalSettle;
        if(finalSettle>=.999)this.appBackdrop.visible=false;
      }
      if(this.bg?.material?.uniforms?.uAlpha){
        this.bg.material.uniforms.uAlpha.value=1;
        this.bg.scale.setScalar(1);
        this.bg.rotation.y=.10;
      }
      this.targetMark.position.set(0,0,0);
      this.targetMark.scale.setScalar(heroScale);
    }

    this.renderer.render(this.scene,this.camera);
  }
}
