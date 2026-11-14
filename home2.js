/* ?home2 — Figma Home flow test build. Loaded after the main script; overrides renderApp/develop. */
(function(){
const fp=$('fp');document.body.classList.add('h2');
const EN={beach:{breakwater:'Crashing waves',shore:'Basalt shore',pebbles:'Rolling pebbles',gulls:'Seagulls',boat:'Fishing boat',grass:'Sea breeze grass'},
  park:{magpie:'Magpie',bike:'Bike',pigeons:'Pigeons',sprinkler:'Sprinkler',sparrows:'Sparrows',fountain:'Fountain',traffic:'Distant traffic',trees:'Rustling leaves'},
  camp:{stream:'Mountain stream',frog:'Frog',cicada:'Cicada',birds:'Birdsong',woodpecker:'Woodpecker',fire:'Campfire',kettle:'Boiling kettle',leaves:'Rustling leaves'},
  city:{signal:'Crosswalk beep',bike:'Bike on wet road',car:'Car on wet road',drain:'Rain drain'}};
const enName=s=>{const d=domOf(s);return d?((EN[s.sc]||{})[d.id]||d.name):'Ambience';};
const ymd=t=>{const d=new Date(t);return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');};
const rollTxt=()=>'ROLL '+String(state.roll).padStart(2,'0');
const MIC='<svg viewBox="0 0 5 7" fill="none"><path d="M3.08077 0L4.14321 1.06244V3.08077L2.66349 4.56049V5.44832L1.60106 6.51076H0.766494L0 5.74427V5.03104H0.591888V5.50159L1.00917 5.91887H1.35838L2.07161 5.20565V4.31782L3.55133 2.8381V1.30511L2.8381 0.591887H1.30511L0.591888 1.30511V2.05977H0V1.06244L1.06244 0H3.08077Z" fill="#1E2937"/><path d="M2.49075 1.18359L2.9613 1.65414V2.36737H2.36941V1.89682L2.24808 1.77548H1.89886L1.77753 1.89682V3.55114H1.30697L1.18564 3.67248V4.02169L1.30697 4.14303H1.48158V4.73492H1.0643L0.59375 4.26437V3.42981L1.0643 2.95926H1.18564V1.65414L1.65619 1.18359H2.49075Z" fill="#1E2937"/></svg>';

/* new device image if present */
const ni=new Image();ni.onload=()=>{document.body.classList.add('newdev');fp.querySelector('.fp-dev').src=ni.src;const o=document.querySelector('#h2Onb img');if(o)o.src=ni.src;};
fp.querySelector('.fp-ready').textContent='기록할 준비가 되었어요.';

/* ---- bottom sheet ---- */
const dim=document.createElement('div');dim.className='h2-dim';fp.insertBefore(dim,fp.querySelector('.fp-tab'));
const sh=document.createElement('div');sh.className='h2-sh';sh.innerHTML='<div class="bg"></div><div class="h2-stack h2-x" id="h2Stack"></div><div class="grab"></div><p class="h2-lb h2-x">기록 시작일</p><p class="h2-dt h2-x" id="h2Dt"></p><p class="h2-cap h2-x">롤을 모두 채우면 기록을 확인할 수 있어요.</p>';
['rollNo','fpN','fpBars','dev'].forEach(id=>{const e=$(id);sh.appendChild(id==='fpN'?e.parentNode:e);});
fp.insertBefore(sh,dim.nextSibling);
const CARDS=[[156.86,255.97,0],[160.09,252.5,1.75],[148.66,248.42,0],[139.2,255.5,-6.68],[171.8,262.86,2.18],[153.27,270.42,0]];
function setOpen(o){sh.classList.toggle('open',o);dim.classList.toggle('on',o);sh.style.transform='';}
dim.addEventListener('click',()=>setOpen(false));
(function(){let y0=null,base=0,moved=false;const g=sh.querySelector('.grab');
  const start=e=>{y0=e.clientY;base=sh.classList.contains('open')?-256:0;moved=false;sh.classList.add('drag');g.setPointerCapture(e.pointerId);};
  g.addEventListener('pointerdown',start);
  g.addEventListener('pointermove',e=>{if(y0===null)return;const dy=e.clientY-y0;if(Math.abs(dy)>4)moved=true;const k=fp.getBoundingClientRect().height/668||1;
    sh.style.transform=`translateY(${Math.max(-256,Math.min(0,base+dy/k))}px)`;dim.style.opacity=String(-Math.max(-256,Math.min(0,base+dy/k))/256);});
  g.addEventListener('pointerup',e=>{if(y0===null)return;sh.classList.remove('drag');dim.style.opacity='';const dy=e.clientY-y0;y0=null;
    if(!moved)setOpen(!sh.classList.contains('open'));else setOpen(base===0?dy<-40:dy<40);});
})();

/* ---- screens ---- */
function scr(id,html){const d=document.createElement('div');d.className='h2-scr';d.id=id;d.innerHTML=html;fp.insertBefore(d,fp.querySelector('.fp-status'));return d;}
const onb=scr('h2Onb','<p class="t">Find my Pinch 01<i id="h2Dots">..</i></p><img src="'+fp.querySelector('.fp-dev').getAttribute('src')+'" alt="">');
const R=76.75,CIRC=2*Math.PI*R;
const load=scr('h2Load',`<p class="r" id="h2LR"></p><p class="h">현상 중...</p><svg viewBox="0 0 171 171"><circle cx="85.5" cy="85.5" r="${R}" fill="none" stroke="#d9dce4" stroke-width="17.5"/><circle id="h2Arc" cx="85.5" cy="85.5" r="${R}" fill="none" stroke="#f95e63" stroke-width="17.5" stroke-dasharray="0 ${CIRC}" transform="rotate(-90 85.5 85.5)"/><circle cx="85.5" cy="85.5" r="68" fill="#fff"/></svg><div class="p"><b id="h2P">0</b><small>%</small></div><p class="c">${MAX}개의 소리와 장면을 꺼내고 있어요.</p>`);
const rec=scr('h2Rec',`<div class="sc"><div class="in"><p id="h2RN"></p><p id="h2RD"></p></div><div class="gr" id="h2Gr"></div></div><div class="hd"></div>
<button class="bk" id="h2Bk" aria-label="뒤로"><svg viewBox="0 0 35 35" fill="none"><path d="M25.4727 17.2417H10.582L17.2437 10.5801" stroke="#525252" stroke-width="1.56744"/></svg></button>
<p class="tt" id="h2RT"></p><svg class="mr" viewBox="0 0 20 20" fill="none"><path d="M10.8331 15.1919C10.8331 14.8334 10.5425 14.5429 10.1841 14.5429C9.82571 14.5429 9.53516 14.8334 9.53516 15.1919C9.53516 15.5503 9.82571 15.8408 10.1841 15.8408C10.5425 15.8408 10.8331 15.5503 10.8331 15.1919Z" fill="#525252" stroke="#525252"/><path d="M10.8331 9.99948C10.8331 9.64107 10.5425 9.35052 10.1841 9.35052C9.82571 9.35052 9.53516 9.64107 9.53516 9.99948C9.53516 10.3579 9.82571 10.6484 10.1841 10.6484C10.5425 10.6484 10.8331 10.3579 10.8331 9.99948Z" fill="#525252" stroke="#525252"/><path d="M10.8331 4.80807C10.8331 4.44966 10.5425 4.15911 10.1841 4.15911C9.82571 4.15911 9.53516 4.44966 9.53516 4.80807C9.53516 5.16648 9.82571 5.45703 10.1841 5.45703C10.5425 5.45703 10.8331 5.16648 10.8331 4.80807Z" fill="#525252" stroke="#525252"/></svg>
<button class="nf" id="h2New">새 필름 넣기</button>`);
const show=(el,on)=>el.classList.toggle('on',on);

let paired=false,onbT=0;
function runOnb(){paired=true;show(onb,true);let k=0;const dots=$('h2Dots');const iv=setInterval(()=>{k=(k+1)%3;dots.textContent='.'.repeat(k+1);},400);
  onbT=setTimeout(()=>{clearInterval(iv);show(onb,false);},2400);}

let recOpen=false;
function renderRec(){const n=state.shots.length;$('h2RT').textContent=rollTxt();$('h2RN').textContent=n+'개의 순간';
  $('h2RD').textContent=n?ymd(state.shots[0].t)+' - '+ymd(state.shots[n-1].t):'';
  $('h2Gr').innerHTML=state.shots.map((s,i)=>`<div class="k" data-i="${i}">${thumb(s,i)}<div class="m"><span class="nm">${enName(s)}</span><span class="du">${MIC}00:03</span></div></div>`).join('');
  $('h2Gr').querySelectorAll('.k').forEach(k=>k.addEventListener('click',()=>{rec.querySelectorAll('.k.on').forEach(x=>x.classList.remove('on'));k.classList.add('on');
    playShot(+k.dataset.i,document.createElement('i'));clearTimeout(k._t);k._t=setTimeout(()=>k.classList.remove('on'),3000);}));}
$('h2Bk').addEventListener('click',()=>{recOpen=false;if(playing)playing();show(rec,false);renderApp();});
$('h2New').addEventListener('click',()=>{if(playing)playing();state={roll:state.roll+1,shots:[],developed:false};save();renderCounter();recOpen=false;show(rec,false);setOpen(false);renderApp();toast('새 필름을 넣었어요 · 다시 밖으로 나가볼까요?');});
function openRec(){recOpen=true;renderRec();rec.querySelector('.sc').scrollTop=0;show(rec,true);}

window.renderApp=renderApp=function(){
  const n=state.shots.length,full=n>=MAX;$('fpOver').classList.remove('on');
  $('rollNo').textContent=rollTxt();$('fpN').textContent=n;$('fpBars').innerHTML=Array.from({length:MAX},(_,i)=>`<i class="${i<n?'f':''}"></i>`).join('');
  const d=$('dev');d.disabled=!full;d.textContent=state.developed?'기록 보기':full?'현상하기':'현상 준비 중';
  d.onclick=!full?null:state.developed?openRec:develop;
  $('h2Dt').textContent=n?ymd(state.shots[0].t):'-';
  const last=state.shots.slice(-6);
  $('h2Stack').innerHTML=CARDS.map((c,i)=>{const s=last[i-(6-last.length)];return `<div class="cd" style="left:${c[0]}px;top:${c[1]}px;transform:rotate(${c[2]}deg)">${s?thumb(s,i):''}</div>`;}).join('');
  if(mode==='home'&&!paired)runOnb();
  if(recOpen)renderRec();
};
window.develop=develop=function(){setOpen(false);$('h2LR').textContent=rollTxt();$('h2P').textContent='0';$('h2Arc').setAttribute('stroke-dasharray',`0 ${CIRC}`);show(load,true);
  const t0=performance.now(),D=3200;(function f(t){const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,2);
    $('h2Arc').setAttribute('stroke-dasharray',`${e*CIRC} ${CIRC}`);$('h2P').textContent=Math.round(e*100);
    if(p<1)requestAnimationFrame(f);else{state.developed=true;save();renderApp();openRec();setTimeout(()=>show(load,false),60);}})(t0);};
ni.src='app_device2.webp';
if(mode==='home')renderApp();
})();
