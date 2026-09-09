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
      REELS = await (await fetch('daily_reels.json?v=69')).json();
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
  $('d-submit').disabled=resolved;
  $('d-submit').style.display=resolved?'none':'';           // hide GUESS once this film is answered
  $('d-hintBtn').disabled=resolved||reel.hints[i]>=2;
  $('d-revealBtn').style.display=resolved?'none':'';
  if(s==='solved') $('d-result').innerHTML=`<span class="ok">✓ ${c.answer}</span>`;
  else if(s==='revealed') $('d-result').innerHTML=`<span class="bad">${c.answer}</span>`;
  else $('d-result').textContent='';
  if($('guessModal').classList.contains('open')) $('gm-clue').textContent=c.question;
}
function renderProgress(){
  const solved=reel.statuses.filter(s=>s==='solved').length;
  $('d-progress').textContent=`${solved}/${reel.statuses.length} films`;
}

/* ----- guess via popup with our OWN on-screen keyboard (never the native one,
   so the board never moves). one popup, two modes: 'clue' / 'guest' ----- */
let guessMode='clue';
let typed='';
let gmPlaceholder='name the movie…';

const KB_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','back'],
  ['space']
];
function buildGuessKeyboard(){
  const kb=$('gm-kbd'); if(!kb) return;
  kb.innerHTML='';
  KB_ROWS.forEach(row=>{
    const r=document.createElement('div'); r.className='krow';
    row.forEach(k=>{
      const b=document.createElement('button'); b.type='button';
      b.className='gm-key'+(k==='back'?' back':'')+(k==='space'?' wide':'');
      b.textContent = k==='back' ? '⌫' : k==='space' ? 'space' : k;
      b.onclick=()=>{ if(k==='back') pressBack(); else if(k==='space') pressSpace(); else pressKey(k); };
      r.appendChild(b);
    });
    kb.appendChild(r);
  });
}
function renderTyped(){
  const t=$('gm-typed'); if(!t) return;
  t.textContent = typed ? typed : gmPlaceholder;
  t.classList.toggle('empty', !typed);
}
function pressKey(ch){ if(typed.length<60){ typed+=ch; renderTyped(); } }
function pressBack(){ typed=typed.slice(0,-1); renderTyped(); }
function pressSpace(){ if(typed && typed.slice(-1)!==' ' && typed.length<60){ typed+=' '; renderTyped(); } }

function openGuessModal(mode){
  mode = mode==='guest' ? 'guest' : 'clue';
  if(mode==='clue'){
    const i=reel.active; if(!reel.data || reel.statuses[i]!=='open') return;
    $('gm-opp').textContent='OPPOSITE OF';
    $('gm-clue').textContent=reel.data.clues[i].question;
    gmPlaceholder='name the movie…';
  } else {
    if(!reel.data || reel.guestGot || reel.done) return;
    $('gm-opp').textContent='WHO IS IT?';
    $('gm-clue').textContent='one actor is in all four films';
    gmPlaceholder='name the actor…';
  }
  guessMode=mode;
  typed=''; renderTyped(); $('gm-msg').textContent='';
  $('guessModal').classList.add('open'); document.body.classList.add('modal-open');
}
function closeGuessModal(){
  $('guessModal').classList.remove('open'); document.body.classList.remove('modal-open');
}
function submitModal(){
  if(guessMode==='guest') submitGuestGuess(typed);
  else submitGuess(typed);
}
function submitGuess(v){
  const i=reel.active; if(reel.statuses[i]!=='open') return;
  v=(v||'').trim(); if(!v) return;
  if(isMatch(v, reel.data.clues[i].answer)){
    reel.statuses[i]='solved'; play(S_OK); showPow('YES!'); closeGuessModal(); afterClueResolved(true);
  } else {
    play(S_BAD); showPow('NO!'); $('gm-msg').textContent='nope, try another'; typed=''; renderTyped();
  }
}

/* ===== YES! / NO! metallic 3D brick pop (ported from mookie) ===== */
function showPow(message){
  const wrap=document.createElement('div');
  wrap.style.cssText='position:fixed;inset:0;display:grid;place-items:center;z-index:9999;pointer-events:none';
  const isYes=(message==='YES!');
  const txt=document.createElement('div');
  txt.textContent=message;
  txt.className='pow-brick '+(isYes?'pow-gold':'pow-silver');
  txt.style.fontSize = isYes ? 'clamp(120px,36vw,280px)' : 'clamp(100px,30vw,240px)';
  wrap.appendChild(txt); document.body.appendChild(wrap);
  setTimeout(()=>{ try{document.body.removeChild(wrap);}catch(_){} },900);
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

/* ----- mystery guest / WHO IS IT?  (typed in the same popup as the movie) ----- */
function renderGuest(){
  const wrap=$('d-guestWrap');
  if(reel.done || reel.guestRevealed){
    wrap.innerHTML=`<div class="guestReveal ${reel.guestGot?'got':''}">the guest was <b>${reel.data.guest}</b>${reel.guestGot?', and you nailed it':''}</div>`;
    return;
  }
  if(reel.guestGot){
    wrap.innerHTML=`<div class="guestReveal got"><b>${reel.data.guest}</b> · nice, now finish the board</div>`;
    return;
  }
  if(reel.filmsDone){                                   // FINALE — the guest is the whole screen now
    wrap.innerHTML=`
      <div class="guestPrompt finale"><span class="whois">WHO IS IT?</span><span class="sub">one actor is in all four films</span></div>
      <button id="d-guestOpen" class="goBtn">NAME THE ACTOR</button>
      <button id="d-guestGiveup" class="revealBtn" style="display:block;margin:12px auto 0">give up, show me who</button>`;
    $('d-guestOpen').onclick=()=>openGuessModal('guest');
    $('d-guestGiveup').onclick=giveUpGuest;
    return;
  }
  // not done yet: one quiet line that pops the guess box (no letter hint)
  wrap.innerHTML=`<button id="d-guestOpen" class="guestOpen">bonus: one actor is in all four. know who? ›</button>`;
  $('d-guestOpen').onclick=()=>openGuessModal('guest');
}
function submitGuestGuess(v){
  v=(v||'').trim(); if(!v) return;
  if(matchGuest(v, reel.data)){
    reel.guestGot=true; play(S_GAMEO); showPow('YES!'); toast('bonus, nice'); saveReel();   // cool music sting for nailing the actor
    closeGuessModal();
    if(reel.filmsDone) lockReel(); else renderGuest();
  } else {
    reel.guestTries++; play(S_BAD); showPow('NO!'); saveReel();
    $('gm-msg').textContent='nope, try again'; typed=''; renderTyped();
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
      $('d-lock').innerHTML=`that’s a wrap · streak <b>${streak}</b><br>next reel in <b>${h}:${m}:${ss}</b>`;
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
  const url=location.origin+location.pathname;
  const body=`🎬 the daily reel #${reel.num}\n${emo} ${g}${tail}`;
  const full=`${body}\n${url}`;
  const copy=()=>{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(full).then(()=>toast('copied!')).catch(()=>toast('couldn’t copy'));
    } else toast('couldn’t copy');
  };
  const isMobile = matchMedia('(pointer: coarse)').matches;
  if(isMobile && navigator.share){
    navigator.share({text:body,url}).catch(err=>{ if(!err||err.name!=='AbortError') copy(); });
  } else copy();
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
  const cur=currentReelNum(), rec=results()[cur];
  const streak=displayStreak();
  const bits=[];
  if(rec) bits.push(reelSolved(rec) ? 'solved today' : 'in progress');
  if(streak>0) bits.push(`<b class="streakVal">${streak} day streak</b>`);   // only show a streak once you have one
  $('homeMeta').innerHTML = bits.join('<span class="metaDot">·</span>');
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

  $('d-submit').onclick=()=>openGuessModal('clue');
  buildGuessKeyboard();
  $('gm-submit').onclick=submitModal;
  $('gm-close').onclick=closeGuessModal;
  $('guessModal').addEventListener('click',e=>{ if(e.target.id==='guessModal') closeGuessModal(); });
  // desktop: let a real keyboard drive our on-screen one while the popup is open
  document.addEventListener('keydown',e=>{
    if(!$('guessModal').classList.contains('open')) return;
    if(e.key==='Enter'){ e.preventDefault(); submitModal(); }
    else if(e.key==='Backspace'){ e.preventDefault(); pressBack(); }
    else if(e.key===' '){ e.preventDefault(); pressSpace(); }
    else if(e.key==='Escape'){ closeGuessModal(); }
    else if(/^[a-z0-9]$/i.test(e.key)){ pressKey(e.key.toLowerCase()); }
  });
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
