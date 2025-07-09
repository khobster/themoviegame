/* themoviegame.js – v2.3 (mobile UX, true shuffle, arcade flash) */
const $ = id => document.getElementById(id);
const TXT=$('questionText'), IN=$('userAnswer'), BTN=$('submitAnswerBtn'),
      HINT=$('hintBtn'), SHARE=$('shareBtn'), RES=$('result'),
      SCORE=$('score'), STREAK=$('streak'), TIMER=$('timer'),
      CARD=$('card'), TOAST=$('toastContainer');

const ok  = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const bad = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let current={}, guessCt=0, hintLv=0;
const INTERVAL_MIN = 2;
const key = k => `tmv_${k}`;
const get  = (k,d=0)=>+localStorage.getItem(key(k))||d;
const setLS= (k,v)=>localStorage.setItem(key(k),v);

/* ------------- helpers ------------- */
function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  TOAST.appendChild(t); setTimeout(()=>t.remove(),2800);
}
function sliceNumber(){
  const now=new Date(), day0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.floor((now-day0)/(INTERVAL_MIN*60000));
}
/* deterministic shuffle: same slice → same clue for everyone */
function pickIndex(len){
  Math.seedrandom(sliceNumber());
  return Math.floor(Math.random()*len);
}

/* ------------- load clue ------------- */
async function loadQ(){
  const list = await (await fetch('badwillafishing_fixed.json')).json();
  current = list[pickIndex(list.length)];

  TXT.textContent=current.question;
  hintLv=0; $('hintCount').textContent=3; HINT.disabled=false;
  SHARE.style.display='none'; guessCt=0;
  IN.value=''; IN.focus({preventScroll:true});
  IN.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ------------- countdown ------------- */
function countdown(){
  const now=Date.now();
  const msSlice = INTERVAL_MIN*60000;
  const msToNext = msSlice - (now % msSlice);
  if(msToNext < 1100){ loadQ(); return; }
  const mm = Math.floor(msToNext/60000);
  const ss = String(Math.floor(msToNext/1000)%60).padStart(2,'0');
  TIMER.textContent = `${mm}:${ss}`;
}

/* ------------- HUD ------------- */
function updateHUD(){
  SCORE.textContent=get('score');
  STREAK.textContent=get('streak');
}

/* ------------- actions ------------- */
function flashArcade(){
  CARD.classList.add('arcade');
  setTimeout(()=>CARD.classList.remove('arcade'),800);
}

function guess(){
  const g=IN.value.trim(); if(!g) return;
  guessCt++;
  if(g.toLowerCase()===current.answer.toLowerCase()){
    RES.textContent='Correct!';
    ok.play(); flashArcade();
    setLS('score',get('score')+1); setLS('streak',get('streak')+1);
    updateHUD(); toast('+1 pt');
    setTimeout(loadQ,800);          // immediately next clue
  }else{
    RES.textContent='Nope';
    bad.play(); setLS('streak',0); updateHUD();
  }
}

function hint(){
  if(hintLv>=3) return;
  hintLv++; $('hintCount').textContent = 3-hintLv;
  RES.textContent = current['hint'+hintLv]||'-';
  setLS('score',Math.max(0,get('score')-1)); updateHUD(); toast('-1 pt');
  if(hintLv>=3) HINT.disabled=true;
}

function share(){
  const msg = `🔥 Cracked “${current.question}” ➜ ${current.answer} `
            +`in ${guessCt} guess${guessCt!==1?'es':''}! ${location.href}`;
  if(navigator.share){ navigator.share({text:msg}).catch(()=>{}); }
  else{ navigator.clipboard.writeText(msg).then(()=>toast('Copied!')); }
}

/* ------------- boot ------------- */
document.addEventListener('DOMContentLoaded',()=>{
  if(!localStorage.getItem(key('onboard'))){
    $('howTo').showModal();
    $('closeHowTo').onclick=()=>{
      localStorage.setItem(key('onboard'),'1'); $('howTo').close();
    };
  }

  updateHUD(); loadQ(); countdown(); setInterval(countdown,1000);

  BTN.onclick=guess;
  IN.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); guess(); }});
  HINT.onclick=hint; SHARE.onclick=share;
});
