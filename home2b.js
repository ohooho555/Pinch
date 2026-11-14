/* ?home2 — Archive / Detail / Map screens + tab switching. Needs home2.js first. */
(function(){
const fp=$('fp'),F='ui/f/';
/* ---------- names / categories / places ---------- */
const EN={beach:{breakwater:'Crashing waves',shore:'Basalt shore',pebbles:'Rolling pebbles',gulls:'Seagulls',boat:'Fishing boat',grass:'Sea breeze grass'},
  park:{magpie:'Magpie',bike:'Bike',pigeons:'Pigeons',sprinkler:'Sprinkler',sparrows:'Sparrows',fountain:'Fountain',traffic:'Distant traffic',trees:'Rustling leaves'},
  camp:{stream:'Mountain stream',frog:'Frog',cicada:'Cicada',birds:'Birdsong',woodpecker:'Woodpecker',fire:'Campfire',kettle:'Boiling kettle',leaves:'Rustling leaves'},
  city:{signal:'Crosswalk beep',bike:'Bike on wet road',car:'Car on wet road',drain:'Rain drain'}};
const CAT={gulls:'Animals',magpie:'Animals',pigeons:'Animals',sparrows:'Animals',frog:'Animals',cicada:'Animals',birds:'Animals',woodpecker:'Animals',
  grass:'Plants',trees:'Plants',leaves:'Plants',
  bike:'Human',
  breakwater:'Nature',shore:'Nature',pebbles:'Nature',stream:'Nature',drain:'Nature',
  boat:'Artifact',sprinkler:'Artifact',fountain:'Artifact',traffic:'Artifact',signal:'Artifact',car:'Artifact',
  fire:'Personal',kettle:'Personal'};
const CATS=['Favorites','Plants','Human','Nature','Personal','Artifact','Animals'];
const PLACE={beach:'Aewol Coast, Jeju',park:'Seoul Forest',camp:'Naerincheon Campsite',city:'Yeonhui-dong Crossroads'};
const p2=n=>String(n).padStart(2,'0');
const ymd=t=>{const d=new Date(t);return d.getFullYear()+'.'+p2(d.getMonth()+1)+'.'+p2(d.getDate());};
const ymdS=t=>{const d=new Date(t);return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate();};
const hm=t=>{const d=new Date(t);return p2(d.getHours())+':'+p2(d.getMinutes());};
const ampm=t=>{const d=new Date(t),h=d.getHours();return (h<12?'AM ':'PM ')+p2(h%12||12)+':'+p2(d.getMinutes());};

/* ---------- records: sample data (past) + real developed rolls ---------- */
const MOCK=[[10,3,10,12,'park','magpie'],[10,9,15,40,'camp','stream'],[10,9,16,2,'camp','fire'],[10,17,9,30,'beach','gulls'],[10,24,18,5,'city','signal'],[10,30,11,11,'park','fountain'],
  [11,1,9,14,'park','pigeons'],[11,2,13,20,'camp','woodpecker'],[11,3,8,40,'city','bike'],[11,3,9,2,'city','drain'],[11,5,12,22,'beach','breakwater'],[11,6,14,8,'beach','pebbles'],
  [11,8,7,55,'park','sparrows'],[11,9,12,22,'camp','leaves'],[11,9,17,3,'park','magpie'],[11,9,17,42,'beach','shore'],[11,10,10,10,'camp','cicada'],[11,11,16,30,'city','car'],
  [11,12,16,12,'beach','gulls'],[11,12,19,0,'camp','kettle'],[11,13,11,45,'park','bike']];
const FAV0=['m1','m4','m7','m9','m12'];
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
let ARCH=ld('pinch-arch',[]),FAV=new Set(ld('pinch-fav',FAV0));
const domSrc=s=>{const S=sceneOf(s.sc);if(!S)return null;let bi=0;s.m.forEach((v,i)=>{if(v>s.m[bi])bi=i;});return s.m[bi]>.4?S.src[bi].id:null;};
window.h2ArchiveAdd=function(){if(!state.developed||ARCH.some(r=>r.roll===state.roll))return;
  state.shots.forEach((s,i)=>ARCH.push({id:'r'+state.roll+'_'+i,roll:state.roll,sc:s.sc,src:domSrc(s),m:s.m,v:s.v,t:s.t}));sv('pinch-arch',ARCH);};
window.h2ArchiveAdd();
function records(){const m=MOCK.map((a,i)=>({id:'m'+(i+1),sc:a[4],src:a[5],t:new Date(2026,a[0]-1,a[1],a[2],a[3]).getTime()}));
  const L=m.concat(ARCH).filter(r=>sceneOf(r.sc)).sort((a,b)=>a.t-b.t),seen={};
  L.forEach(r=>{const k=r.sc+'/'+(r.src||'amb');r.vi=seen[k]=(seen[k]==null?0:seen[k]+1);});return L;}
const nameOf=r=>r.src?((EN[r.sc]||{})[r.src]||r.src):'Ambience';
const catOf=r=>r.src?(CAT[r.src]||'Personal'):'Personal';
/* 4 photos per sound (original + 3 crops of the scene around it) → least repetition */
const imgOf=r=>{const v=(r.vi||0)%4;if(!r.src)return `photos/${r.sc}/amb_${v+1}.jpg`;return `photos/${r.sc}/${r.src}${v?'_'+(v+1):''}.jpg`;};
window.h2ShotImg=(sc,src,v)=>src?`photos/${sc}/${src}${v%4?'_'+(v%4+1):''}.jpg`:`photos/${sc}/amb_${v%4+1}.jpg`;

/* running time per record: stable pseudo-random 0:12 – 3:40 */
const durSec=key=>{let h=2166136261;for(const c of String(key)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 12+((h>>>0)%209);};
const durTxt=key=>{const d=durSec(key);return p2(Math.floor(d/60))+':'+p2(d%60);};
window.h2DurTxt=durTxt;
/* ---------- playback ---------- */
let pTok=0;
function playRec(r,onEnd){if(!initAudio()){toast('이 브라우저에서는 소리를 재생할 수 없어요');return;}
  if(playing)playing();const tok=++pTok,S=sceneOf(r.sc),m=r.m||S.src.map(q=>q.id===r.src?1:.06),D=durSec(r.id);
  loadSounds(r.sc).then(bufs=>{if(tok!==pTok)return;const out=ctx.createGain(),t=ctx.currentTime,list=[];
    out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(.9,t+.3);out.gain.setValueAtTime(.9,t+D-.6);out.gain.linearRampToValueAtTime(0,t+D);out.connect(ctx.destination);
    S.src.forEach((q,k)=>{if(!bufs[q.id])return;const c=chain(bufs[q.id],out,false);c.g.gain.value=gainFor(q.lv,m[k],Math.max(.4,r.v||.7));c.src.start(t,Math.random()*2);c.src.stop(t+D+.1);list.push(c.src);});
    const tm=setTimeout(()=>{if(tok===pTok){playing=null;onEnd&&onEnd();}},D*1000);
    playing=()=>{clearTimeout(tm);list.forEach(x=>{try{x.stop();}catch(e){}});playing=null;onEnd&&onEnd();};});}
function stopAll(){pTok++;if(playing)playing();}
window.h2PlayRec=playRec;window.h2Stop=stopAll;

/* ---------- screens ---------- */
function scr(id){const d=document.createElement('div');d.className='a-scr';d.id=id;fp.insertBefore(d,fp.querySelector('.fp-tab'));return d;}
const sArc=scr('aArc'),sSub=scr('aSub'),sMap=scr('aMap'),sDet=scr('aDet');
fp.insertBefore(sDet,fp.querySelector('.fp-status'));
const on=(el,v)=>el.classList.toggle('on',v);
let tab='home',view='cal',month=new Date(2026,10,1),sub=null,det=null;
const TODAY=new Date();const MIN=new Date(2026,9,1),MAX_M=new Date(TODAY.getFullYear(),TODAY.getMonth(),1);

/* tab bar */
const TABS=['home','arch','map','my'],TI={home:['home_f','home_o'],arch:['arch_f','arch_o'],map:['map_f','map_o'],my:['my_o','my_o']};
const tbs=[...fp.querySelectorAll('.fp-tabs button')];
tbs.forEach((b,i)=>{const sv_=b.querySelector('svg');if(sv_){const im=document.createElement('img');im.alt='';sv_.replaceWith(im);}b.addEventListener('click',()=>goTab(TABS[i]));});
function paintTabs(){tbs.forEach((b,i)=>{const k=TABS[i];b.classList.toggle('on',k===tab);b.querySelector('img').src=F+TI[k][k===tab?0:1]+'.svg';});window.pinchTabsGlass&&pinchTabsGlass();}
function goTab(k){if(k==='my'){toast('마이 화면은 아직 준비 중이에요');return;}
  stopAll();tab=k;sub=null;on(sSub,false);on(sDet,false);on(sArc,k==='arch');on(sMap,k==='map');
  if(k==='arch')renderArc();if(k==='map')renderMap();paintTabs();}
window.h2GoTab=goTab;
paintTabs();

/* album = back card + 2 tilted photos + frosted glass folder (Figma GLASS r12.5, white 15%) — drawn in SVG so the blur is exact */
const FOLDER="M2.49724 32.7919L0.0316327 7.31395C-0.347732 3.39386 2.73354 0 6.67195 0H29.1952C31.1427 0 32.993 0.851017 34.2605 2.32969L37.772 6.42645C39.0394 7.90512 40.8897 8.75614 42.8372 8.75614H57.242C61.2503 8.75614 64.3537 12.2656 63.8633 16.2438L61.7609 33.2965C61.3464 36.6582 58.4787 39.1758 55.0916 39.1514L9.08957 38.8204C5.67245 38.7959 2.8264 36.1932 2.49724 32.7919Z";
function albumSVG(k,L){const id='al'+k,ph=(r,cx,cy,rot,n)=>{const w=27.519,h=38.36,x=cx-w/2,y=cy-h/2;
    return `<g transform="rotate(${rot} ${cx} ${cy})"><clipPath id="${id}c${n}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4.17"/></clipPath>`+
      (r?`<image href="${imgOf(r)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c${n})"/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4.17" fill="#b9bcc4"/>`)+
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4.17" fill="none" stroke="#fff" stroke-width=".3"/></g>`;};
  return `<svg class="alb" viewBox="0 0 65.463 58" width="65.463" height="58" aria-hidden="true"><defs>
    <clipPath id="${id}f"><path transform="translate(.674 17.93)" d="${FOLDER}"/></clipPath>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5.2"/></filter>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient></defs>
    <g id="${id}s"><rect x="3.336" y="8.34" width="58.374" height="46.699" rx="6.671" fill="#c6c6c8"/>${ph(L[0],23.95,21.52,-11.41,1)}${ph(L[1],42.04,27.7,13.51,2)}</g>
    <g clip-path="url(#${id}f)"><rect x="-5" y="10" width="76" height="52" fill="#ededf2"/><use href="#${id}s" filter="url(#${id}b)"/><path transform="translate(.674 17.93)" d="${FOLDER}" fill="#fff" fill-opacity=".15"/></g>
    <path transform="translate(.674 17.93)" d="${FOLDER}" fill="none" stroke="url(#${id}g)" stroke-width=".8"/></svg>`;}

/* ---------- archive root ---------- */
function monthRecs(y,m){return records().filter(r=>{const d=new Date(r.t);return d.getFullYear()===y&&d.getMonth()===m;});}
function renderArc(){const y=month.getFullYear(),mo=month.getMonth(),recs=monthRecs(y,mo);
  let h=`<button class="a-tg cal ${view==='cal'?'on':''}" data-v="cal"><img src="${F}${view==='cal'?'cal_on':'cal_off'}.svg" alt="캘린더"></button>
  <button class="a-tg grd ${view==='cat'?'on':''}" data-v="cat"><img src="${F}${view==='cat'?'grid_on':'grid_off'}.svg" alt="카테고리"></button>
  <button class="a-all" id="aAll">전체 기록<img src="${F}go.svg" alt=""></button>`;
  if(view==='cal'){
    h+=`<div class="a-mon"><button class="l" id="aPrev" ${month<=MIN?'disabled':''} aria-label="이전 달"></button><span>${y}.${p2(mo+1)}</span><button class="r" id="aNext" ${month>=MAX_M?'disabled':''} aria-label="다음 달"></button></div>`;
    'SMTWTFS'.split('').forEach((c,i)=>h+=`<p class="a-wd" style="left:${30+36*i}px">${c}</p>`);
    const first=new Date(y,mo,1).getDay(),days=new Date(y,mo+1,0).getDate(),by={};
    recs.forEach(r=>{const d=new Date(r.t).getDate();(by[d]=by[d]||[]).push(r);});
    for(let d=1;d<=days;d++){const k=first+d-1,c=k%7,rw=Math.floor(k/7),L=by[d]||[],td=y===TODAY.getFullYear()&&mo===TODAY.getMonth()&&d===TODAY.getDate();
      let inner='';if(L.length===1)inner=`<img class="i1" src="${imgOf(L[0])}" alt="">`;
      else if(L.length>1)inner=`<img class="ib" src="${imgOf(L[1])}" alt=""><img class="if" src="${imgOf(L[0])}" alt=""><span class="bd">${L.length}</span>`;
      else inner=d;
      h+=`<button class="a-c ${L.length?'has':''} ${td?'today':''}" data-d="${d}" style="left:${30+36*c}px;top:${197+64*rw}px" ${L.length?'':'tabindex="-1"'}>${inner}</button>`;}
    h+=`<p class="a-cap">이번 달은 ${recs.length}개의 소리를 기록했어요</p>`;
  }else{
    const all=records(),grp={};CATS.forEach(c=>grp[c]=[]);all.forEach(r=>{grp[catOf(r)].push(r);if(FAV.has(r.id))grp.Favorites.push(r);});
    const POS=[[30,158],[120.88,158],[211.75,158],[31,274],[121.46,275],[212.34,275],[30,390]];
    CATS.forEach((c,i)=>{const L=grp[c].slice(-2).reverse(),[x,yy]=POS[i];
      h+=`<button class="a-al" data-c="${c}" style="left:${x}px;top:${yy}px">${albumSVG(i,L)}<span class="nm">${c}</span><span class="ct"><img src="${F}album.svg" alt="">${grp[c].length}</span></button>`;});
    h+=`<button class="a-add" id="aAdd" style="left:121px;top:398.34px"><img src="${F}addalb.svg" alt=""><b>+</b><span>앨범 추가</span></button>`;
  }
  sArc.innerHTML=h;
  sArc.querySelectorAll('.a-tg').forEach(b=>b.onclick=()=>{view=b.dataset.v;renderArc();});
  $('aAll').onclick=()=>openSub({type:'cat',title:'All',list:()=>records()});
  if(view==='cal'){$('aPrev').onclick=()=>{month=new Date(y,mo-1,1);renderArc();};$('aNext').onclick=()=>{month=new Date(y,mo+1,1);renderArc();};
    sArc.querySelectorAll('.a-c.has').forEach(b=>b.onclick=()=>{const d=+b.dataset.d;openSub({type:'day',title:`${y}.${p2(mo+1)}.${p2(d)}`,list:()=>records().filter(r=>{const q=new Date(r.t);return q.getFullYear()===y&&q.getMonth()===mo&&q.getDate()===d;})});});}
  else{sArc.querySelectorAll('.a-al').forEach(b=>b.onclick=()=>{const c=b.dataset.c;openSub({type:'cat',title:c,list:()=>records().filter(r=>c==='Favorites'?FAV.has(r.id):catOf(r)===c)});});
    $('aAdd').onclick=()=>toast('앨범 추가는 아직 준비 중이에요');}
  glassArc();}
function glassArc(){if(!window.pinchGlass)return;const a=$('aAll');if(a)pinchGlass(a,{blur:85,refraction:.08,depth:20,angle:-45,intensity:.27,dispersion:.5,splay:0});}

/* ---------- sub: day list / category detail ---------- */
function openSub(s){stopAll();sub=s;renderSub();on(sSub,true);}
function renderSub(){const L=sub.list();let h=`<button class="a-bk" id="aSB" aria-label="뒤로"></button><p class="a-tt">${sub.title}</p>`;
  if(sub.type==='day'){
    h+=`<div class="a-ls">${L.map(r=>`<div class="a-row" data-id="${r.id}"><img class="t" src="${imgOf(r)}" alt=""><span class="n">${nameOf(r)}</span><span class="h">${ampm(r.t)}</span><span class="d"><img src="${F}mic_l.svg" alt="">${durTxt(r.id)}</span><svg class="m" viewBox="0 0 20 20" fill="none" style="transform:rotate(90deg)"><path d="M10.8331 15.1919C10.8331 14.8334 10.5425 14.5429 10.1841 14.5429C9.82571 14.5429 9.53516 14.8334 9.53516 15.1919C9.53516 15.5503 9.82571 15.8408 10.1841 15.8408C10.5425 15.8408 10.8331 15.5503 10.8331 15.1919Z" fill="#525252" stroke="#525252"/><path d="M10.8331 9.99948C10.8331 9.64107 10.5425 9.35052 10.1841 9.35052C9.82571 9.35052 9.53516 9.64107 9.53516 9.99948C9.53516 10.3579 9.82571 10.6484 10.1841 10.6484C10.5425 10.6484 10.8331 10.3579 10.8331 9.99948Z" fill="#525252" stroke="#525252"/><path d="M10.8331 4.80807C10.8331 4.44966 10.5425 4.15911 10.1841 4.15911C9.82571 4.15911 9.53516 4.44966 9.53516 4.80807C9.53516 5.16648 9.82571 5.45703 10.1841 5.45703C10.5425 5.45703 10.8331 5.16648 10.8331 4.80807Z" fill="#525252" stroke="#525252"/></svg></div>`).join('')}</div>`;
  }else{
    h+=`<button class="a-pl" id="aPA" aria-label="항목 추가"><img class="ico" src="${F}play_d.svg" alt=""></button><p class="a-cnt">${L.length}개의 항목</p><div class="a-gr">${L.slice().reverse().map(r=>`<img src="${imgOf(r)}" data-id="${r.id}" alt="${nameOf(r)}" loading="lazy">`).join('')}</div>`;
  }
  sSub.innerHTML=h;$('aSB').onclick=()=>{stopAll();on(sSub,false);sub=null;renderArc();};
  const byId=id=>L.find(r=>r.id===id);
  sSub.querySelectorAll('[data-id]').forEach(e=>e.onclick=ev=>{if(ev.target.closest('.m')){toast('더보기 메뉴는 아직 준비 중이에요');return;}openDet(byId(e.dataset.id));});
  const pa=$('aPA');if(pa){pa.onclick=()=>toast('항목 추가는 아직 준비 중이에요');window.pinchGlass&&pinchGlass(pa,{blur:3.48,refraction:.8,depth:17.39,angle:-45,intensity:.8,dispersion:.5,splay:0});}}

/* ---------- detail ---------- */
function openDet(r){if(!r)return;stopAll();det=r;
  sDet.innerHTML=`<button class="a-bk" id="aDB" aria-label="뒤로"></button><div class="ph"><img src="${imgOf(r)}" alt=""></div><div class="tp"><i></i></div>
  <span class="du"><img src="${F}mic_l.svg" alt="">${durTxt(r.id)}</span><button class="hr ${FAV.has(r.id)?'on':''}" id="aHr" aria-label="즐겨찾기"></button>
  <div class="bt"><div class="r1"><span class="nm">${nameOf(r)}</span><button class="pb" id="aPB" aria-label="재생"><img class="ico" src="${F}play_l.svg" alt=""></button></div>
  <div class="if"><p><img src="${F}clock_l.svg" alt="">${ymdS(r.t)} - ${hm(r.t)}</p><p><img src="${F}geo_l.svg" alt="">${PLACE[r.sc]||''}</p></div></div>`;
  on(sDet,true);
  $('aDB').onclick=()=>{stopAll();on(sDet,false);det=null;if(sub)renderSub();else if(tab==='map')renderMap();};
  $('aHr').onclick=()=>{const b=$('aHr');if(FAV.has(r.id))FAV.delete(r.id);else FAV.add(r.id);b.classList.toggle('on',FAV.has(r.id));sv('pinch-fav',[...FAV]);};
  const pb=$('aPB');pb.onclick=()=>{if(pb.classList.contains('on')){stopAll();return;}pb.classList.add('on');playRec(r,()=>pb.classList.remove('on'));};
  window.pinchGlass&&pinchGlass(pb,{blur:3.48,refraction:.8,depth:17.39,angle:-45,intensity:.8,dispersion:.5,splay:0});}

/* ---------- map ---------- */
const PINS={park:[115,314],city:[187,220],beach:[24,414],camp:[26,98]};
let mapSel='park';
function renderMap(){const all=records(),by={};all.forEach(r=>(by[r.sc]=by[r.sc]||[]).push(r));
  if(!by[mapSel])mapSel=Object.keys(PINS).find(k=>by[k])||'park';
  const L=(by[mapSel]||[]).slice().reverse();
  sMap.innerHTML=`<img class="bg" src="${F}map_bg.jpg" alt=""><div class="fd"></div>`+
    Object.entries(PINS).filter(([k])=>by[k]).map(([k,[x,y]])=>`<button class="pin ${k===mapSel?'on':''}" data-k="${k}" style="left:${x}px;top:${y}px" aria-label="${PLACE[k]}">${by[k].length}</button>`).join('')+
    `<div class="cr" id="aCr">${L.map(r=>`<div class="cd" data-id="${r.id}"><img class="t" src="${imgOf(r)}" alt=""><p class="n">${nameOf(r)}</p><p class="l a"><img src="${F}clock_d.svg" alt="">${ymdS(r.t)} - ${hm(r.t)}</p><p class="l b"><img src="${F}geo_d.svg" alt="">${PLACE[r.sc]}</p></div>`).join('')}</div>`;
  sMap.querySelectorAll('.pin').forEach(b=>b.onclick=()=>{mapSel=b.dataset.k;renderMap();});
  sMap.querySelectorAll('.cd').forEach(c=>{c.onclick=()=>openDet(L.find(r=>r.id===c.dataset.id));
    window.pinchGlass&&pinchGlass(c,{blur:5.83,refraction:.8,depth:83.26,angle:-45,intensity:.5,dispersion:.82,splay:.38});});}

/* develop hook: archive the roll when it finishes developing */
const oldDev=window.develop;
window.develop=develop=function(){oldDev();const iv=setInterval(()=>{if(state.developed){clearInterval(iv);window.h2ArchiveAdd();}},200);};
})();
