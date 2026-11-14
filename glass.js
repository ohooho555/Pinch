/* Liquid glass — approximates Figma's GLASS effect (refraction / depth / light / dispersion / frost)
   with an SVG displacement filter used as backdrop-filter (Chromium). Other browsers: frost blur only. */
(function(){
const NS='http://www.w3.org/2000/svg';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';svg.setAttribute('aria-hidden','true');
document.body.appendChild(svg);
const chromium=!!window.chrome&&CSS.supports('backdrop-filter','url(#x)');
let uid=0;

/* displacement map: rounded rect, convex bezel of width b; R/G encode the inward sampling offset */
function mapURL(w,h,r,b){const W=Math.max(2,Math.round(w)),H=Math.max(2,Math.round(h)),c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d'),im=g.createImageData(W,H),D=im.data,hx=W/2,hy=H/2;r=Math.min(r,hx,hy);
  const sdf=(x,y)=>{const qx=Math.abs(x-hx)-(hx-r),qy=Math.abs(y-hy)-(hy-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const px=x+.5,py=y+.5,d=-sdf(px,py);let dx=0,dy=0;
    if(d>0&&d<b){const nx=sdf(px+.5,py)-sdf(px-.5,py),ny=sdf(px,py+.5)-sdf(px,py-.5),L=Math.hypot(nx,ny)||1,t=1-d/b,m=1-Math.sqrt(Math.max(0,1-t*t));dx=-nx/L*m;dy=-ny/L*m;}
    const i=(y*W+x)*4;D[i]=Math.round(128+dx*127);D[i+1]=Math.round(128+dy*127);D[i+2]=128;D[i+3]=255;}
  g.putImageData(im,0,0);return c.toDataURL();}

function build(el,o){const r=el.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)return;
  const key=w+'x'+h;if(el._gk===key)return;el._gk=key;
  const rad=Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius)||0,h/2,w/2);
  const bez=Math.max(1,Math.min(o.depth*.32,h/2-1,w/2-1)),S=o.refraction*o.depth*1.1,dsp=o.dispersion*2.2;
  let f=el._gf;if(!f){f=document.createElementNS(NS,'filter');f.id='lg'+(++uid);svg.appendChild(f);el._gf=f;}
  f.setAttribute('x','0');f.setAttribute('y','0');f.setAttribute('width',w);f.setAttribute('height',h);f.setAttribute('filterUnits','userSpaceOnUse');f.setAttribute('color-interpolation-filters','sRGB');
  const url=mapURL(w,h,rad,bez);
  const ch=(k,s)=>`<feDisplacementMap in="SourceGraphic" in2="m" scale="${s.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="d${k}"/>
    <feColorMatrix in="d${k}" type="matrix" values="${k==='r'?'1 0 0 0 0':'0 0 0 0 0'} ${k==='g'?'0 1 0 0 0':'0 0 0 0 0'} ${k==='b'?'0 0 1 0 0':'0 0 0 0 0'} 0 0 0 1 0" result="c${k}"/>`;
  f.innerHTML=`<feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>`+
    ch('r',S*(1+dsp))+ch('g',S)+ch('b',S*(1-dsp))+`<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/>`;
  const frost=`blur(${(o.blur/2).toFixed(2)}px)`;
  const bf=chromium?`url(#${f.id}) ${frost} saturate(1.15)`:`${frost} saturate(1.15)`;
  el.style.backdropFilter=bf;el.style.webkitBackdropFilter=frost;}

function light(el,o){/* specular rim, light from lightAngle (deg, Figma: -45 = top-left) */
  const a=o.angle*Math.PI/180,x=Math.cos(a+Math.PI),y=Math.sin(a+Math.PI),k=o.intensity,sp=1+o.splay*1.5;
  el.style.boxShadow=`inset ${(-x*1.2).toFixed(2)}px ${(y*1.2).toFixed(2)}px ${sp.toFixed(1)}px rgba(255,255,255,${(.85*k).toFixed(2)}),inset ${(x*1).toFixed(2)}px ${(-y*1).toFixed(2)}px ${sp.toFixed(1)}px rgba(255,255,255,${(.35*k).toFixed(2)}),inset 0 0 ${(4+o.splay*6).toFixed(1)}px rgba(255,255,255,${(.18*k).toFixed(2)})`;}

const ro=new ResizeObserver(es=>es.forEach(e=>e.target._go&&build(e.target,e.target._go)));
function glass(el,o){if(!el)return;el._go=o;el.classList.add('lglass');light(el,o);build(el,o);ro.observe(el);}
window.pinchGlass=glass;

/* Figma values (282:93 / 282:579 / 341:366 / 341:368) */
const PILL={blur:7.153,refraction:.27,depth:46.17,angle:-45,intensity:.7,dispersion:.06,splay:.72};
const BAR={blur:8.621,refraction:.27,depth:55.64,angle:-45,intensity:.7,dispersion:.06,splay:.72};
const TAB={blur:55,refraction:1,depth:1,angle:-45,intensity:.25,dispersion:1,splay:0};
['fillBtn','placeBtn'].forEach(id=>glass(document.getElementById(id),PILL));
glass(document.querySelector('.modes.gp'),PILL);
glass(document.getElementById('pmenu'),BAR);
glass(document.querySelector('.fp-tab'),BAR);
function tabs(){document.querySelectorAll('.fp-tabs button').forEach(b=>{if(b.classList.contains('on'))glass(b,TAB);else{b.style.backdropFilter='';b.style.boxShadow='';}});}
tabs();
/* menu opens with display:none → size known only when shown */
new MutationObserver(()=>{const m=document.getElementById('pmenu');if(m.classList.contains('on')){m._gk=null;build(m,BAR);}}).observe(document.getElementById('pmenu'),{attributes:true,attributeFilter:['class']});
})();
