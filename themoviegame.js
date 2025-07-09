/* themoviegame.js – v3.0 (45-sec timer, game-over, new scoring) */
const $ = id => document.getElementById(id);
const TXT=$('questionText'), IN=$('userAnswer'), BTN=$('submitAnswerBtn'),
      HINT=$('hintBtn'), SHARE=$('shareBtn'), RES=$('result'),
      SCORE=$('score'), STREAK=$('streak'), TIMER=$('timer'),
      CARD=$('card'), TOAST=$('toastContainer'), OVER=$('gameOver');

const S_OK  = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const S_BAD = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let current={}, guessCt=0, hintLv=0;
const INTERVAL_MS = 45_000;                     // 45-second slices
const key = k => `tmv_${k}`;
const get  = (k,d=0)=>+localStorage.getItem(key(k))||d;
const setLS= (k,v)=>localStorage.setItem(key(k),v);

/* ---------- helpers ---------- */
function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  TOAST.appendChild(t); setTimeout(()=>t.remove(),2800);
}
function sliceNumber(){
  return Math.floor(Date.now()/INTERVAL_MS);
}
function pickIndex(len){
  Math.seedrandom(sliceNumber());
  return Math.floor(Math.random()*len);
}

/* ---------- load clue ---------- */
async function loadQ(){
  OVER.hidden = true; CARD.classList.remove('timesUp');
  const list = await (await fetch('badwillafishing_fixed.json')).json();
  current = list[pickIndex(list.length)];

  TXT.textContent=current.question;
  hintLv=0; $('hintCount').textContent=3; HINT.disabled=false;
  SHARE.style.display='none'; guessCt=0;
  IN.value=''; IN.focus({preventScroll:true});
}

/* ---------- countdown ---------- */
function countdown(){
  const now = Date.now();
  const msToNext = INTERVAL_MS - (now % INTERVAL_MS);
  if(msToNext < 1000){
    CARD.classList.add('timesUp');              // flash effect
    setTimeout(loadQ,400);
    return;
  }
  const mm=Math.floor(msToNext/60000);
  const ss=String(Math.floor(msToNext/1000)%60).padStart(2,'0');
  TIMER.textContent=`${mm}:${ss}`;
}

/* ---------- HUD ---------- */
function updateHUD(){
  SCORE.textContent=get('score');
  STREAK.textContent=get('streak');
}

/* ---------- GAME OVER ---------- */
function gameOver(){
  S_BAD.play();
  OVER.hidden=false;
  setLS('score',0); setLS('streak',0);
  updateHUD();
  setTimeout(loadQ,1500);
}

/* ---------- interactions ---------- */
function guess(){
  const g=IN.value.trim(); if(!g) return;
  if(g.toLowerCase()===current.answer.toLowerCase()){
    RES.textContent='Correct!';
    S_OK.play(); CARD.classList.add('arcade');
    setLS('score',get('score')+3);              // +3 points
    setLS('streak',get('streak')+1); updateHUD(); toast('+3 pts');
    setTimeout(()=>{CARD.classList.remove('arcade'); loadQ();},800);
  }else{
    gameOver();
  }
}

function hint(){
  if(hintLv>=3) return;
  hintLv++; $('hintCount').textContent=3-hintLv;
  RES.textContent=current['hint'+hintLv]||'-';
  setLS('score',Math.max(0,get('score')-1)); updateHUD(); toast('-1 pt');
  if(hintLv>=3) HINT.disabled=true;
}

function share(){
  const msg=`🔥 Cracked “${current.question}” ➜ ${current.answer} `
           +`in ${guessCt} guess${guessCt!==1?'es':''}! ${location.href}`;
  if(navigator.share){ navigator.share({text:msg}).catch(()=>{}); }
  else{ navigator.clipboard.writeText(msg).then(()=>toast('Copied!')); }
}

/* ---------- boot ---------- */
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
