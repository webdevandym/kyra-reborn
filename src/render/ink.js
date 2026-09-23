import { BOIL, COLORS } from '../config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let boilFrame = 0;

export function setBoilTime(time, frozen = false) {
  boilFrame = frozen ? 0 : Math.floor(time * BOIL.fps);
}

export function getBoilFrame() {
  return boilFrame;
}

export function jitterPoints(points, seed, amount = BOIL.jitter) {
  const rand = mulberry32(Math.imul(seed | 0, 7919) + Math.imul(boilFrame, 104729));
  return points.map(([x, y]) => [x + (rand() * 2 - 1) * amount, y + (rand() * 2 - 1) * amount]);
}

export function ellipsePoints(cx, cy, rx, ry, segments = Math.max(10, Math.round((rx + ry) / 2.5))) {
  const points = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return points;
}

export function rectPoints(x, y, w, h, perSide = 3) {
  const points = [];
  for (let i = 0; i < perSide; i++) points.push([x + (w * i) / perSide, y]);
  for (let i = 0; i < perSide; i++) points.push([x + w, y + (h * i) / perSide]);
  for (let i = 0; i < perSide; i++) points.push([x + w - (w * i) / perSide, y + h]);
  for (let i = 0; i < perSide; i++) points.push([x, y + h - (h * i) / perSide]);
  return points;
}

function tracePath(ctx, points, { closed, smooth }) {
  ctx.beginPath();
  if (!smooth || points.length < 3) {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    if (closed) ctx.closePath();
    return;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (closed) {
    const start = mid(points[points.length - 1], points[0]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const m = mid(p, points[(i + 1) % points.length]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const m = mid(points[i], points[i + 1]);
      ctx.quadraticCurveTo(points[i][0], points[i][1], m[0], m[1]);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
}

export function inkShape(ctx, points, options = {}) {
  const {
    seed = 1,
    fill = null,
    stroke = COLORS.ink,
    width = 3,
    closed = true,
    smooth = true,
    offset = 1.6,
    jitter = BOIL.jitter,
  } = options;
  if (fill) {
    const shifted = jitterPoints(points, seed + 97, jitter * 0.6).map(([x, y]) => [x + offset, y + offset]);
    tracePath(ctx, shifted, { closed, smooth });
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    tracePath(ctx, jitterPoints(points, seed, jitter), { closed, smooth });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function inkEllipse(ctx, cx, cy, rx, ry, options = {}) {
  inkShape(ctx, ellipsePoints(cx, cy, rx, ry), options);
}

export function inkLine(ctx, points, options = {}) {
  inkShape(ctx, points, { ...options, fill: null, closed: false });
}

export function inkPoly(ctx, points, options = {}) {
  inkShape(ctx, points, { ...options, smooth: false });
}

export function inkRect(ctx, x, y, w, h, options = {}) {
  inkShape(ctx, rectPoints(x, y, w, h), { ...options, smooth: false });
}
