const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);
const range=(v,a,b)=>smooth(clamp((v-a)/(b-a)));
const lerp=(a,b,t)=>a+(b-a)*t;

function capabilityFactor(){
  const mem=Number(globalThis.navigator?.deviceMemory||4);
  const cores=Number(globalThis.navigator?.hardwareConcurrency||4);
  const memF=clamp((mem-2)/6);
  const coreF=clamp((cores-2)/10);
  return .45+.55*(memF*.55+coreF*.45);
}

export function getResponsiveProfile(width,height){
  const w=Math.max(1,Number(width)||1);
  const h=Math.max(1,Number(height)||1);
  const aspect=w/h;

  // One continuous composition axis. Landscape, square, tablet and portrait
  // are samples of the same world instead of separate layouts.
  const vertical=smooth(clamp((1.48-aspect)/.94));
  const narrow=range(vertical,.18,.92);
  const wide=range(aspect,1.72,2.55);
  const compact=1-range(w,480,1280);
  const tall=range(h/w,1.10,2.20);
  const square=1-clamp(Math.abs(aspect-1)/.58);

  const capability=capabilityFactor();
  const deviceDpr=Math.max(1,globalThis.devicePixelRatio||1);
  const cssPixels=w*h;
  const budgetBase=lerp(4_100_000,7_200_000,capability);
  const orientationCost=lerp(1,.82,vertical*.75+compact*.25);
  const pixelBudget=budgetBase*orientationCost;
  const budgetDpr=Math.sqrt(pixelBudget/Math.max(1,cssPixels));
  const maxDpr=lerp(1.70,2.25,capability)*(1-.12*compact);
  const dpr=clamp(Math.min(deviceDpr,maxDpr,budgetDpr),1,2.25);

  const cameraFov=34-2.4*vertical+1.15*wide+.35*square;
  const cameraZ=10+2.45*vertical+.34*wide;

  const crmZoom=1+vertical*(.95+.28*compact)+tall*.12;
  const crmFocusX=vertical*(.70+.14*compact);
  const crmFocusY=vertical*.028;

  return {
    width:w,
    height:h,
    aspect,
    vertical,
    narrow,
    wide,
    compact,
    tall,
    square,
    capability,
    dpr,
    cameraFov,
    cameraZ,
    crmZoom,
    crmFocusX,
    crmFocusY,
    compatibilityPortrait:vertical>.52,
    particleDensity:lerp(.70,1,capability)*(1-.20*vertical-.08*compact),
    heroScale:lerp(1,.75,vertical),
    scrollCueY:lerp(-2.58,-4.45,vertical),
    scrollCueScale:lerp(.72,.77,vertical),
    sidebarCollapse:narrow,
    contentShift:.78*narrow,
    contentScale:1+.035*narrow,
    headerCompression:.55*narrow,
    modalScale:lerp(1,.98,narrow),
    searchCompression:.18*narrow
  };
}

export { clamp, smooth, range, lerp };
