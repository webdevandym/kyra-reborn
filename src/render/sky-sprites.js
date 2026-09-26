import { COLORS, BAT, RAIN } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly, inkRect } from './ink.js';
import { drawHeart, drawStar } from './sprites.js';

const INK_W = 2.6;

export function cloudPoints(cx, cy, rx, ry, bumps = 3) {
  const points = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const puff = 1 + 0.18 * Math.abs(Math.sin(a * bumps));
    points.push([cx + Math.cos(a) * rx * puff, cy + Math.sin(a) * ry * puff]);
  }
  return points;
}

export function cloudBand(x0, x1, top, depth) {
  const bumps = Math.max(2, Math.round((x1 - x0) / 30));
  const n = bumps * 6;
  const points = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    points.push([x0 + u * (x1 - x0), top + 2 - Math.abs(Math.sin(u * bumps * Math.PI)) * 6]);
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    points.push([x0 + u * (x1 - x0), top + depth + Math.abs(Math.sin(u * bumps * Math.PI + 0.8)) * 6]);
  }
  return points;
}

function starOutline(r, inner) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return points;
}

function eye(ctx, x, y, seed) {
  inkEllipse(ctx, x, y, 3.6, 4.2, { fill: COLORS.eyeWhite, width: 1.5, seed });
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(x + 1.2, y + 0.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStarEnemy(ctx, star, time, seed = 301) {
  const { x, y, dir = -1, anim = 0, lives = 2, dizzy = 0 } = star;
  const step = Math.sin(anim * 1.6) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);

  inkLine(ctx, [[-6, -6], [-8 + step, 0]], { width: 2.4, seed: seed + 1 });
  inkLine(ctx, [[6, -6], [8 - step, 0]], { width: 2.4, seed: seed + 2 });

  ctx.save();
  ctx.translate(0, -21);
  ctx.rotate(Math.sin(time * 4 + seed) * 0.06);
  inkPoly(ctx, starOutline(21, 0.5), { fill: COLORS.starEnemy, width: INK_W, seed: seed + 3, jitter: 0.7 });
  eye(ctx, -5, -2, seed + 4);
  eye(ctx, 5, -2, seed + 5);
  inkLine(ctx, [[-9, -9], [-2, -6.5]], { width: 2.2, seed: seed + 6 });
  inkLine(ctx, [[2, -6.5], [9, -9]], { width: 2.2, seed: seed + 7 });
  inkLine(ctx, [[-3, 7], [0, 5], [3, 7]], { width: 1.6, seed: seed + 8 });
  if (lives < 2) {
    ctx.save();
    ctx.translate(10, -10);
    ctx.rotate(0.6);
    inkRect(ctx, -6, -2.5, 12, 5, { fill: COLORS.sign, width: 1.4, seed: seed + 9 });
    inkLine(ctx, [[-1.5, -2.5], [-1.5, 2.5]], { width: 1, seed: seed + 10 });
    inkLine(ctx, [[1.5, -2.5], [1.5, 2.5]], { width: 1, seed: seed + 11 });
    ctx.restore();
  }
  ctx.restore();

  for (let i = 0; i < lives; i++) {
    drawHeart(ctx, (i - (lives - 1) / 2) * 13, -54 + Math.sin(time * 5 + i) * 2, 5, seed + 12 + i);
  }
  if (dizzy > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * Math.PI * 2) / 3;
      drawStar(ctx, Math.cos(a) * 20, -44 + Math.sin(a) * 5, 5, COLORS.star, seed + 20 + i);
    }
  }
  ctx.restore();
}

export function drawBat(ctx, bat, time, seed = 331) {
  const { x, y, dir = -1 } = bat;
  const lift = -10 * Math.sin(time * 18 + seed);
  ctx.save();
  ctx.translate(x, y - BAT.h / 2);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  for (const side of [-1, 1]) {
    const wing = [
      [side * 6, -4],
      [side * 15, -10 + lift * 0.5],
      [side * 26, -7 + lift],
      [side * 23, 1 + lift * 0.6],
      [side * 19, -1 + lift * 0.3],
      [side * 15, 4 + lift * 0.2],
      [side * 9, 3],
    ];
    inkPoly(ctx, wing, { fill: COLORS.batWing, width: 1.8, seed: seed + 2 + side });
  }
  inkEllipse(ctx, 0, 0, 10, 11, { fill: COLORS.bat, width: INK_W, seed: seed + 4 });
  inkPoly(ctx, [[-7, -7], [-5, -17], [-2, -9]], { fill: COLORS.bat, width: 1.6, seed: seed + 5 });
  inkPoly(ctx, [[2, -9], [5, -17], [7, -7]], { fill: COLORS.bat, width: 1.6, seed: seed + 6 });
  eye(ctx, -4, -2, seed + 7);
  eye(ctx, 4, -2, seed + 8);
  inkPoly(ctx, [[-3, 5], [-2, 9], [-1, 5]], { fill: COLORS.teeth, width: 1.2, seed: seed + 9, jitter: 0.3 });
  inkPoly(ctx, [[1, 5], [2, 9], [3, 5]], { fill: COLORS.teeth, width: 1.2, seed: seed + 10, jitter: 0.3 });
  ctx.restore();
}

function drawRain(ctx, cloud, wet, time, seed) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(wet.left, wet.top, wet.right - wet.left, wet.bottom - wet.top);
  ctx.clip();
  ctx.strokeStyle = COLORS.rain;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const gapY = 34;
  const fall = (time * RAIN.dropSpeed) % gapY;
  let column = 0;
  for (let x = wet.left + 6; x < wet.right; x += 12, column++) {
    for (let y = cloud.top - gapY + fall + ((column * 13) % gapY); y < wet.bottom; y += gapY) {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 12);
    }
  }
  ctx.stroke();
  ctx.restore();
  if (wet.bottom >= cloud.bottom - 0.5 && wet.top < cloud.bottom) {
    for (let x = wet.left + 10; x < wet.right - 4; x += 20) {
      inkLine(ctx, [[x - 5, cloud.bottom - 6], [x - 2, cloud.bottom - 1]], { stroke: COLORS.rain, width: 1.6, seed: seed + x });
      inkLine(ctx, [[x + 5, cloud.bottom - 6], [x + 2, cloud.bottom - 1]], { stroke: COLORS.rain, width: 1.6, seed: seed + x + 1 });
    }
  }
}

export function drawRainCloud(ctx, cloud, { phase, wet, time }, seed = 361) {
  if (wet) drawRain(ctx, cloud, wet, time, seed + 20);
  const warn = phase === 'warn';
  const shake = warn ? Math.sin(time * 40) * 1.6 : 0;
  const fill = phase === 'dry' ? COLORS.rainCloud : COLORS.rainCloudDark;
  inkShape(ctx, cloudPoints(cloud.x + shake, cloud.y, 60, 20), { fill, width: INK_W, seed, jitter: warn ? 2 : 1.2 });
}

export function drawMovingCloud(ctx, mover, seed = 391) {
  inkShape(ctx, cloudBand(mover.x, mover.x + mover.w, mover.y, 20), { fill: COLORS.cloud, width: INK_W, seed });
  if (Math.abs(mover.dx) < 0.05) return;
  const dir = Math.sign(mover.dx);
  const back = dir > 0 ? mover.x - 6 : mover.x + mover.w + 6;
  for (const k of [0, 1, 2]) {
    const y = mover.y + 4 + k * 6;
    inkLine(ctx, [[back - dir * k * 3, y], [back - dir * (12 + k * 3), y]], { stroke: COLORS.inkSoft, width: 1.4, seed: seed + 1 + k });
  }
}

export function drawMoon(ctx, goal, time, awake = false, seed = 421) {
  const R = 30;
  const d = 18;
  const b = Math.atan2(Math.sqrt(R * R - (d * d) / 4), d / 2);
  ctx.save();
  ctx.translate(goal.x, goal.y - 44 + Math.sin(time * 1.6) * 4);
  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 72);
  glow.addColorStop(0, 'rgba(255, 241, 168, 0.6)');
  glow.addColorStop(1, 'rgba(255, 241, 168, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.arc(0, 0, R, b, Math.PI * 2 - b, false);
  ctx.arc(d, 0, R, Math.PI + b, Math.PI - b, true);
  ctx.closePath();
  ctx.fillStyle = COLORS.moon;
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (awake) {
    eye(ctx, -21, -6, seed + 1);
    inkLine(ctx, [[-24, 10], [-20, 13.5], [-15, 10]], { width: 2, seed: seed + 2 });
  } else {
    inkLine(ctx, [[-25, -7], [-21, -4], [-17, -7]], { width: 2, seed: seed + 1 });
    inkEllipse(ctx, -19, 12, 2, 2.4, { width: 1.6, seed: seed + 2 });
  }
  inkEllipse(ctx, -22, 4, 3.5, 2.4, { fill: COLORS.moonCheek, stroke: null, seed: seed + 3 });
  ctx.restore();

  if (awake) {
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + (i * Math.PI * 2) / 3;
      drawStar(ctx, Math.cos(a) * 44, Math.sin(a) * 34, 4 + Math.sin(time * 5 + i) * 1.5, COLORS.star, seed + 10 + i);
    }
  } else {
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.5 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.font = `700 ${14 + i * 3}px "Caveat", "Comic Sans MS", cursive`;
      ctx.fillText('z', 14 + k * 26, -26 - k * 40);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
