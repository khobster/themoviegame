/* themoviegame.js – v3.4 (sounds unlocked + negative scores) */
const $ = id => document.getElementById(id);
const TXT=$('questionText'), IN=$('userAnswer'), BTN=$('submitAnswerBtn'),
      HINT=$('hintBtn'), SHARE=$('shareBtn'), RES=$('result'),
      SCORE=$('score'), STREAK=$('streak'), TIMER=$('timer'),
      CARD=$('card'), TOAST=$('toastContainer'), OVER=$('gameOver');

/* --- audio --- */
const S_OK    = new Audio('bing-bong.mp3');
const S_BAD   = new Audio('incorrect-answer-for-plunko.mp3');
const S_GAMEO = new Audio('gameoversound.mp3');

/* unlock autoplay for ALL sounds on first pointer gesture */
window.addEventListener('pointerdown', () => {
  [S_OK, S_BAD, S_GAMEO].forEach(a=>{
    a.play().catch(()=>{}); a.pause(); a.currentTime=0;
  });
}, { once:true });

let current={}, guessCt=0, hintLv=0, solved=false, endTime=0;
const INTERVAL_MS = 45_000;

const key=k=>`tmv_${k}`;
const get =(k,d=0)=>+localStorage.getItem(key(k))||d;
const setLS=(k,v)=>localStorage.setItem(key(k),v);

/* ---------- helpers ---------- */
function toast(msg){
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  TOAST.appendChild(t);setTimeout(()=>t.remove(),2800);
}
function pickIndex(len){
  Math.seedrandom(Date.now().toString());
  return Math.floor(Math.random()*len);
}
async function fetchList(){
  if(!fetchList.cache){
    fetchList.cache=await (await fetch('badwillafishing_fixed.json')).json();
  }
  return fetchList.cache;
}

/* ---------- load new clue ---------- */
async function loadQ(){
  CARD.classList.remove('arcade','timesUp');
  OVER.style.display='none';solved=false;

  endTime=Date.now()+INTERVAL_MS;        /* timer starts now */

  const list=await fetchList();
  current=list[pickIndex(list.length)];

  TXT.textContent=current.question;
  hintLv=0;$('hintCount').textContent=3;HINT.disabled=false;
  SHARE.style.display='none';guessCt=0;
  RES.textContent='';IN.value='';IN.focus({preventScroll:true});
}

/* ---------- countdown ---------- */
function countdown(){
  const diff=endTime-Date.now();
  if(diff<=0){
    if(!solved){
      S_GAMEO.play().catch(()=>{});
      OVER.style.display='flex';
      setLS('score',0);setLS('streak',0);updateHUD();
      CARD.classList.add('timesUp');
      setTimeout(loadQ,2200);
    }
    return;
  }
  TIMER.textContent=`${Math.floor(diff/60000)}:${String(Math.floor(diff/1000)%60).padStart(2,'0')}`;
}

/* ---------- HUD ---------- */
function updateHUD(){
  SCORE.textContent=get('score');
  STREAK.textContent=get('streak');
}

/* ---------- interactions ---------- */
function correctAnswer(){
  solved=true;RES.textContent='Correct!';S_OK.play().catch(()=>{});
  CARD.classList.add('arcade');
  setLS('score',get('score')+3);setLS('streak',get('streak')+1);
  updateHUD();toast('+3 pts');setTimeout(loadQ,800);
}
function guess(){
  const g=IN.value.trim();if(!g)return;guessCt++;
  if(g.toLowerCase()===current.answer.toLowerCase()){correctAnswer();}
  else{S_BAD.play().catch(()=>{});RES.textContent='Nope';}
}
function hint(){
  if(hintLv>=3)return;
  hintLv++;$('hintCount').textContent=3-hintLv;
  RES.textContent=current['hint'+hintLv]||'-';
  setLS('score',get('score')-1);updateHUD();toast('-1 pt');
  if(hintLv>=3)HINT.disabled=true;
}
function share(){
  const msg=`🔥 Cracked “${current.question}” ➜ ${current.answer} `
           +`in ${guessCt} guess${guessCt!==1?'es':''}! ${location.href}`;
  if(navigator.share){navigator.share({text:msg}).catch(()=>{});}
  else{navigator.clipboard.writeText(msg).then(()=>toast('Copied!'));}
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  if(!sessionStorage.getItem('tmv_session_started')){
    localStorage.setItem('tmv_score',0);
    localStorage.setItem('tmv_streak',0);
    sessionStorage.setItem('tmv_session_started','1');
  }
  if(!localStorage.getItem(key('onboard'))){
    $('howTo').showModal();
    $('closeHowTo').onclick=()=>{localStorage.setItem(key('onboard'),'1');$('howTo').close();};
  }
  updateHUD();loadQ();countdown();setInterval(countdown,1000);

  BTN.onclick=guess;
  IN.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guess();}});
  HINT.onclick=hint;SHARE.onclick=share;
});
