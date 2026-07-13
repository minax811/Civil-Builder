"use strict";
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

const bgImg = new Image();
bgImg.src = 'background.jpeg';

const LEVELS = [
  {
    name: '1 · Starter',
    worldW: 12.5, worldH: 9.4,
    groundY: 6, gapL: 3.5, gapR: 8.5, waterY: 8.1,
    flagX: 10.9, anchors: [[3.5,6],[8.5,6]],
    midRocks: [],
    budget: 5200,
    intro: 'A lake lies between the road, cross it'
  },
  {
    name: '2 · hills',
    worldW: 17, worldH: 10.6,
    groundY: 6, gapL: 3.5, gapR: 13.5, waterY: 9.2,
    flagX: 15.4, anchors: [[3.5,6],[13.5,6],[8.5,7.6]],
    budget: 11800,
    midRocks: [{x: 8.5, top: 7.6, w: 1.5}],
    intro: 'This is a 10 metre wide lake cross(twice as before). Use the rock in the middle — two short bridges beat one long one.'
  },
];
let levelIdx = 0;
let LV = LEVELS[0];

function loadLevel(i){
  levelIdx = i;
  LV = LEVELS[i];
  joints = LV.anchors.map(a => ({x: a[0], y: a[1], anchor: true}));
  beams = [];
  undoStack = [];
  sim = null;
  mode = 'build';
  document.getElementById('levelPill').textContent = 'Level ' + LV.name;
  setTestBtn(true);
  resize();
  updateBudget();
  showCard(LV.name, LV.intro, [['Let\'s build!', hideCard, 'primary']]);
}

const MAT = {
  road:  {rate: 340, breakStrain: 0.00045, drivable: true },
  steel: {rate: 180, breakStrain: 0.00090, drivable: false},
};

document.getElementById('roadCost').textContent  = '$' + MAT.road.rate + '/m';
document.getElementById('steelCost').textContent = '$' + MAT.steel.rate + '/m';

let joints = LV.anchors.map(a => ({x: a[0], y: a[1], anchor: true}));
let beams  = [];
let undoStack = [];

let mode = 'build';
let tool = 'road';
let sim = null;


const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const snap = v => Math.round(v * 2) / 2;


function jointAt(x, y){
  for (let i = 0; i < joints.length; i++)
    if (dist(joints[i].x, joints[i].y, x, y) < 0.28) return i;
  return -1;
}

function beamCost(bm){
  const A = joints[bm.a], B = joints[bm.b];
  return Math.round(dist(A.x, A.y, B.x, B.y) * MAT[bm.mat].rate);
}
function totalCost(){
  let c = 0;
  for (const bm of beams) c += beamCost(bm);
  return c;
}
function updateBudget(){
  const c = totalCost(), el = document.getElementById('budgetPill');
  el.innerHTML = `<b>$${c.toLocaleString()}</b> / $${LV.budget.toLocaleString()}`;
  el.classList.toggle('over', c > LV.budget);
}

function pushUndo(){
  undoStack.push(JSON.stringify({joints, beams}));
  if (undoStack.length > 60) undoStack.shift();
}
function cleanOrphans(){
  const used = new Set();
  beams.forEach(b => { used.add(b.a); used.add(b.b); });
  for (let i = joints.length - 1; i >= 0; i--){
    if (!joints[i].anchor && !used.has(i)){
      joints.splice(i, 1);
      beams.forEach(b => { if (b.a > i) b.a--; if (b.b > i) b.b--; });
    }
  }
}

let dragFrom = null;
let hover = {x: 0, y: 0};

cv.addEventListener('pointerdown', e => {
  if (mode !== 'build') return;
  const x = wx(e.offsetX), y = wy(e.offsetY);
  if (tool === 'erase'){ eraseAt(x, y); return; }
  const j = jointAt(x, y);
  dragFrom = j >= 0
    ? {x: joints[j].x, y: joints[j].y, j}
    : {x: snap(x), y: snap(y), j: -1};
  cv.setPointerCapture(e.pointerId);
});

cv.addEventListener('pointermove', e => {
  const x = wx(e.offsetX), y = wy(e.offsetY);
  const j = jointAt(x, y);
  hover = j >= 0 ? {x: joints[j].x, y: joints[j].y} : {x: snap(x), y: snap(y)};
});

cv.addEventListener('pointerup', e => {
  if (!dragFrom) return;
  const x = wx(e.offsetX), y = wy(e.offsetY);
  const jEnd = jointAt(x, y);
  const ex = jEnd >= 0 ? joints[jEnd].x : snap(x);
  const ey = jEnd >= 0 ? joints[jEnd].y : snap(y);

  const len = dist(dragFrom.x, dragFrom.y, ex, ey);
  if (len >= 0.4 && len <= 2.5){
    const cost = Math.round(len * MAT[tool].rate);
    if (totalCost() + cost > LV.budget){
      flashBudget();
      dragFrom = null;
      return;
    }
    pushUndo();
    let jA = dragFrom.j;
    if (jA < 0){ joints.push({x: dragFrom.x, y: dragFrom.y, anchor: false}); jA = joints.length - 1; }
    let jB = jEnd;
    if (jB < 0){ joints.push({x: ex, y: ey, anchor: false}); jB = joints.length - 1; }
    if (jA !== jB && !beams.some(b => (b.a===jA && b.b===jB) || (b.a===jB && b.b===jA))){
      beams.push({a: jA, b: jB, mat: tool});
      updateBudget();
    } else {
      undoStack.pop();
      cleanOrphans();
    }
  }
  dragFrom = null;
});

function eraseAt(x, y){
  let best = -1, bd = 0.22;
  for (let i = 0; i < beams.length; i++){
    const A = joints[beams[i].a], B = joints[beams[i].b];
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx*dx + dy*dy || 1e-9;
    let t = ((x - A.x)*dx + (y - A.y)*dy) / L2;
    t = Math.max(0, Math.min(1, t));
    const d = dist(x, y, A.x + dx*t, A.y + dy*t);
    if (d < bd){ bd = d; best = i; }
  }
  if (best >= 0){
    pushUndo();
    beams.splice(best, 1);
    cleanOrphans();
    updateBudget();
  }
}

document.querySelectorAll('.tool').forEach(el => {
  el.addEventListener('click', () => {
    if (mode !== 'build') return;
    tool = el.dataset.tool;
    document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t === el));
  });
});

document.getElementById('undoBtn').addEventListener('click', () => {
  if (mode !== 'build' || !undoStack.length) return;
  const s = JSON.parse(undoStack.pop());
  joints = s.joints; beams = s.beams;
  updateBudget();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (mode !== 'build' || !beams.length) return;
  pushUndo();
  beams = [];
  cleanOrphans();
  updateBudget();
});

let hintT = null;
function flashHint(msg){
  const h = document.getElementById('hint');
  h.innerHTML = msg;
  h.style.opacity = 1;
  clearTimeout(hintT);
  hintT = setTimeout(() => h.style.opacity = 0.85, 2500);
}
function flashBudget(){
  const el = document.getElementById('budgetPill');
  el.classList.add('over');
  setTimeout(() => updateBudget(), 600);
  flashHint('Too expensive, not enough money for that beam');
}

function startSim(){
  const pts = joints.map(j => ({x: j.x, y: j.y, ox: j.x, oy: j.y, inv: j.anchor ? 0 : 1, r: 0}));
  const cons = beams.map(b => ({
    a: b.a, b: b.b, mat: b.mat,
    rest: dist(joints[b.a].x, joints[b.a].y, joints[b.b].x, joints[b.b].y),
    acc: 0, strain: 0, broken: false
  }));

  const gy = LV.groundY, r = 0.34, cx = 1.1;
  const base = pts.length;
  const W = (x, y, rad, inv) => pts.push({x, y, ox: x, oy: y, inv, r: rad});
  W(cx,        gy - r,        r, 0.12);
  W(cx + 1.5,  gy - r,        r, 0.12);
  W(cx + 0.75, gy - r - 0.85, 0, 0.25);

  const carCons = [
    {a: base,     b: base + 1, rest: 1.5},
    {a: base,     b: base + 2, rest: Math.hypot(0.75, 0.85)},
    {a: base + 1, b: base + 2, rest: Math.hypot(0.75, 0.85)},
  ];

  sim = {pts, cons, carCons, base, over: false};
  mode = 'sim';
}

function terrainSegs(){
  const g = LV.groundY;
  const segs = [
    [-1, g, LV.gapL, g],
    [LV.gapR, g, LV.worldW + 1, g],
    [LV.gapL, g, LV.gapL, g + 5],
    [LV.gapR, g, LV.gapR, g + 5],
  ];
  for (const r of LV.midRocks)
    segs.push([r.x - r.w/2, r.top, r.x + r.w/2, r.top]);
  return segs;
}

function collideWheelSeg(p, x1, y1, x2, y2, pA = null, pB = null){
  const dx = x2 - x1, dy = y2 - y1, L2 = dx*dx + dy*dy || 1e-9;
  let t = ((p.x - x1)*dx + (p.y - y1)*dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const cxp = x1 + dx*t, cyp = y1 + dy*t;
  let nx = p.x - cxp, ny = p.y - cyp;
  const d = Math.hypot(nx, ny);
  if (d >= p.r || d < 1e-9) return false;
  nx /= d; ny /= d;
  const pen = p.r - d;

  if (pA && pB){
    const invBeam = (1-t)*(1-t)*pA.inv + t*t*pB.inv;
    const wSum = p.inv + invBeam || 1e-9;
    const wp = p.inv / wSum, wb = 1 - wp;
    p.x += nx*pen*wp; p.y += ny*pen*wp;
    const push = pen*wb;
    if (pA.inv){ pA.x -= nx*push*(1-t); pA.y -= ny*push*(1-t); }
    if (pB.inv){ pB.x -= nx*push*t;     pB.y -= ny*push*t;     }
  } else {
    p.x += nx*pen; p.y += ny*pen;
  }

  let tx = -ny, ty = nx;
  if (tx < 0){ tx = -tx; ty = -ty; }
  const vx = p.x - p.ox, vy = p.y - p.oy;
  const vt = vx*tx + vy*ty;
  const target = 0.013;
  const add = Math.max(-0.0018, Math.min(0.0018, target - vt));
  p.ox -= tx*add; p.oy -= ty*add;

  const vn = vx*nx + vy*ny;
  if (vn < 0){ p.ox += nx*vn*0.6; p.oy += ny*vn*0.6; }
  return true;
}

function stopSim(){
  sim = null;
  mode = 'build';
}

function stepSim(){
  const {pts, cons, carCons, base} = sim;
  const SUB = 4, ITER = 14, dt = 1/60/SUB, g = 9.8, terr = terrainSegs();

  for (const c of cons) c.acc = 0;

  for (let s = 0; s < SUB; s++){
    for (const p of pts){
      if (!p.inv) continue;
      const vx = (p.x - p.ox) * 0.998;
      const vy = (p.y - p.oy) * 0.998;
      p.ox = p.x; p.oy = p.y;
      p.x += vx;
      p.y += vy + g * dt * dt;
    }
    for (let it = 0; it < ITER; it++){
      for (const c of cons){
        if (c.broken) continue;
        const A = pts[c.a], B = pts[c.b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const L = Math.hypot(dx, dy) || 1e-9;
        c.acc += (L - c.rest) / c.rest;
        const diff = (L - c.rest) / L;
        const wS = A.inv + B.inv || 1e-9;
        A.x += dx * diff * (A.inv / wS); A.y += dy * diff * (A.inv / wS);
        B.x -= dx * diff * (B.inv / wS); B.y -= dy * diff * (B.inv / wS);
      }
      for (const c of carCons){
        const A = pts[c.a], B = pts[c.b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const L = Math.hypot(dx, dy) || 1e-9;
        const diff = (L - c.rest) / L * 0.5;
        A.x += dx * diff; A.y += dy * diff;
        B.x -= dx * diff; B.y -= dy * diff;
      }
      for (let w = base; w < base + 2; w++){
        const p = pts[w];
        for (const t of terr) collideWheelSeg(p, t[0], t[1], t[2], t[3]);
        for (const c of cons){
          if (c.broken || !MAT[c.mat].drivable) continue;
          const A = pts[c.a], B = pts[c.b];
          collideWheelSeg(p, A.x, A.y, B.x, B.y, A, B);
        }
      }
    }
  }

  for (const c of cons){
    if (c.broken) continue;
    c.strain = c.acc / (SUB * ITER);
    if (Math.abs(c.strain) > MAT[c.mat].breakStrain) c.broken = true;
  }

  const front = pts[base + 1], rear = pts[base], roof = pts[base + 2];
  if (front.x > LV.flagX){
    endSim(true);
  } else if (rear.y > LV.waterY + 0.3 || front.y > LV.waterY + 0.3 || roof.y > LV.waterY + 0.3){
    endSim(false);
  }
}

function endSim(won){
  sim.over = true;
  if (won){
    const btns = [['Rebuild', backToBuild, 'ghost']];
    if (levelIdx < LEVELS.length - 1)
      btns.push(['Next level ▶', () => { hideCard(); loadLevel(levelIdx + 1); }, 'primary']);
    else
      btns.push(['Play again', () => { hideCard(); loadLevel(0); }, 'primary']);
    showCard('You Win',
      `The truck made it across.<br>Build cost: <b>$${totalCost().toLocaleString()}</b> of $${LV.budget.toLocaleString()}.` +
      (levelIdx === LEVELS.length - 1 ? '<br><br><b>You beat every level!</b>' : ''),
      btns);
  } else {
    showCard('The trucks down',
  'The truck fell in the water. Watch which beams become red, thats the one to reinforce.',
  [['Back to build', backToBuild, 'primary']]);
  }
}

function backToBuild(){
  hideCard();
  stopSim();
  setTestBtn(true);
}

function setTestBtn(building){
  const tb = document.getElementById('testBtn');
  tb.textContent = building ? '▶ Test drive' : '■ Back to build';
  tb.className = building ? 'primary' : 'stop';
}

function showCard(title, text, btns){
  document.getElementById('cardTitle').innerHTML = title;
  document.getElementById('cardText').innerHTML = text;
  const row = document.getElementById('cardBtns'); row.innerHTML = '';
  for (const [label, fn, cls] of btns){
    const b = document.createElement('button');
    b.textContent = label; if (cls) b.className = cls;
    b.onclick = fn; row.appendChild(b);
  }
  document.getElementById('overlay').classList.add('show');
}

function hideCard(){ document.getElementById('overlay').classList.remove('show'); }

document.getElementById('testBtn').addEventListener('click', () => {
  if (mode === 'build'){
    if (beams.length === 0){ flashHint('Build something first!'); return; }
    startSim();
    setTestBtn(false);
  } else {
    stopSim();
    setTestBtn(true);
  }
});

let S = 60;
let OX = 0, OY = 0;

const px = x => OX + x * S;
const py = y => OY + y * S;

const wx = x => (x - OX) / S;
const wy = y => (y - OY) / S;

function resize(){
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width  = w * dpr;
  cv.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S  = Math.min(w / LV.worldW, h / LV.worldH);
  OX = (w - LV.worldW * S) / 2;
  OY = (h - LV.worldH * S) / 2;
}
window.addEventListener('resize', resize);
resize();

function drawBackdrop(w, h){
  if (bgImg.complete && bgImg.naturalWidth){
    ctx.drawImage(bgImg, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#8fd3f4';
    ctx.fillRect(0, 0, w, h);
  }
}

function drawTerrain(){
  const g = LV.groundY;

  ctx.fillStyle = '#8a6248';
  ctx.fillRect(px(-1), py(g), px(LV.gapL) - px(-1), py(LV.worldH+1) - py(g));
  ctx.fillRect(px(LV.gapR), py(g), px(LV.worldW+1) - px(LV.gapR), py(LV.worldH+1) - py(g));

  ctx.fillStyle = '#5fae57';
  ctx.fillRect(px(-1),     py(g)-6, px(LV.gapL) - px(-1),        10);
  ctx.fillRect(px(LV.gapR),py(g)-6, px(LV.worldW+1)-px(LV.gapR), 10);

  for (const r of LV.midRocks){
    ctx.fillStyle = '#8a6248';
    ctx.beginPath();
    ctx.moveTo(px(r.x - r.w/2), py(r.top));
    ctx.lineTo(px(r.x + r.w/2), py(r.top));
    ctx.lineTo(px(r.x + r.w/2 + 0.25), py(LV.worldH + 1));
    ctx.lineTo(px(r.x - r.w/2 - 0.25), py(LV.worldH + 1));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5fae57';
    ctx.fillRect(px(r.x - r.w/2), py(r.top) - 5, px(r.x + r.w/2) - px(r.x - r.w/2), 8);
  }

  const fx = px(LV.flagX), fy = py(g);
  ctx.strokeStyle = '#2b3a4a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - S*1.1); ctx.stroke();
  ctx.fillStyle = '#e64545';
  ctx.beginPath();
  ctx.moveTo(fx, fy - S*1.1);
  ctx.lineTo(fx + S*0.55, fy - S*0.92);
  ctx.lineTo(fx, fy - S*0.74);
  ctx.closePath(); ctx.fill();
}

function drawGrid(){
  ctx.fillStyle = 'rgba(43,58,74,.28)';
  for (let x = 0; x <= LV.worldW; x += 0.5)
    for (let y = 1; y <= LV.groundY + 2.5; y += 0.5){
      if (y > LV.groundY && (x < LV.gapL || x > LV.gapR)) continue;
      let onRock = false;
      for (const r of LV.midRocks)
        if (y > r.top && Math.abs(x - r.x) < r.w/2 + 0.3) onRock = true;
      if (onRock) continue;
      ctx.beginPath(); ctx.arc(px(x), py(y), 2, 0, Math.PI*2); ctx.fill();
    }
}

function strainCol(c){
  const t = Math.min(1, Math.abs(c.strain) / MAT[c.mat].breakStrain);
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);
  if (t < 0.5){ const k = t * 2;       return `rgb(${lerp(55,245,k)},${lerp(185,184,k)},${lerp(110,64,k)})`; }
  else        { const k = (t - .5) * 2; return `rgb(${lerp(245,184,k)},${lerp(184,69,k)},${lerp(64,69,k)})`; }
}

function drawBeam(x1, y1, x2, y2, mat, color){
  ctx.lineCap = 'round';
  if (mat === 'road'){
    ctx.strokeStyle = color || '#3d4450';
    ctx.lineWidth = 0.16 * S;
    ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,90,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([S*0.18, S*0.14]);
    ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = color || '#8fa3b8';
    ctx.lineWidth = 0.08 * S;
    ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
  }
}

function drawJoint(x, y, anchor){
  ctx.beginPath(); ctx.arc(px(x), py(y), anchor ? 7 : 5, 0, Math.PI*2);
  ctx.fillStyle = anchor ? '#ffb84a' : '#fff8ee'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#2b3a4a'; ctx.stroke();
}

function drawCar(){
  const {pts, base} = sim;
  const A = pts[base], B = pts[base + 1];
  const ang = Math.atan2(B.y - A.y, B.x - A.x);
  const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;

  ctx.save();
  ctx.translate(px(cx), py(cy));
  ctx.rotate(ang);
  const u = S;
  ctx.fillStyle = '#e64545';
  ctx.beginPath(); ctx.roundRect(-0.95*u, -0.62*u, 1.9*u, 0.42*u, 6); ctx.fill();
  ctx.fillStyle = '#c93b3b';
  ctx.beginPath(); ctx.roundRect(-0.35*u, -1.0*u, 0.75*u, 0.45*u, 6); ctx.fill();
  ctx.fillStyle = '#bfe6f5';
  ctx.beginPath(); ctx.roundRect(-0.25*u, -0.94*u, 0.55*u, 0.3*u, 4); ctx.fill();
  ctx.restore();

  for (const p of [A, B]){
    ctx.beginPath(); ctx.arc(px(p.x), py(p.y), p.r * S, 0, Math.PI*2);
    ctx.fillStyle = '#2b3a4a'; ctx.fill();
    ctx.beginPath(); ctx.arc(px(p.x), py(p.y), p.r * S * 0.45, 0, Math.PI*2);
    ctx.fillStyle = '#d8dee6'; ctx.fill();
  }
}

function frame(){
  ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
  drawBackdrop(cv.clientWidth, cv.clientHeight);
  drawTerrain();

  if (mode === 'build'){
    drawGrid();
    for (const bm of beams){
      const A = joints[bm.a], B = joints[bm.b];
      drawBeam(A.x, A.y, B.x, B.y, bm.mat);
    }
    for (const j of joints) drawJoint(j.x, j.y, j.anchor);
    if (dragFrom){
      const ok = dist(dragFrom.x, dragFrom.y, hover.x, hover.y) <= 2.5;
      ctx.globalAlpha = 0.6;
      drawBeam(dragFrom.x, dragFrom.y, hover.x, hover.y, tool, ok ? null : '#e64545');
      ctx.globalAlpha = 1;
      const midx = px((dragFrom.x + hover.x) / 2);
      const midy = py((dragFrom.y + hover.y) / 2) - 14;
      const L = dist(dragFrom.x, dragFrom.y, hover.x, hover.y);
      ctx.font = '700 12px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillStyle = ok ? '#2b3a4a' : '#e64545';
      ctx.fillText(L.toFixed(1) + ' m · $' + Math.round(L * MAT[tool].rate), midx, midy);
    }
  } else {
    if (!sim.over) stepSim();
    for (const c of sim.cons){
      if (c.broken) continue;
      const A = sim.pts[c.a], B = sim.pts[c.b];
      drawBeam(A.x, A.y, B.x, B.y, c.mat, strainCol(c));
    }
    for (let i = 0; i < joints.length; i++)
      drawJoint(sim.pts[i].x, sim.pts[i].y, joints[i].anchor);
    drawCar();
  }

  requestAnimationFrame(frame);
}

loadLevel(0);
requestAnimationFrame(frame);