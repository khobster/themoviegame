/* themoviegame.js – v2.1 (mascot + 2-min sync) */
const $ = id => document.getElementById(id);
const TXT=$('questionText'), IN=$('userAnswer'), BTN=$('submitAnswerBtn'),
      HINT=$('hintBtn'), SHARE=$('shareBtn'), RES=$('result'),
      SCORE=$('score'), STREAK=$('streak'), TIMER=$('timer'),
      TOAST=$('toastContainer');

const SOUND_OK  = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const SOUND_BAD = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let current={}, guessCt=0, hintLv=0;
const key=k=>`tmv_${k}`;
const INTERVAL_MIN = 2;                            // <— 2-minute slices

const get  =(k,d=0)=>+localStorage.getItem(key(k))||d;
const setLS=(k,v)=>localStorage.setItem(key(k),v);

function toast(msg){
  const t=document.createElement('div');
  t.className='toast'; t.textContent=msg;
  TOAST.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

function currentSlice(){                           // same for all users
  const now = new Date();
  const day0 = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.floor((now-day0)/(INTERVAL_MIN*60000));   // 0,1,2…
}

async function loadQ(){
  const list = await (await fetch('badwillafishing_fixed.json')).json();
  current = list[currentSlice() % list.length];

  TXT.textContent=current.question;
  hintLv=0; $('hintCount').textContent=3; HINT.disabled=false;
  SHARE.style.display='none'; guessCt=0;
  IN.value=''; IN.focus();
}

function countdown(){
  const now=new Date();
  const next=new Date(now.getTime()+INTERVAL_MIN*60000);
  next.setSeconds(0,0);                            // snap to minute
  const diff=next-now;
  if(diff<=0){loadQ();return;}
  const m=Math.floor(diff/60000), s=String(Math.floor(diff/1000)%60).padStart(2,'0');
  TIMER.textContent = `${m}:${s}`;
}

function updateHUD(){
  SCORE.textContent=get('score');
  STREAK.textContent=get('streak');
}

function guess(){
  const g=IN.value.trim(); if(!g) return;
  guessCt++;
  if(g.toLowerCase()===current.answer.toLowerCase()){
    RES.textContent='🎉 Correct!'; SOUND_OK.play();
    setLS('score',get('score')+1);
    setLS('streak',get('streak')+1);
    SHARE.style.display='inline-flex'; toast('+1 point');
    setTimeout(()=>RES.textContent='',1500);
  }else{
    RES.textContent='Nope'; SOUND_BAD.play();
    setLS('streak',0);
  }
  updateHUD();
}

function hint(){
  if(hintLv>=3) return;
  hintLv++; $('hintCount').textContent = 3-hintLv;
  RES.textContent = current['hint'+hintLv] || '-';
  setLS('score', Math.max(0,get('score')-1));
  updateHUD(); toast('-1 point');
  if(hintLv>=3) HINT.disabled=true;
}

function share(){
  const txt = `Solved in ${guessCt} guesses! ${location.href}`;
  if(navigator.share){ navigator.share({text:txt}).catch(()=>{}); }
  else{ navigator.clipboard.writeText(txt).then(()=>toast('Copied!')); }
}

document.addEventListener('DOMContentLoaded',()=>{
  // first-time how-to
  if(!localStorage.getItem(key('onboard'))){
    $('howTo').showModal();
    $('closeHowTo').onclick=(()=>{
      localStorage.setItem(key('onboard'),'1');
      $('howTo').close();
    });
  }

  updateHUD(); loadQ(); countdown(); setInterval(countdown,1000);

  BTN.onclick=guess; IN.onkeydown=e=>e.key==='Enter'&&guess();
  HINT.onclick=hint; SHARE.onclick=share;
});
