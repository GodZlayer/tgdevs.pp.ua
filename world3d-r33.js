import * as THREE from 'three';
import { TGWorld3D as TGWorld3DBase } from './world3d-r31.js';
import { clamp, mix, lerp } from './r20/motion.js';
import { getResponsiveProfile } from './r33/responsive-layout.js';
import {
  updateTGDeskPreview,
  hideTGDeskPreview
} from './r30/tgdesk-preview.js';
import {
  updateTGDeskSystemR22,
  updatePremiumWordmarkR22
} from './r25/tgdesk-system.js';

function tuneTextureQuality(root,maxAnisotropy){
  if(!root)return;
  root.traverse?.(o=>{
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      const tune=tex=>{
        if(!tex?.isTexture)return;
        tex.anisotropy=Math.max(
          tex.anisotropy||1,
          Math.min(16,maxAnisotropy||1)
        );
        tex.needsUpdate=true;
      };
      ['map','alphaMap','emissiveMap','roughnessMap','metalnessMap','normalMap']
        .forEach(key=>tune(m[key]));
      Object.values(m.uniforms||{}).forEach(u=>tune(u?.value));
    });
  });
}

function nodeOpacity(root,value){
  if(!root)return;
  const a=clamp(value);
  root.visible=a>.001;
  root.traverse?.(o=>{
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      m.transparent=true;
      if(m.uniforms?.uAlpha)m.uniforms.uAlpha.value=a;
      else m.opacity=a*(m.userData?.uiBaseOpacity??1);
      m.depthWrite=a>.995;
    });
  });
}

export class TGWorld3D extends TGWorld3DBase{
  constructor(canvas){
    super(canvas);
    this.responsive=getResponsiveProfile(innerWidth,innerHeight);
    this._qualityKey='';
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

    // Feed inherited legacy stages a compatibility orientation only. The
    // actual camera/world/UI composition below remains continuous.
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
      const planeH=
        2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*d;
      this.appBackdrop.scale.set(
        planeH*this.camera.aspect*1.025,
        planeH*1.025,
        1
      );
    }

    const density=clamp(profile.particleDensity,.45,1);
    this.cloud?.geometry?.setDrawRange(
      0,
      Math.round(7800+8200*density)
    );
    if(this.markFragments?.geometry){
      this.markFragments.geometry.instanceCount=
        Math.round(1100+1100*density);
    }
    if(this.wordFragments?.geometry){
      this.wordFragments.geometry.instanceCount=
        Math.round(1900+2300*density);
    }

    const qualityKey=
      [
        Math.round(profile.dpr*100),
        Math.round(profile.capability*100)
      ].join('|');

    if(this._qualityKey!==qualityKey){
      this._qualityKey=qualityKey;
      const maxA=
        this.renderer.capabilities.getMaxAnisotropy?.()||8;
      tuneTextureQuality(this.scene,maxA);
    }
  }

  _crmStage(p){
    return {
      clientsIn:mix(p,.566,.612),
      formOpen:mix(p,.650,.680),
      formClose:mix(p,.828,.858),
      clientsReturn:mix(p,.842,.872),
      newRowIn:mix(p,.858,.900),
      settleNewRow:mix(p,.900,.955)
    };
  }

  _layoutCRMResponsive(p=0){
    if(!this.appTour||!this.viewW||!this.viewH)return;

    const r=this.responsive;
    const u=this.appTour.userData;
    const W=u.W;
    const H=u.H;
    const widthFit=this.viewW/W;
    const heightFit=this.viewH/H;

    const desktopScale=Math.min(
      heightFit*.985,
      widthFit*r.crmZoom
    );

    // The compact CRM is a genuine alternate composition of the same data,
    // not a crop. It has its own authored world bounds.
    const compactW=4.90;
    const compactH=5.35;
    const compactScale=Math.min(
      this.viewW/compactW,
      this.viewH/compactH
    )*.965;

    // While a modal is open, fit the modal itself rather than the list behind it.
    const stage=this._crmStage(p);
    const formPresence=
      stage.formOpen*(1-stage.formClose);
    const modalW=6.90;
    const modalH=5.45;
    const modalScale=Math.min(
      this.viewW/modalW,
      this.viewH/modalH
    )*.965;

    const adaptive=clamp(
      (r.sidebarCollapse-.08)/.72
    );

    let scale=lerp(
      desktopScale,
      compactScale,
      adaptive
    );

    scale=lerp(
      scale,
      modalScale,
      adaptive*formPresence
    );

    const contentLocalX=
      u.contentRoot?.position?.x||.92;

    const desktopX=
      -contentLocalX*desktopScale*r.crmFocusX;

    this.appTour.scale.setScalar(scale);
    this.appTour.position.set(
      lerp(desktopX,0,adaptive),
      lerp(
        this.viewH*r.crmFocusY,
        0,
        adaptive
      ),
      0
    );

    this._layoutCRMBrand?.();
  }

  _stabilizeCRMPreview(p){
    super._stabilizeCRMPreview(p);

    if(p>=.44&&p<1.535){
      this._layoutCRMResponsive(p);
    }
  }

  _applyCRMInternalReflow(p){
    if(
      p<.44||
      p>=1.535||
      !this.appTour?.userData
    )return;

    const r=this.responsive;
    const t=r.sidebarCollapse;
    const u=this.appTour.userData;
    const W=u.W||12.8;
    const originalSideW=1.86;
    const collapsedSideW=1.08;
    const sideW=lerp(originalSideW,collapsedSideW,t);
    const left=-W/2;
    const sideCenter=left+sideW/2;
    const sideRight=left+sideW;

    if(u.sidebar){
      u.sidebar.scale.x=sideW/originalSideW;
      u.sidebar.position.x=sideCenter;
    }
    if(u.sideBorder){
      u.sideBorder.position.x=sideRight;
    }

    if(u.sidebarTitle){
      nodeOpacity(u.sidebarTitle,1-t);
    }

    (u.navMeshes||[]).forEach(n=>{
      if(!n?.holder)return;
      n.holder.position.x=sideCenter;
      if(n.back)n.back.scale.x=lerp(1,.58,t);
      if(n.icon)n.icon.position.x=lerp(-.55,0,t);
      if(n.labelMesh){
        n.labelMesh.position.x=lerp(-.34,.12,t);
        nodeOpacity(n.labelMesh,1-t*1.15);
      }
    });

    if(u.cargos){
      u.cargos.position.x=sideCenter;
    }
    if(u.cargosBack){
      u.cargosBack.scale.x=lerp(1,.58,t);
    }
    if(u.cargosIcon){
      u.cargosIcon.position.x=lerp(-.55,0,t);
    }
    if(u.cargosLabel){
      u.cargosLabel.position.x=lerp(-.34,.12,t);
      nodeOpacity(u.cargosLabel,1-t*1.15);
    }

    if(u.headerDetails){
      u.headerDetails.position.x=-.38*r.headerCompression;
      u.headerDetails.scale.setScalar(
        1-.09*r.headerCompression
      );
      nodeOpacity(
        u.headerDetails,
        1-.48*r.headerCompression
      );
    }

    if(u.contentRoot){
      u.contentRoot.position.x=.92-r.contentShift;
      u.contentRoot.scale.setScalar(r.contentScale);
    }

    if(u.subheader){
      u.subheader.position.x=-r.contentShift*.42;
    }

    if(u.searchBox){
      u.searchBox.scale.x=1-r.searchCompression;
    }

    if(u.newBtnGroup){
      u.newBtnGroup.position.x=
        5.46-r.contentShift*.55;
      u.newBtnGroup.scale.multiplyScalar(
        lerp(1,.94,t)
      );
    }

    // Modal keeps its proportions (no text squashing), but becomes a denser
    // composition inside tall screens.
    if(u.form?.visible){
      u.form.scale.multiplyScalar(r.modalScale);
      u.form.position.x-=r.contentShift*.12;
    }

    if(u.modalHeader&&u.modal){
      u.modalHeader.scale.x=1;
      u.modal.scale.x=1;
    }
  }

  _applyAdaptiveCustomerComposition(p){
    if(
      p<.44||
      p>=1.535||
      !this.appTour?.userData
    )return;

    const u=this.appTour.userData;
    const r=this.responsive;
    const adaptive=clamp(
      (r.sidebarCollapse-.08)/.72
    );

    const stage=this._crmStage(p);
    const formPresence=
      stage.formOpen*(1-stage.formClose);
    const clientsOut=
      1-mix(p,.965,1.015);

    // Only Clients has a dedicated compact composition. Before that point
    // the normal dashboard remains intact, preventing an empty mobile frame.
    const clientPhase=stage.clientsIn;
    const compactA=
      adaptive*
      clientPhase*
      (1-formPresence)*
      clientsOut;

    const desktopClientA=
      clientPhase*
      (1-adaptive)*
      (1-formPresence)*
      clientsOut;

    if(u.customers){
      nodeOpacity(
        u.customers,
        Math.max(
          desktopClientA,
          stage.clientsReturn*(1-adaptive)*clientsOut
        )
      );
    }

    if(u.tableHead){
      nodeOpacity(
        u.tableHead,
        Math.max(
          desktopClientA,
          stage.clientsReturn*(1-adaptive)*clientsOut
        )
      );
    }

    if(u.customersCompact){
      nodeOpacity(
        u.customersCompact,
        Math.max(
          compactA,
          stage.clientsReturn*adaptive*clientsOut
        )
      );

      // Keep the compact list centered in its own design space.
      u.customersCompact.position.set(
        0,
        -.12,
        .16
      );
      u.customersCompact.scale.setScalar(
        lerp(.97,1,adaptive)
      );
    }

    const rowIn=[
      mix(p,.580,.598),
      mix(p,.590,.608),
      mix(p,.600,.618),
      mix(p,.610,.628),
      mix(p,.620,.638),
      mix(p,.630,.648)
    ];

    (u.compactRows||[]).forEach((row,i)=>{
      const a=
        Math.max(
          rowIn[i]*(1-formPresence),
          stage.clientsReturn
        )*adaptive*clientsOut;

      nodeOpacity(row,a);

      const baseY=1.82-i*.72;
      const shiftedY=baseY-.72*stage.newRowIn;

      row.position.set(
        0,
        lerp(baseY,shiftedY,stage.newRowIn),
        lerp(-.05,.03,rowIn[i])
      );
      row.scale.setScalar(
        lerp(.965,1,rowIn[i])
      );
    });

    if(u.compactNewRow){
      const a=
        stage.newRowIn*adaptive*clientsOut;
      nodeOpacity(u.compactNewRow,a);
      u.compactNewRow.position.set(
        0,
        1.82,
        lerp(.34,.12,stage.newRowIn)
      );
      u.compactNewRow.scale.setScalar(
        stage.settleNewRow>.001
        ? lerp(1.035,1,stage.settleNewRow)
        : lerp(.78,1.035,stage.newRowIn)
      );
    }

    // The desktop toolbar/sidebar progressively ceases to be the mobile
    // navigation. The compact header becomes the local navigation surface.
    if(u.subheader){
      nodeOpacity(
        u.subheader,
        1-adaptive*clientPhase
      );
    }

    if(u.sidebar){
      nodeOpacity(
        u.sidebar,
        1-adaptive*.94
      );
    }
    if(u.sideBorder){
      nodeOpacity(
        u.sideBorder,
        1-adaptive
      );
    }
    if(u.sidebarTitle){
      nodeOpacity(
        u.sidebarTitle,
        1-adaptive
      );
    }

    (u.navMeshes||[]).forEach(n=>{
      nodeOpacity(
        n.holder,
        1-adaptive*.92
      );
    });

    if(u.cargos){
      nodeOpacity(
        u.cargos,
        1-adaptive*.92
      );
    }

    // Header metadata is useful in landscape but competes with the product
    // itself in a narrow viewport.
    if(u.headerDetails){
      nodeOpacity(
        u.headerDetails,
        1-adaptive*.82
      );
    }

    // The modal remains the same workflow but is physically recentered in
    // the compact world instead of inheriting the desktop content offset.
    if(u.form?.visible&&formPresence>.001){
      const targetLocalX=
        -(u.contentRoot?.position?.x||0);

      u.form.position.x=lerp(
        u.form.position.x,
        targetLocalX,
        adaptive*formPresence
      );

      u.form.position.y=lerp(
        u.form.position.y,
        .05,
        adaptive*formPresence
      );

      // Counteract contentRoot enlargement from desktop reflow. The outer
      // appTour scale already fits the modal to the physical viewport.
      const parentScale=
        u.contentRoot?.scale?.x||1;

      const compensation=
        parentScale>0
        ? 1/parentScale
        : 1;

      u.form.scale.multiplyScalar(
        lerp(
          1,
          compensation,
          adaptive*formPresence
        )
      );
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
    const targetTextIn=
      mix(p,.405,.445)*
      mix(mix(p,.265,.405),.86,1.0);

    if(this.sourceWord){
      const rawW=Math.max(.001,this.sourceWord.userData.width||1);
      const rawH=Math.max(.001,this.sourceWord.userData.height||1);
      const landScale=Math.min(.92,3.10/rawW);
      const portScale=Math.min(.66,3.05/rawW);
      const landW=rawW*landScale;
      const portH=rawH*portScale;
      const landX=lerp(.42,1.0+.30+landW/2,wordIn);
      const portY=-1.0-.24-portH/2;

      this.sourceWord.scale.setScalar(
        lerp(landScale,portScale,t)
      );
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

      this.targetWord.scale.setScalar(
        lerp(landScale,portScale,t)
      );
      this.targetWord.position.set(
        lerp(landX,0,t),
        lerp(-.01,portY,t),
        lerp(-.20,0,targetTextIn)
      );
    }

    if(this.textReady&&this.slogans){
      this.slogans.forEach(item=>{
        const rawW=
          Math.max(.001,item.children?.[0]?.userData?.width||1);
        const landScale=Math.min(.80,3.20/rawW);
        const portScale=Math.min(.52,3.20/rawW);
        const portW=rawW*portScale;

        item.scale.setScalar(
          lerp(landScale,portScale,t)
        );
        item.position.x=lerp(-4.25,-portW/2,t);
        item.position.y=lerp(.05,2.38,t);
        item.rotation.y=lerp(.012,0,t);
      });
    }

    if(this.lead){
      const rawW=
        Math.max(.001,this.lead.children?.[0]?.userData?.width||1);
      const landScale=Math.min(.74,3.15/rawW);
      const portScale=Math.min(.48,3.20/rawW);
      const portW=rawW*portScale;

      this.lead.scale.setScalar(
        lerp(landScale,portScale,t)
      );
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
      const halfMark=
        (this.deskSystemR22?.userData?.halfWidth||1.08)*
        markScale;
      const wordW=
        (this.deskWordR22.userData.width||1)*
        wordScale;
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
    this.deskSystemR22.scale.setScalar(
      lerp(baseScale,zoomScale,zoom)
    );
    this.deskSystemR22.rotation.set(0,0,0);

    updateTGDeskSystemR22(
      this.deskSystemR22,
      {alpha:1,flow,motion:1,phase}
    );

    const copyAlpha=Math.max(1-copyOut,close);
    this._setDeskCopy(copyAlpha,p);

    const screenIn=mix(p,2.56,2.69);
    const screenOut=mix(p,3.70,3.79);
    const screenAlpha=screenIn*(1-screenOut);
    const openAperture=
      lerp(.035,lerp(1.18,1.08,t),enter);
    const aperture=lerp(openAperture,.035,close);
    const warp=lerp(.115,0,enter)+close*.08;

    updateTGDeskPreview(
      this.tgdeskPreviewR30,
      {
        p,
        alpha:screenAlpha,
        aperture,
        aspect:Math.max(.35,r.aspect),
        warp,
        width:this.viewW*1.015,
        height:this.viewH*1.015
      }
    );

    if(this.continuity&&p>2.71&&p<3.68){
      this.continuity.visible=false;
    }

    if(close>.998){
      hideTGDeskPreview(this.tgdeskPreviewR30);
      this.deskSystemR22.position.set(0,.20*t,.32);
      this.deskSystemR22.scale.setScalar(baseScale);

      updateTGDeskSystemR22(
        this.deskSystemR22,
        {alpha:1,flow,motion:1,phase}
      );

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

    const p=state.p||0;

    this._applyCRMInternalReflow(p);
    this._applyAdaptiveCustomerComposition(p);
    this._applyFluidHero(state);
    this._applyFluidTGDeskIdentity(p);

    // Re-sample the infinite CRM continuation after internal reflow, otherwise
    // the blur could describe the pre-responsive shell for one frame.
    if(
      p>=.44&&
      p<1.535&&
      this.appTour?.visible
    ){
      this.renderer.render(this.scene,this.camera);
      this._captureCRMInfiniteBleed?.();
    }

    this.renderer.render(this.scene,this.camera);
  }
}
