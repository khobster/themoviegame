/* themoviegame.js – tiered hints + scoring */
const TXT   = document.getElementById('questionText');
const IN    = document.getElementById('userAnswer');
const BTN   = document.getElementById('submitAnswerBtn');
const HINT  = document.getElementById('hintBtn');
const RES   = document.getElementById('result');
const TMR   = document.getElementById('timer');
const SCORE = document.getElementById('score');
const SHARE = document.getElementById('shareBtn');

const correctChime = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongBuzz    = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let current={}, guessCount=0, hintLevel=0;

const scoreKey='tmv_score';
const todayKey=()=>`tmv_seen_${new Date().toISOString().slice(0,10)}`;

function loadScore(){ SCORE.textContent=+localStorage.getItem(scoreKey)||0; }
function bumpScore(d){ const n=Math.max(0,(+localStorage.getItem(scoreKey)||0)+d);
                       localStorage.setItem(scoreKey,n); SCORE.textContent=n; }

function rand(max){ return crypto.getRandomValues(new Uint32Array(1))[0]%max; }

async function loadQuestion(){
  const list=await (await fetch('badwillafishing_updated.json')).json();
  const used=JSON.parse(localStorage.getItem(todayKey())||'[]');
  if(used.length>=list.length) used.length=0;
  let idx; do{ idx=rand(list.length);}while(used.includes(idx));
  current=list[idx]; used.push(idx); localStorage.setItem(todayKey(),JSON.stringify(used));

  TXT.textContent=current.question; IN.value=''; IN.focus();
  guessCount=0; hintLevel=0; HINT.disabled=false; SHARE.style.display='none';
}

function countdown(){
  const now=new Date(), next=new Date(now);
  next.setMinutes(Math.ceil(now.getMinutes()/10)*10,0,0);
  const diff=next-now;
  if(diff<=0){TMR.textContent='Resetting…';loadQuestion();return;}
  const m=Math.floor(diff/60000),s=Math.floor((diff%60000)/1000);
  TMR.textContent=`${m}:${s.toString().padStart(2,'0')}`;
}

function handleGuess(){
  const g=IN.value.trim(); if(!g)return; guessCount++;
  if(g.toLowerCase()===current.answer.toLowerCase()){
    RES.textContent='YESSSS!'; correctChime.play(); bumpScore(+1);
    SHARE.style.display='inline-block'; setTimeout(()=>RES.textContent='',15000);
  }else{ RES.textContent='Nope. Give it another shot.'; wrongBuzz.play(); }
}

function showHint(){
  if(hintLevel>=3)return; hintLevel++;
  RES.textContent=current['hint'+hintLevel]||'-'; bumpScore(-1);
  if(hintLevel>=3)HINT.disabled=true;
}

function shareBrag(){
  const text=`Solved “${current.question}” ➡️ ${current.answer} `
           +`(${guessCount} guesses, score ${SCORE.textContent}). ${location.href}`;
  if(navigator.share){ navigator.share({text,url:location.href}).catch(()=>{}); }
  else{ navigator.clipboard.writeText(text).then(()=>alert('Copied!')); }
}

document.addEventListener('DOMContentLoaded',()=>{
  loadScore(); loadQuestion(); countdown(); setInterval(countdown,1000);
  BTN.addEventListener('click',handleGuess);
  IN.addEventListener('keydown',e=>e.key==='Enter'&&handleGuess());
  HINT.addEventListener('click',showHint);
  SHARE.addEventListener('click',shareBrag);
});
