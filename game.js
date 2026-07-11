"use strict";
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

const LV = {
  worldW: 12.5, worldH: 9.4,
  groundY: 6,
  gapL: 3.5,
  gapR: 8.5,
  waterY: 8.1,
  flagX: 10.9,
  anchors: [[3.5,6],[8.5,6]],
};

let joints = LV.anchors.map(a => ({x: a[0], y: a[1], anchor: true}));
let beams  = [];

const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const snap = v => Math.round(v * 2) / 2;

function jointAt(x, y){
  for (let i = 0; i < joints.length; i++)
    if (dist(joints[i].x, joints[i].y, x, y) < 0.28) return i;
  return -1;
}

let dragFrom = null;
let hover = {x: 0, y: 0};

cv.addEventListener('pointerdown', e => {
  const x = wx(e.offsetX), y = wy(e.offsetY);
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
    let jA = dragFrom.j;
    if (jA < 0){ joints.push({x: dragFrom.x, y: dragFrom.y, anchor: false}); jA = joints.length - 1; }
    let jB = jEnd;
    if (jB < 0){ joints.push({x: ex, y: ey, anchor: false}); jB = joints.length - 1; }
    if (jA !== jB && !beams.some(b => (b.a===jA && b.b===jB) || (b.a===jB && b.b===jA)))
      beams.push({a: jA, b: jB});
  }
  dragFrom = null;
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
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0,  '#8fd3f4');
  sky.addColorStop(.55,'#ffd9a0');
  sky.addColorStop(1,  '#ff9e7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,236,170,.95)';
  ctx.beginPath(); ctx.arc(w*0.78, py(1.6), S*0.75, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#3f7fae';
  ctx.fillRect(0, py(LV.waterY), w, h - py(LV.waterY));
}

function drawTerrain(){
  const g = LV.groundY;

  ctx.fillStyle = '#8a6248';
  ctx.fillRect(px(-1), py(g), px(LV.gapL) - px(-1), py(LV.worldH+1) - py(g));
  ctx.fillRect(px(LV.gapR), py(g), px(LV.worldW+1) - px(LV.gapR), py(LV.worldH+1) - py(g));

  ctx.fillStyle = '#5fae57';
  ctx.fillRect(px(-1),     py(g)-6, px(LV.gapL) - px(-1),        10);
  ctx.fillRect(px(LV.gapR),py(g)-6, px(LV.worldW+1)-px(LV.gapR), 10);

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
      ctx.beginPath(); ctx.arc(px(x), py(y), 2, 0, Math.PI*2); ctx.fill();
    }
}

function drawBeam(x1, y1, x2, y2, color){
  ctx.strokeStyle = color || '#3d4450';
  ctx.lineWidth = 0.16 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2));
  ctx.stroke();
}

function drawJoint(x, y, anchor){
  ctx.beginPath(); ctx.arc(px(x), py(y), anchor ? 7 : 5, 0, Math.PI*2);
  ctx.fillStyle = anchor ? '#ffb84a' : '#fff8ee'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#2b3a4a'; ctx.stroke();
}

function frame(){
  ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
  drawBackdrop(cv.clientWidth, cv.clientHeight);
  drawTerrain();
  drawGrid();

  for (const bm of beams){
    const A = joints[bm.a], B = joints[bm.b];
    drawBeam(A.x, A.y, B.x, B.y);
  }
  for (const j of joints) drawJoint(j.x, j.y, j.anchor);

  if (dragFrom){
    const ok = dist(dragFrom.x, dragFrom.y, hover.x, hover.y) <= 2.5;
    ctx.globalAlpha = 0.6;
    drawBeam(dragFrom.x, dragFrom.y, hover.x, hover.y, ok ? null : '#e64545');
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);