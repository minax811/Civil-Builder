"use strict";
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

const WORLD_W = 12.5;
const WORLD_H = 9.4;

let S = 60;
let OX = 0, OY = 0;

function resize(){
  cv.width  = cv.clientWidth;
  cv.height = cv.clientHeight;
  S  = Math.min(cv.width / WORLD_W, cv.height / WORLD_H);
  OX = (cv.width  - WORLD_W * S) / 2;
  OY = (cv.height - WORLD_H * S) / 2;
}
window.addEventListener('resize', resize);
resize();

const px = x => OX + x * S;
const py = y => OY + y * S;

const wx = x => (x - OX) / S;
const wy = y => (y - OY) / S;

function frame(){
  ctx.clearRect(0, 0, cv.width, cv.height);

  ctx.fillStyle = '#ff6b4a';
  ctx.fillRect(px(2), py(3), 1 * S, 1 * S);

  ctx.strokeStyle = '#5fae57';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px(0), py(6));
  ctx.lineTo(px(WORLD_W), py(6));
  ctx.stroke();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);