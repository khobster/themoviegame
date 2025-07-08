/* themoviegame.js – fun UX v2 */
const $ = id => document.getElementById(id);
const TXT=$('questionText'), IN=$('userAnswer'), BTN=$('submitAnswerBtn'),
      HINT=$('hintBtn'), SHARE=$('shareBtn'), RES=$('result'),
      SCORE=$('score'), STREAK=$('streak'), TIMER=$('timer'),
      TOAST=$('toastContainer');

const correct=new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrong  =new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let current={}, guessCt=0, hintLv=0;

const key=(k)=>`tmv_${k}`;
function get(k,d=0){return +localStorage.getItem(key(k))||d;}
function set(k,v){localStorage.setItem(key(k),v);}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;
  TOAST.appendChild(t);setTimeout(()=>t.remove(),3000);}
function rand(max){return crypto.getRandomValues(new Uint32Array(1))[0]%max;}

async function loadQ(){
  const list=await (await fetch('badwillafishing_updated.json')).json();
  const dayKey=`seen_${new Date().toJSON().slice(0,10)}`;
  let seen=JSON.parse(localStorage.getItem(key(dayKey))||'[]');
  if(seen.length>=list.length)seen=[];
  let i;do{i=rand(list.length);}while(seen.includes(i));
  current=list[i];seen.push(i);localStorage.setItem(key(dayKey),JSON.stringify(seen));

  TXT.textContent=current.question; IN.value=''; IN.focus();
  hintLv=0; $('hintCount').textContent=3; HINT.disabled=false;
  SHARE.style.display='none'; guessCt=0;
}
function countdown(){
  const n=new Date(), nxt=new Date(n);nxt.setMinutes(Math.ceil(n.getMinutes()/10)*10,0,0);
  const d=nxt-n;if(d<=0){TIMER.textContent='0:00';loadQ();return;}
  TIMER.textContent=`${Math.floor(d/60000)}:${String(Math.floor(d/1000)%60).padStart(2,'0')}`;
}

function updateHUD(){SCORE.textContent=get('score');STREAK.textContent=get('streak');}

function guess(){
  const g=IN.value.trim();if(!g)return;guessCt++;
  if(g.toLowerCase()===current.answer.toLowerCase()){
    RES.textContent='🎉 Correct!';correct.play();
    set('score',get('score')+1);set('streak',get('streak')+1);
    SHARE.style.display='inline-flex';toast('+1 point');
    setTimeout(()=>RES.textContent='',1500);updateHUD();
  }else{
    RES.textContent='Nope';wrong.play();set('streak',0);updateHUD();
  }
}

function hint(){
  if(hintLv>=3)return;hintLv++;$('hintCount').textContent=3-hintLv;
  RES.textContent=current['hint'+hintLv]||'-';
  set('score',Math.max(0,get('score')-1));updateHUD();toast('-1 point');
  if(hintLv>=3)HINT.disabled=true;
}

function share(){
  const txt=`Got it in ${guessCt} guesses 🔥\n${location.href}`;
  if(navigator.share){navigator.share({text:txt}).catch(()=>{});}
  else{navigator.clipboard.writeText(txt).then(()=>toast('Copied!'));}
}

document.addEventListener('DOMContentLoaded',()=>{
  if(!localStorage.getItem(key('onboard'))){
    $('howTo').showModal();$('closeHowTo').onclick=()=>{
      localStorage.setItem(key('onboard'),'1');$('howTo').close();
    };
  }
  updateHUD();loadQ();countdown();setInterval(countdown,1000);

  BTN.onclick=guess; IN.onkeydown=e=>e.key==='Enter'&&guess();
  HINT.onclick=hint; SHARE.onclick=share;
});
