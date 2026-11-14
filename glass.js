/* Liquid glass — approximates Figma's GLASS effect (refraction / depth / light / dispersion / frost)
   with an SVG displacement filter used as backdrop-filter (Chromium). Other browsers: frost blur only. */
(function(){
const NS='http://www.w3.org/2000/svg';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';svg.setAttribute('aria-hidden','true');
document.body.appendChild(svg);
const chromium=/Chrom(e|ium)\//.test(navigator.userAgent)&&CSS.supports('backdrop-filter','blur(1px)');
let uid=0;
const GK=Object.assign({cap:999,kb:.6,kd:.2,ks:.6,prof:'circ',kdisp:0,sat:1,br:1,pre:0,kl:.6,rw:.6,ksp:1.4,ro:1,edge:.6},window.GK||{});window.GK=GK;

/* displacement map over (W x H) canvas; rounded rect of size w x h at offset P, convex bezel width b.
   R/G encode where each pixel samples from (inward near the rim = bent edge). */
function mapURL(W,H,P,w,h,r,b,prof){const c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d'),im=g.createImageData(W,H),D=im.data,cx=P+w/2,cy=P+h/2,hx=w/2,hy=h/2;r=Math.min(r,hx,hy);
  const sdf=(x,y)=>{const qx=Math.abs(x-cx)-(hx-r),qy=Math.abs(y-cy)-(hy-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const px=x+.5,py=y+.5,d=-sdf(px,py);let dx=0,dy=0;
    if(d>-1&&d<b){const nx=sdf(px+.5,py)-sdf(px-.5,py),ny=sdf(px,py+.5)-sdf(px,py-.5),L=Math.hypot(nx,ny)||1,t=Math.min(1,1-d/b),m=prof(t);dx=-nx/L*m;dy=-ny/L*m;}
    const i=(y*W+x)*4;D[i]=Math.round(128+dx*127);D[i+1]=Math.round(128+dy*127);D[i+2]=128;D[i+3]=255;}
  g.putImageData(im,0,0);return c.toDataURL();}
const PROF={circ:t=>1-Math.sqrt(Math.max(0,1-t*t)),sq:t=>t*t,cube:t=>t*t*t,lin:t=>t};

function layer(el){let L=el._gl;if(!L){L=document.createElement('i');L.className='lg-l';L.setAttribute('aria-hidden','true');
    const R=document.createElement('i');R.className='lg-r';R.setAttribute('aria-hidden','true');el.prepend(R);el.prepend(L);el._gl=L;el._gr=R;
    const cs=getComputedStyle(el);if(cs.position==='static')el.style.position='relative';if(cs.zIndex==='auto')el.style.zIndex='0';}
  return L;}
function build(el,o){const w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)return;
  const key=w+'x'+h;if(el._gk===key)return;el._gk=key;
  const rad=Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius)||0,h/2,w/2);
  const fr=Math.min(o.blur,GK.cap)*GK.kb,P=Math.ceil(Math.max(12,fr*3)),W=Math.round(w+2*P),H=Math.round(h+2*P);
  const bez=Math.max(1,Math.min(o.depth*GK.kd,h/2,w/2)),S=o.refraction*o.depth*GK.ks,dsp=Math.min(.5,o.dispersion*GK.kdisp);
  const L=layer(el),Rm=el._gr;
  L.style.cssText=`position:absolute;left:${-P}px;top:${-P}px;width:${W}px;height:${H}px;z-index:-1;pointer-events:none;clip-path:inset(${P}px round ${rad}px);`;
  Rm.style.cssText=`position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:${rad}px;`;
  let f=el._gf;if(!f){f=document.createElementNS(NS,'filter');f.id='lg'+(++uid);svg.appendChild(f);el._gf=f;}
  f.setAttribute('x','0');f.setAttribute('y','0');f.setAttribute('width',W);f.setAttribute('height',H);f.setAttribute('filterUnits','userSpaceOnUse');f.setAttribute('color-interpolation-filters','sRGB');
  const url=mapURL(W,H,P,w,h,rad,bez,PROF[GK.prof]||PROF.circ);
  const ch=(k,s)=>`<feDisplacementMap in="SourceGraphic" in2="m" scale="${s.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="d${k}"/>
    <feColorMatrix in="d${k}" type="matrix" values="${k==='r'?'1 0 0 0 0':'0 0 0 0 0'} ${k==='g'?'0 1 0 0 0':'0 0 0 0 0'} ${k==='b'?'0 0 1 0 0':'0 0 0 0 0'} 0 0 0 1 0" result="c${k}"/>`;
  f.innerHTML=`<feImage href="${url}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="m"/>`+
    (dsp>.001?ch('r',S*(1+dsp))+ch('g',S)+ch('b',S*(1-dsp))+`<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/>`
             :`<feDisplacementMap in="SourceGraphic" in2="m" scale="${S.toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>`);
  const pre=`blur(${(fr*GK.pre).toFixed(2)}px)`,frost=`blur(${fr.toFixed(2)}px)`;
  const bf=chromium&&!GK.nourl?`${GK.pre?pre+' ':''}url(#${f.id}) ${frost} saturate(${GK.sat}) brightness(${GK.br})`:`${frost} saturate(${GK.sat}) brightness(${GK.br})`;
  L.style.backdropFilter=bf;L.style.webkitBackdropFilter=frost;
  light(el,o);}

function light(el,o){/* specular rim: light from lightAngle (Figma -45deg = top-left), intensity, splay = spread */
  const R=el._gr;if(!R)return;const a=o.angle*Math.PI/180,x=Math.cos(a+Math.PI),y=Math.sin(a+Math.PI),k=o.intensity*GK.kl,sp=(GK.rw+o.splay*GK.ksp);
  R.style.boxShadow=`inset ${(-x*GK.ro).toFixed(2)}px ${(y*GK.ro).toFixed(2)}px ${sp.toFixed(2)}px rgba(255,255,255,${Math.min(1,.9*k).toFixed(2)}),`+
    `inset ${(x*GK.ro).toFixed(2)}px ${(-y*GK.ro).toFixed(2)}px ${sp.toFixed(2)}px rgba(255,255,255,${Math.min(1,.55*k).toFixed(2)}),`+
    `inset 0 0 0 ${GK.edge}px rgba(255,255,255,${Math.min(1,.35*k).toFixed(2)})`;}

const ro=new ResizeObserver(es=>es.forEach(e=>e.target._go&&build(e.target,e.target._go)));
const mo=new MutationObserver(ms=>ms.forEach(m=>{const el=m.target;if(el._go&&el._gl&&!el.contains(el._gl)){el.prepend(el._gr);el.prepend(el._gl);}}));
function glass(el,o){if(!el)return;el._go=o;el._gk=null;el.classList.add('lglass');build(el,o);ro.observe(el);if(!el._gmo){el._gmo=1;mo.observe(el,{childList:true});}}
function unglass(el){if(!el)return;el._go=null;el._gk=null;if(el._gl){el._gl.remove();el._gr.remove();el._gl=el._gr=null;}}
window.pinchUnglass=unglass;
window.pinchGlass=glass;

/* Figma values (282:93 / 282:579 / 341:366 / 341:368) */
const PILL={blur:7.153,refraction:.27,depth:46.17,angle:-45,intensity:.7,dispersion:.06,splay:.72};
const BAR={blur:8.621,refraction:.27,depth:55.64,angle:-45,intensity:.7,dispersion:.06,splay:.72};
const TAB={blur:55,refraction:1,depth:1,angle:-45,intensity:.25,dispersion:1,splay:0};
['fillBtn','placeBtn'].forEach(id=>glass(document.getElementById(id),PILL));
glass(document.querySelector('.modes.gp'),PILL);
const pm=document.getElementById('pmenu');if(pm)glass(pm,BAR);
glass(document.querySelector('.fp-tab'),BAR);
function tabs(){document.querySelectorAll('.fp-tabs button').forEach(b=>{unglass(b);b.style.boxShadow=b.classList.contains('on')?'inset 0.85px 0.85px 1.2px rgba(255,255,255,.55),inset -0.85px -0.85px 1.2px rgba(255,255,255,.3),inset 0 0 0 .6px rgba(255,255,255,.25)':'';});}
window.pinchTabsGlass=tabs;tabs();
/* menu opens with display:none → size known only when shown */
if(pm)new MutationObserver(()=>{if(pm.classList.contains('on')){pm._gk=null;build(pm,BAR);}}).observe(pm,{attributes:true,attributeFilter:['class']});
})();
