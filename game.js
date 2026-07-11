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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw in CSS pixels, render at full res
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

  for (const [ax, ay] of LV.anchors){
    ctx.beginPath(); ctx.arc(px(ax), py(ay), 7, 0, Math.PI*2);
    ctx.fillStyle = '#ffb84a'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#2b3a4a'; ctx.stroke();
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

function frame(){
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawBackdrop(cv.clientWidth, cv.clientHeight);
  drawTerrain();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);