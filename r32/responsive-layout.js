const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const range=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;

export function getResponsiveProfile(width,height){
  const w=Math.max(1,width||1);
  const h=Math.max(1,height||1);
  const aspect=w/h;

  // Continuous composition axis. No "mobile layout" switch: the world morphs
  // from wide landscape to tall portrait as the available rectangle changes.
  const vertical=smooth(clamp((1.42-aspect)/.86));
  const wide=range(aspect,1.72,2.42);
  const compact=1-range(w,520,1180);
  const tall=range(h/w,1.15,2.05);

  const deviceDpr=Math.max(1,globalThis.devicePixelRatio||1);
  const cssPixels=w*h;
  const pixelBudget=vertical>.55 ? 3_200_000 : 5_200_000;
  const budgetDpr=Math.sqrt(pixelBudget/Math.max(1,cssPixels));
  const maxDpr=lerp(1.95,1.62,Math.max(vertical,compact*.65));
  const dpr=clamp(Math.min(deviceDpr,maxDpr,budgetDpr),1,2);

  // Camera is also fluid. Orientation changes do not jump between two presets.
  const cameraFov=34-2.2*vertical+1.0*wide;
  const cameraZ=10+2.35*vertical+.30*wide;

  // CRM is intentionally reframed in tall viewports. "contain" would turn the
  // complete desktop interface into an unreadable thumbnail.
  const crmZoom=1+vertical*(.74+.18*compact)+tall*.08;
  const crmFocusX=vertical*(.78+.10*compact);
  const crmFocusY=vertical*.035;

  return {
    width:w,
    height:h,
    aspect,
    vertical,
    wide,
    compact,
    tall,
    dpr,
    cameraFov,
    cameraZ,
    crmZoom,
    crmFocusX,
    crmFocusY,
    compatibilityPortrait:vertical>.52,
    particleDensity:lerp(1,.62,Math.max(vertical*.75,compact*.45)),
    heroScale:lerp(1,.74,vertical),
    scrollCueY:lerp(-2.58,-4.50,vertical),
    scrollCueScale:lerp(.72,.76,vertical)
  };
}

export { clamp, smooth, range, lerp };
