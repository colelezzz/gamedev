let target = {r:0,g:0,b:0};
let locked = false;
let hintUsed = false;
let stats = { rounds:0, best:-1, total:0, streak:0 };

const rSlider=document.getElementById('r'), gSlider=document.getElementById('g'), bSlider=document.getElementById('b');
const rVal_el=document.getElementById('rVal'), gVal_el=document.getElementById('gVal'), bVal_el=document.getElementById('bVal');
const targetBox=document.getElementById('target-box'), playerBox=document.getElementById('player-box');
const targetRGB=document.getElementById('target-rgb'), playerRGB=document.getElementById('player-rgb');
const status_el=document.getElementById('status'), scoreBadge=document.getElementById('score-badge');
const sliderContainer=document.getElementById('slider-container');
const hintChips=[document.getElementById('hint-r'), document.getElementById('hint-g'), document.getElementById('hint-b')];
const hintArrows=['hint-r-arrow','hint-g-arrow','hint-b-arrow'].map(id=>document.getElementById(id));
const hintDiffs=['hint-r-diff','hint-g-diff','hint-b-diff'].map(id=>document.getElementById(id));
const hintMsg=document.getElementById('hint-msg');

function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function rgb(r,g,b){return `rgb(${r}, ${g}, ${b})`;}
function calcScore(r,g,b){
  const accR = 1 - Math.abs(r - target.r) / 255;
  const accG = 1 - Math.abs(g - target.g) / 255;
  const accB = 1 - Math.abs(b - target.b) / 255;
  const avg = (accR + accG + accB) / 3;
  return Math.round(Math.pow(avg, 2.2) * 100);
}
function scoreClass(s){return s>=75?'great':s>=45?'ok':'low';}
function scoreEmoji(s){
  if(s===100) return '🎯 Perfect match!';
  if(s>=96)   return '🏆 Outstanding!';
  if(s>=88)   return '✨ Excellent!';
  if(s>=75)   return '👍 Really close!';
  if(s>=58)   return '🙂 Decent try!';
  if(s>=38)   return '😅 Getting there…';
  if(s>=18)   return '😬 Way off!';
  return '💀 Not even close!';
}

function setSlidersLocked(isLocked){
  if(isLocked){
    sliderContainer.classList.add('sliders-locked');
  } else {
    sliderContainer.classList.remove('sliders-locked');
  }
}

function updatePlayer(){
  if(locked) return;
  const r=+rSlider.value, g=+gSlider.value, b=+bSlider.value;
  rVal_el.textContent=r; gVal_el.textContent=g; bVal_el.textContent=b;
  playerBox.style.backgroundColor=rgb(r,g,b);
  playerRGB.textContent=`rgb(${r}, ${g}, ${b})`;
  status_el.className='status-bar idle'; status_el.textContent='🎨 Match the target color!'; scoreBadge.textContent='—';
  saveState();
}

function showHint(){
  if(locked){ hintMsg.textContent='Answer locked! Start a new round.'; return; }
  if(hintUsed){ hintMsg.textContent='Only 1 hint per round!'; return; }
  hintUsed = true;
  const pick = Math.floor(Math.random()*3);
  const r=+rSlider.value, g=+gSlider.value, b=+bSlider.value;
  const vals=[r,g,b], tgts=[target.r,target.g,target.b];
  const diff=tgts[pick]-vals[pick], abs=Math.abs(diff);
  const chip=hintChips[pick];
  chip.classList.add('revealed');
  chip.classList.remove('up','down','exact');
  if(diff>0){chip.classList.add('up'); hintArrows[pick].textContent='▲'; hintDiffs[pick].textContent=`+${abs}`;}
  else if(diff<0){chip.classList.add('down'); hintArrows[pick].textContent='▼'; hintDiffs[pick].textContent=`-${abs}`;}
  else{chip.classList.add('exact'); hintArrows[pick].textContent='✓'; hintDiffs[pick].textContent='exact';}
  hintMsg.textContent='Hint used for this round!';
  saveState();
}

function resetHints(){
  hintUsed=false;
  hintChips.forEach(c=>{c.className='hint-chip';});
  hintArrows.forEach(a=>a.textContent='?');
  hintDiffs.forEach(d=>d.textContent='—');
  hintMsg.textContent='1 hint per round — use it wisely!';
}

function updateStats(score){
  stats.rounds++;
  stats.total+=score;
  if(score>stats.best) stats.best=score;
  if(score>=85) stats.streak++; else stats.streak=0;
  renderStats();
}
function renderStats(){
  document.getElementById('stat-rounds').textContent=stats.rounds;
  document.getElementById('stat-best').textContent=stats.best>=0?stats.best:'—';
  document.getElementById('stat-avg').textContent=stats.rounds>0?Math.round(stats.total/stats.rounds):'—';
  document.getElementById('stat-streak').textContent=stats.streak;
  const pct=stats.best>=0?stats.best:0;
  document.getElementById('stat-bar').style.width=pct+'%';
  ['stat-rounds','stat-best','stat-avg','stat-streak'].forEach(id=>{
    const el=document.getElementById(id);
    el.classList.remove('bump2'); void el.offsetWidth; el.classList.add('bump2');
    setTimeout(()=>el.classList.remove('bump2'),400);
  });
}
function resetStats(){stats={rounds:0,best:-1,total:0,streak:0};renderStats();}

function newGame(){
  target={r:randInt(0,255),g:randInt(0,255),b:randInt(0,255)};
  targetBox.style.backgroundColor=rgb(target.r,target.g,target.b);
  targetRGB.textContent='rgb(?, ?, ?)';
  locked=false;
  setSlidersLocked(false);
  rSlider.value=0; gSlider.value=0; bSlider.value=0;
  rVal_el.textContent=0; gVal_el.textContent=0; bVal_el.textContent=0;
  playerBox.style.backgroundColor=rgb(0,0,0);
  playerRGB.textContent='rgb(0, 0, 0)';
  resetHints();
  status_el.className='status-bar idle';
  status_el.textContent='🎨 Match the target color!';
  scoreBadge.textContent='—';
  saveState();
}

function lockIn(){
  if(locked)return;
  locked=true;
  setSlidersLocked(true);
  const r=+rSlider.value, g=+gSlider.value, b=+bSlider.value;
  const score=calcScore(r,g,b), cls=scoreClass(score);
  targetRGB.textContent=`rgb(${target.r}, ${target.g}, ${target.b})`;
  status_el.className=`status-bar ${cls}`;
  status_el.textContent=`${scoreEmoji(score)} — ${score}/100`;
  scoreBadge.textContent=score;
  scoreBadge.classList.remove('bump'); void scoreBadge.offsetWidth; scoreBadge.classList.add('bump');
  setTimeout(()=>scoreBadge.classList.remove('bump'),400);
  updateStats(score);
  saveState();
  if(score>=85) confetti();
}

function resetAll(){ resetStats(); newGame(); }

function confetti(){
  const cols=['#ffb2b2','#ffd6e0','#ffd700','#ff88aa','#ffffff','#ffaacc','#ffddee'];
  for(let i=0;i<60;i++)setTimeout(()=>{
    const el=document.createElement('div'); el.className='cp';
    const sz=6+Math.random()*10;
    el.style.cssText=`left:${Math.random()*100}vw;top:-12px;width:${sz}px;height:${sz*(Math.random()>.45?1:2.2)}px;background:${cols[~~(Math.random()*cols.length)]};border-radius:${Math.random()>.4?'50%':'3px'};border:1.5px solid rgba(255,255,255,0.4);animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*.4}s;`;
    document.body.appendChild(el); setTimeout(()=>el.remove(),5000);
  },i*22);
}

// ─── PARTICLE SYSTEM ───
function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  || window.innerWidth;
    H = canvas.height = rect.height || window.innerHeight;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-scheme') === 'dark';
  }

  function createParticles() {
    const count = Math.floor((W * H) / 7500);
    particles = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      a:  Math.random() * 0.22 + 0.1
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const alpha = isDark() ? 0.55 : 1;
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a * alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = H + p.r;
      if (p.y > H + p.r) p.y = -p.r;
    });
    requestAnimationFrame(draw);
  }

  resize(); createParticles(); draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
}

initParticles(document.getElementById('particle-canvas'));

const scheme_el=document.getElementById('scheme');
scheme_el.addEventListener('change',e=>{document.documentElement.setAttribute('data-scheme',e.target.value);localStorage.setItem('cag-scheme',e.target.value);});

const modalOverlay=document.getElementById('modal-overlay');
document.getElementById('btn-help').addEventListener('click',()=>modalOverlay.classList.add('open'));
document.getElementById('modal-close').addEventListener('click',()=>modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click',e=>{if(e.target===modalOverlay)modalOverlay.classList.remove('open');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')modalOverlay.classList.remove('open');});
document.querySelector('.btn-back').addEventListener('click', ()=>{ sessionStorage.removeItem('cag-state'); });

rSlider.oninput=updatePlayer; gSlider.oninput=updatePlayer; bSlider.oninput=updatePlayer;
document.getElementById('btn-lock').addEventListener('click',lockIn);
document.getElementById('btn-hint').addEventListener('click',showHint);
document.getElementById('btn-new').addEventListener('click',newGame);
document.getElementById('btn-reset').addEventListener('click',resetAll);

function saveState(){
  try {
    sessionStorage.setItem('cag-state', JSON.stringify({
      target, locked, hintUsed,
      hintChipStates: hintChips.map((c,i)=>({
        classes: c.className,
        arrow: hintArrows[i].textContent,
        diff:  hintDiffs[i].textContent
      })),
      hintMsg: hintMsg.textContent,
      r: rSlider.value, g: gSlider.value, b: bSlider.value,
      targetRGBText: targetRGB.textContent,
      statusClass: status_el.className,
      statusText:  status_el.textContent,
      scoreText:   scoreBadge.textContent,
      stats
    }));
  } catch(e){}
}

function restoreState(){
  try {
    const raw = sessionStorage.getItem('cag-state');
    if(!raw) return false;
    const s = JSON.parse(raw);
    target   = s.target   || {r:0,g:0,b:0};
    locked   = s.locked   ?? false;
    hintUsed = s.hintUsed ?? false;
    stats    = s.stats    || {rounds:0,best:-1,total:0,streak:0};
    rSlider.value = s.r ?? 0;
    gSlider.value = s.g ?? 0;
    bSlider.value = s.b ?? 0;
    const r=+rSlider.value, g=+gSlider.value, b=+bSlider.value;
    rVal_el.textContent=r; gVal_el.textContent=g; bVal_el.textContent=b;
    targetBox.style.backgroundColor = `rgb(${target.r},${target.g},${target.b})`;
    playerBox.style.backgroundColor = `rgb(${r},${g},${b})`;
    targetRGB.textContent = s.targetRGBText || 'rgb(?, ?, ?)';
    playerRGB.textContent = `rgb(${r}, ${g}, ${b})`;
    status_el.className   = s.statusClass || 'status-bar idle';
    status_el.textContent = s.statusText  || '🎨 Match the target color!';
    scoreBadge.textContent = s.scoreText  || '—';
    if(s.hintChipStates){
      s.hintChipStates.forEach((hs,i)=>{
        hintChips[i].className         = hs.classes;
        hintArrows[i].textContent      = hs.arrow;
        hintDiffs[i].textContent       = hs.diff;
      });
    }
    hintMsg.textContent = s.hintMsg || '1 hint per round — use it wisely!';
    setSlidersLocked(locked);
    renderStats();
    return true;
  } catch(e){ return false; }
}

(function init(){
  const s=localStorage.getItem('cag-scheme')||'default';
  document.documentElement.setAttribute('data-scheme',s);
  scheme_el.value=s;
  if(!restoreState()){
    renderStats();
    newGame();
  }
})();