/* The Movie Game — v5.0
   THE DAILY REEL is the whole game: 4 movie-opposites on one board, all sharing
   a mystery top-billed guest (from IMDb). Solve in any order, then WHO IS IT?
   Plus an ARCHIVE of past reels that grows each day.
   Every clue is a movie title flipped to its opposite. */

const $ = id => document.getElementById(id);

/* ---------- audio ---------- */
const S_OK    = new Audio('bing-bong.mp3');
const S_BAD   = new Audio('incorrect-answer-for-plunko.mp3');
const S_GAMEO = new Audio('gameoversound.mp3');
[S_OK, S_BAD, S_GAMEO].forEach(a => { a.preload = 'auto'; });
window.addEventListener('pointerdown', () => {
  [S_OK, S_BAD, S_GAMEO].forEach(a => { a.play().catch(()=>{}); a.pause(); a.currentTime = 0; });
}, { once:true });
const play = a => { try { a.currentTime = 0; a.play().catch(()=>{}); } catch(_){} };

/* ---------- storage ---------- */
const K = k => `tmg_${k}`;
const getJSON = (k, d) => { try { const v=localStorage.getItem(K(k)); return v==null?d:JSON.parse(v); } catch(_) { return d; } };
const setJSON = (k, v) => localStorage.setItem(K(k), JSON.stringify(v));

/* ---------- data ---------- */
let REELS = null;
async function loadData(){
  if (!REELS){
    try {
      REELS = await (await fetch('daily_reels.json?v=66')).json();
      if (!Array.isArray(REELS) || !REELS.length) REELS = null;
    } catch(_) { REELS = null; }
  }
}

/* ---------- answer matching ---------- */
function normalize(s){
  return String(s).toLowerCase().replace(/&/g,' and ')
    .replace(/[^a-z0-9 ]+/g,' ').replace(/\b(the|a|an)\b/g,' ').replace(/\s+/g,' ').trim();
}
function lev(a,b){
  const m=a.length,n=b.length; if(!m)return n; if(!n)return m;
  let prev=[...Array(n+1).keys()], cur=new Array(n+1);
  for(let i=1;i<=m;i++){ cur[0]=i;
    for(let j=1;j<=n;j++){ cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); }
    [prev,cur]=[cur,prev];
  }
  return prev[n];
}
function isMatch(guess, answer){
  const g=normalize(guess), a=normalize(answer);
  if(!g) return false; if(g===a) return true;
  const tol = a.length>=12 ? 2 : a.length>=6 ? 1 : 0;
  return lev(g,a) <= tol;
}
function matchGuest(guess, r){
  const g=normalize(guess); if(!g) return false;
  const full=normalize(r.guest), last=normalize(r.guestLast);
  if(g===full || g===last) return true;
  if(lev(g,full)<=2 || lev(g,last)<=1) return true;
  return g.split(' ').includes(last);
}

/* ---------- dates / reel numbering ---------- */
const EPOCH = Date.UTC(2026,7,13);   // #1-3 (Hanks/Hoffman/Ford) already in archive; today = #4
function dayNumber(d=new Date()){
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((local-EPOCH)/86400000);
}
function todayStr(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function currentReelNum(){ return Math.max(1, dayNumber()+1); }   // today's reel #
function reelByNum(num){ const n=REELS.length; return REELS[((num-1)%n+n)%n]; }

/* ---------- view switching ---------- */
function show(view){
  ['home','daily','archive'].forEach(v => $('view-'+v).classList.toggle('active', v===view));
}

/* ========================================================================
   STREAK  (date-based: consecutive real days you finished THAT day's reel)
   ===================================================================== */
function getStreakRec(){ return getJSON('streak', {last:'', streak:0, best:0}); }
function displayStreak(){
  const s=getStreakRec(); if(!s.last) return 0;
  const y=new Date(); y.setDate(y.getDate()-1);
  return (s.last===todayStr() || s.last===todayStr(y)) ? s.streak : 0;
}
function bumpStreakForToday(){
  const s=getStreakRec(), t=todayStr();
  if(s.last===t) return;                      // already counted today
  const y=new Date(); y.setDate(y.getDate()-1);
  s.streak = (s.last===todayStr(y)) ? s.streak+1 : 1;
  s.last=t; s.best=Math.max(s.best||0, s.streak);
  setJSON('streak', s);
}

/* ========================================================================
   REEL  (today's or any archived one, addressed by reel number)
   status per clue: 'open' | 'solved' | 'revealed'
   ===================================================================== */
const reel = { num:0, data:null, isToday:false, statuses:[], hints:[], active:0,
               guestGot:false, guestTries:0, guestRevealed:false, filmsDone:false, done:false };

function results(){ return getJSON('results', {}); }
function saveReel(){
  const st=results();
  st[reel.num]={ statuses:reel.statuses, hints:reel.hints, guestGot:reel.guestGot,
                 guestTries:reel.guestTries, done:reel.done, guest:reel.data.guest };
  setJSON('results', st);
}
function reelSolved(rec){ return rec && rec.done && rec.statuses.every(s=>s==='solved'); }

function openReel(num){
  if(!REELS){ toast('reels not loaded'); return; }
  reel.num=num; reel.data=reelByNum(num); reel.isToday=(num===currentReelNum());
  const saved=results()[num];
  if(saved && saved.guest===reel.data.guest){
    reel.statuses=saved.statuses.slice(); reel.hints=saved.hints.slice();
    reel.guestGot=saved.guestGot; reel.guestTries=saved.guestTries||0; reel.done=saved.done;
    reel.guestRevealed=saved.done; reel.filmsDone=reel.statuses.every(s=>s!=='open');
  } else {
    const n=reel.data.clues.length;
    reel.statuses=Array(n).fill('open'); reel.hints=Array(n).fill(0);
    reel.guestGot=false; reel.guestTries=0; reel.done=false; reel.guestRevealed=false; reel.filmsDone=false;
  }
  reel.active=reel.statuses.findIndex(s=>s==='open'); if(reel.active<0) reel.active=0;
  renderReel(); show('daily');
}

function renderReel(){
  $('d-daynum').textContent = reel.isToday ? `TODAY · REEL #${reel.num}` : `REEL #${reel.num} · from the archive`;
  renderTabs(); renderGuest(); renderActiveClue(); renderProgress();
  if(reel.done) renderShare(); else { $('d-lock').style.display='none'; $('d-share').style.display='none'; }
}
function renderTabs(){
  const wrap=$('d-tabs'); wrap.innerHTML='';
  reel.statuses.forEach((s,i)=>{
    const b=document.createElement('button');
    b.className='reelTab'+(i===reel.active?' active':'')+(s==='solved'?' solved':s==='revealed'?' revealed':'');
    b.textContent = s==='solved' ? '✓' : s==='revealed' ? '✕' : (i+1);
    b.onclick=()=>{ reel.active=i; renderActiveClue(); renderTabs(); };
    wrap.appendChild(b);
  });
}
function renderActiveClue(){
  const i=reel.active, c=reel.data.clues[i], s=reel.statuses[i];
  $('d-clue').textContent=c.question;
  const hp=[];
  if(reel.hints[i]>=1) hp.push(`starts with “${c.hint1}”`);
  if(reel.hints[i]>=2) hp.push(`came out ${c.hint2}`);
  $('d-hintArea').textContent=hp.join('  ·  ');
  const resolved = s!=='open';
  $('d-input').disabled=resolved; $('d-submit').disabled=resolved;
  $('d-hintBtn').disabled=resolved||reel.hints[i]>=2;
  $('d-revealBtn').style.display=resolved?'none':'';
  $('d-input').value='';
  if(s==='solved') $('d-result').innerHTML=`<span class="ok">✓ ${c.answer}</span>`;
  else if(s==='revealed') $('d-result').innerHTML=`<span class="bad">${c.answer}</span>`;
  else { $('d-result').textContent=''; if(!reel.done) setTimeout(()=>$('d-input').focus({preventScroll:true}),30); }
}
function renderProgress(){
  const solved=reel.statuses.filter(s=>s==='solved').length;
  $('d-progress').textContent=`${solved}/${reel.statuses.length} films`;
}

function dailyGuess(){
  const i=reel.active; if(reel.statuses[i]!=='open') return;
  const v=$('d-input').value.trim(); if(!v) return;
  if(isMatch(v, reel.data.clues[i].answer)){ reel.statuses[i]='solved'; play(S_OK); afterClueResolved(true); }
  else { play(S_BAD); $('d-result').textContent='nope. jump to another if you want';
         $('d-input').value=''; $('d-input').focus({preventScroll:true}); }
}
function dailyHint(){
  const i=reel.active; if(reel.statuses[i]!=='open'||reel.hints[i]>=2) return;
  reel.hints[i]++; renderActiveClue(); saveReel();
}
function dailyReveal(){
  const i=reel.active; if(reel.statuses[i]!=='open') return;
  reel.statuses[i]='revealed'; play(S_BAD); afterClueResolved(false);
}
function afterClueResolved(advance){
  saveReel(); renderTabs(); renderActiveClue(); renderProgress(); renderGuest();
  if(reel.statuses.every(s=>s!=='open')){ filmsComplete(); return; }
  if(advance){ const nxt=reel.statuses.findIndex(s=>s==='open'); if(nxt>=0){ reel.active=nxt; renderActiveClue(); renderTabs(); } }
}

/* ----- mystery guest / WHO IS IT? ----- */
function renderGuest(){
  const solved=reel.statuses.filter(s=>s==='solved').length;
  const wrap=$('d-guestWrap');
  if(reel.done || reel.guestRevealed){
    wrap.innerHTML=`<div class="guestReveal ${reel.guestGot?'got':''}">🎭 it was <b>${reel.data.guest}</b>${reel.guestGot?' and you got it ⭐':''}</div>`;
    return;
  }
  if(reel.guestGot){
    wrap.innerHTML=`<div class="guestReveal got">🎭 <b>${reel.data.guest}</b> ⭐ nice. now finish the board</div>`;
    return;
  }
  const finale=reel.filmsDone;
  const hint = (solved>=2 && !finale) ? ` <span class="gh">(hint: their first initial is ${reel.data.guest[0]})</span>` : '';
  const heading = finale
    ? `<span class="whois">WHO IS IT?</span><span class="sub">one actor is in all four films. name em</span>`
    : `🎭 <b>who is it?</b> one actor is in all four films. name em for a bonus ⭐${hint}`;
  wrap.innerHTML=`
    <div class="guestPrompt ${finale?'finale':''}">${heading}</div>
    <div class="guestRow">
      <input id="d-guestInput" class="answer guest" placeholder="the mystery guest…" autocomplete="off" />
      <button id="d-guestBtn" class="iconBtn">🎬</button>
    </div>
    <div id="d-guestMsg" class="guestMsg"></div>
    ${finale?'<button id="d-guestGiveup" class="revealBtn" style="display:block;margin:10px auto 0">give up, show me who</button>':''}`;
  $('d-guestBtn').onclick=guestGuess;
  $('d-guestInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guestGuess();}});
  const gu=$('d-guestGiveup'); if(gu) gu.onclick=giveUpGuest;
  if(finale) setTimeout(()=>{const gi=$('d-guestInput'); if(gi) gi.focus({preventScroll:true});},40);
}
function guestGuess(){
  const el=$('d-guestInput'); if(!el) return;
  const v=el.value.trim(); if(!v) return;
  if(matchGuest(v, reel.data)){
    reel.guestGot=true; play(S_OK); toast('nice, bonus ⭐'); saveReel();
    if(reel.filmsDone) lockReel(); else renderGuest();
  } else {
    reel.guestTries++; play(S_BAD); saveReel();
    const m=$('d-guestMsg'); if(m) m.textContent = reel.filmsDone ? 'nope, try again' : "nope. solve more and i'll give you a hint";
    el.value=''; el.focus({preventScroll:true});
  }
}
function giveUpGuest(){ reel.guestRevealed=true; play(S_GAMEO); lockReel(); }

/* ----- finish / lock / share ----- */
function filmsComplete(){
  reel.filmsDone=true; saveReel();
  if(reel.guestGot){ lockReel(); return; }
  play(S_OK); renderGuest(); renderProgress();
}
function lockReel(){
  reel.done=true; reel.guestRevealed=true; saveReel();
  const won=reel.statuses.every(s=>s==='solved');
  if(won && reel.isToday) bumpStreakForToday();
  play(won?S_OK:S_GAMEO);
  renderGuest(); renderShare(); renderTabs(); renderActiveClue();
}
let lockTimer=null;
function renderShare(){
  $('d-share').style.display=''; $('d-lock').style.display='';
  const won=reel.statuses.every(s=>s==='solved');
  const streak=displayStreak(), best=getStreakRec().best||0;
  if(reel.isToday){
    const tick=()=>{
      const now=new Date(), mid=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
      let s=Math.max(0,Math.floor((mid-now)/1000));
      const h=String(Math.floor(s/3600)).padStart(2,'0'),m=String(Math.floor(s/60)%60).padStart(2,'0'),ss=String(s%60).padStart(2,'0');
      $('d-lock').innerHTML=`${won?'that’s a wrap 🎬':'that’s a wrap.'} 🔥 streak <b>${streak}</b> · best <b>${best}</b><br>next reel drops in <b>${h}:${m}:${ss}</b>`;
    };
    tick(); clearInterval(lockTimer); lockTimer=setInterval(tick,1000);
  } else {
    clearInterval(lockTimer);
    $('d-lock').innerHTML=`${won?'nice, cleared it 🎬':'that’s a wrap.'} <br><button class="revealBtn archLink" style="font-size:13px">← back to past reels</button>`;
    const bl=$('d-lock').querySelector('.archLink'); if(bl) bl.onclick=openArchive;
  }
}
function shareReel(){
  const emo=reel.statuses.map((s,i)=> s==='revealed'?'🟥': reel.hints[i]>0?'🟨':'🟩').join('');
  const g=reel.guestGot?'🎭⭐':'🎭❌';
  const tail = reel.isToday ? `\n🔥${displayStreak()}` : '';
  const msg=`🎬 the daily reel #${reel.num}\n${emo} ${g}${tail}\n${location.origin+location.pathname}`;
  if(navigator.share){ navigator.share({text:msg}).catch(()=>{}); }
  else{ navigator.clipboard.writeText(msg).then(()=>toast('copied')).catch(()=>toast('couldn’t copy')); }
}

/* ========================================================================
   ARCHIVE
   ===================================================================== */
function openArchive(){ renderArchive(); show('archive'); }
function renderArchive(){
  const cur=currentReelNum(), st=results(), grid=$('arch-grid');
  grid.innerHTML='';
  for(let n=cur; n>=1; n--){
    const rec=st[n], done=reelSolved(rec), played=rec&&rec.done;
    const b=document.createElement('button');
    b.className='archCell'+(done?' done':played?' played':'')+(n===cur?' today':'');
    b.innerHTML=`<span class="archNum">#${n}</span>${n===cur?'<span class="archTag">today</span>':done?'<span class="archTag">✓</span>':''}`;
    b.onclick=()=>openReel(n);
    grid.appendChild(b);
  }
}

/* ---------- home ---------- */
function updateHome(){
  if(!REELS) return;
  $('home-streak').textContent=displayStreak();
  const cur=currentReelNum(), rec=results()[cur];
  $('home-daily-status').textContent = rec ? (reelSolved(rec)?'solved today ✓':'in progress') : 'new reel today';
}

/* ========================================================================
   BOOT
   ===================================================================== */
document.addEventListener('DOMContentLoaded', async ()=>{
  if(new URLSearchParams(location.search).has('reset') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
    Object.keys(localStorage).filter(k=>k.startsWith('tmg_')).forEach(k=>localStorage.removeItem(k));
  }
  if(new URLSearchParams(location.search).get('curtains')==='css') document.body.classList.add('css-curtains');
  { const fs=new URLSearchParams(location.search).get('font'); const set=fs==null?'6':fs; if(set!=='0') document.body.classList.add('font'+set); }
  await loadData();
  updateHome();

  $('btn-daily').onclick=()=>openReel(currentReelNum());
  $('btn-archive').onclick=openArchive;
  document.querySelectorAll('.homeLink').forEach(b=> b.onclick=()=>{show('home');updateHome();});

  $('d-submit').onclick=dailyGuess;
  $('d-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();dailyGuess();}});
  $('d-hintBtn').onclick=dailyHint;
  $('d-revealBtn').onclick=dailyReveal;
  $('d-share').onclick=shareReel;

  if(!localStorage.getItem(K('onboard'))){
    $('howTo').showModal();
    $('closeHowTo').onclick=()=>{localStorage.setItem(K('onboard'),'1');$('howTo').close();};
  }
  const rp=new URLSearchParams(location.search).get('reel');
  if(rp && REELS){ openReel(Math.max(1,Math.min(REELS.length, parseInt(rp)||1))); }
  else { show('home'); }
});

function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  $('toastContainer').appendChild(t); setTimeout(()=>t.remove(),2600);
}
