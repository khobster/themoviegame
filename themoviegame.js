/* themoviegame.js – July 2025 upgrade */
const TXT   = document.getElementById('questionText');
const IN    = document.getElementById('userAnswer');
const BTN   = document.getElementById('submitAnswerBtn');
const RES   = document.getElementById('result');
const TMR   = document.getElementById('timer');
const SCORE = document.getElementById('score');
const SHARE = document.getElementById('shareBtn');

const correctChime = new Audio('bing-bong.mp3');
const wrongBuzz    = new Audio('incorrect-answer-for-plunko.mp3');

let current    = {};   // {question, answer}
let guessCount = 0;

/* ---------- helpers ---------- */
const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const todayKey = () => 'tmv_seen_' + new Date().toISOString().slice(0,10); // e.g. 2025-07-08
const scoreKey = 'tmv_score';

function loadScore() {
  const n = parseInt(localStorage.getItem(scoreKey), 10);
  SCORE.textContent = isNaN(n) ? 0 : n;
}
function addPoint() {
  const n = parseInt(localStorage.getItem(scoreKey), 10) || 0;
  localStorage.setItem(scoreKey, n + 1);
  SCORE.textContent = n + 1;
}

function pulse(el, cls) {
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), {once:true});
}

function cryptoRandom(max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/* ---------- question loader ---------- */
async function loadQuestion() {
  try {
    const res  = await fetch('https://raw.githubusercontent.com/khobster/myprojects/main/badwillafishing.json');
    const data = await res.json();                        // array of {question, answer}
    const used = JSON.parse(localStorage.getItem(todayKey()) || '[]');

    if (used.length >= data.length) used.length = 0;      // reset after full cycle

    let idx;
    do { idx = cryptoRandom(data.length); } while (used.includes(idx));

    current = data[idx];
    used.push(idx);
    localStorage.setItem(todayKey(), JSON.stringify(used));

    TXT.textContent = current.question;
    IN.value = '';
    IN.focus();
    SHARE.style.display = 'none';
    guessCount = 0;
  } catch (e) {
    console.error(e);
    TXT.textContent = 'Error loading question.';
  }
}

/* ---------- countdown ---------- */
function startCountdown() {
  const tick = () => {
    const now  = new Date();
    const next = new Date(now);
    next.setMinutes(Math.ceil(now.getMinutes()/10)*10, 0, 0); // next 10-minute mark

    const diff = next - now;
    if (diff <= 0) {
      TMR.textContent = 'Resetting…';
      loadQuestion().then(() => setTimeout(startCountdown, 2000));
      return;
    }
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    TMR.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  };
  tick();
  return setInterval(tick, 1000);
}

/* ---------- game flow ---------- */
function handleGuess() {
  const guess = IN.value;
  if (!guess.trim()) return;
  guessCount++;

  if (sameText(guess, current.answer)) {
    RES.textContent = 'YESSSS!';
    pulse(RES,'correct');
    correctChime.play();

    addPoint();
    SHARE.style.display = 'inline-block';
    setTimeout(() => { RES.textContent = ''; }, 15_000);
  } else {
    RES.textContent = 'Nope. Give it another shot.';
    pulse(RES,'incorrect');
    wrongBuzz.play();
  }
}

function handleShare() {
  const text = `I cracked “${current.question}” ➡️ ${current.answer} in The Movie Game `
             + `(score ${SCORE.textContent}, ${guessCount} guesses). Play: ${location.href}`;
  if (navigator.share) {
    navigator.share({text, url: location.href}).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard – share it anywhere!');
    });
  }
}

/* ---------- bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  correctChime.load(); wrongBuzz.load();

  loadScore();
  loadQuestion();
  startCountdown();

  BTN.addEventListener('click', handleGuess);
  IN.addEventListener('keydown', e => { if (e.key === 'Enter') handleGuess(); });
  SHARE.addEventListener('click', handleShare);
});
