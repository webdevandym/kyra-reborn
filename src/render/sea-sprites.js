import { COLORS, FISH, SHARK } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly } from './ink.js';
import { drawGem, drawStar } from './sprites.js';
import { hearts, dizzyStars } from './castle-sprites.js';

const INK_W = 2.6;

function dot(ctx, x, y, r, color = COLORS.ink) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function flip(ctx, x, y, dir) {
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
}

export function drawDolphin(ctx, dolphin, time, seed = 801) {
  const { x, y, dir = -1, anim = 0, lives = 2, dizzy = 0 } = dolphin;
  const wag = Math.sin(anim * 1.4 + time * 6) * 5;
  ctx.save();
  flip(ctx, x, y, dir);
  inkPoly(ctx, [[-22, -17], [-36, -29 + wag], [-33, -17], [-36, -5 + wag]], { fill: COLORS.dolphin, width: INK_W, seed: seed + 1 });
  inkPoly(ctx, [[-3, -27], [-9, -40], [6, -28]], { fill: COLORS.dolphin, width: 2.2, seed: seed + 2 });
  inkEllipse(ctx, 0, -17, 26, 12.5, { fill: COLORS.dolphin, width: INK_W, seed: seed + 3 });
  inkEllipse(ctx, 22, -14, 9, 3.6, { fill: COLORS.dolphin, width: 2, seed: seed + 4 });
  inkEllipse(ctx, 2, -11, 18, 6, { fill: COLORS.dolphinBelly, stroke: null, seed: seed + 5 });
  inkPoly(ctx, [[4, -9], [-3, 0 + wag * 0.3], [10, -7]], { fill: COLORS.dolphin, width: 1.8, seed: seed + 6 });
  dot(ctx, 14, -21, 2.2);
  inkLine(ctx, [[18, -13], [27, -12]], { width: 1.4, seed: seed + 7 });
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  hearts(ctx, lives, -52, time, seed + 20);
  if (dizzy > 0) dizzyStars(ctx, -40, time, seed + 30);
  ctx.restore();
}

export function drawFish(ctx, fish, time, seed = 831) {
  const { x, y, dir = -1, anim = 0 } = fish;
  const wag = Math.sin(anim * 2 + time * 10) * 4;
  ctx.save();
  flip(ctx, x, y - FISH.h / 2, dir);
  inkPoly(ctx, [[-10, 0], [-22, -9 + wag], [-22, 9 + wag]], { fill: COLORS.fishFin, width: 2.2, seed: seed + 1 });
  inkEllipse(ctx, 0, 0, 15, 10, { fill: COLORS.fish, width: INK_W, seed: seed + 2 });
  inkPoly(ctx, [[-3, -8], [2, -15], [7, -8]], { fill: COLORS.fishFin, width: 1.8, seed: seed + 3 });
  inkLine(ctx, [[-1, -6], [-4, 0], [-1, 6]], { width: 1.4, seed: seed + 4 });
  inkEllipse(ctx, 8, -2, 3.4, 3.4, { fill: COLORS.eyeWhite, width: 1.4, seed: seed + 5 });
  dot(ctx, 9, -2, 1.5);
  inkLine(ctx, [[12, 4], [15, 3]], { width: 1.3, seed: seed + 6 });
  ctx.restore();
}

function sharkTeeth(ctx, from, to, count, up, seed) {
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const tx = from[0] + (to[0] - from[0]) * u;
    const ty = from[1] + (to[1] - from[1]) * u;
    inkPoly(ctx, [[tx - 3.2, ty], [tx, ty + up * 8], [tx + 3.2, ty]], { fill: COLORS.teeth, width: 1.2, seed: seed + i, jitter: 0.3 });
  }
}

export function drawShark(ctx, shark, time, seed = 861) {
  const { x, y, dir = -1, winding = false, lives = 1, dizzy = 0, w = SHARK.w } = shark;
  const bob = Math.sin(time * 3) * 2;
  const wag = Math.sin(time * 5) * 5;
  const open = winding ? 15 : dizzy > 0 ? 3 : 7;
  ctx.save();
  flip(ctx, x, y + bob, dir);
  inkPoly(ctx, [[-w * 0.44, -30], [-w * 0.64, -56 + wag], [-w * 0.56, -30], [-w * 0.64, -6 + wag]], { fill: COLORS.shark, width: INK_W, seed: seed + 1 });
  inkPoly(ctx, [[-8, -50], [2, -80], [20, -50]], { fill: COLORS.shark, width: INK_W, seed: seed + 2 });
  inkEllipse(ctx, 0, -32, w * 0.46, 23, { fill: COLORS.shark, width: INK_W, seed: seed + 3 });
  inkEllipse(ctx, 6, -22, w * 0.36, 11, { fill: COLORS.sharkBelly, stroke: null, seed: seed + 4 });
  inkPoly(ctx, [[-4, -16], [-20, 6 + wag * 0.4], [8, -12]], { fill: COLORS.shark, width: 2.2, seed: seed + 5 });
  for (const gx of [-6, -1, 4]) inkLine(ctx, [[gx, -40], [gx - 3, -30]], { width: 1.4, seed: seed + 6 + gx });
  inkShape(ctx, [[18, -34], [w * 0.5, -32 - open * 0.4], [w * 0.5 - 6, -30], [18, -28]], { fill: COLORS.zombieMouth, width: 2, seed: seed + 8, smooth: false });
  sharkTeeth(ctx, [20, -33], [w * 0.5 - 2, -33 - open * 0.3], 5, 1, seed + 10);
  sharkTeeth(ctx, [20, -28 + open * 0.4], [w * 0.5 - 6, -29 + open * 0.2], 5, -1, seed + 20);
  inkEllipse(ctx, 22, -44, 4.6, 4.6, { fill: COLORS.eyeWhite, width: 1.6, seed: seed + 30 });
  dot(ctx, 24, -44, 2);
  inkLine(ctx, [[15, -53], [30, -48]], { width: 2.4, seed: seed + 31 });
  if (winding) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 20));
    inkEllipse(ctx, w * 0.5 - 6, -31, 7, 6, { fill: COLORS.shell, stroke: COLORS.shellRidge, width: 1.6, seed: seed + 32 });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  hearts(ctx, lives, -88, time, seed + 40);
  if (dizzy > 0) dizzyStars(ctx, -70, time, seed + 50);
  ctx.restore();
}

export function drawShell(ctx, shell, time, seed = 881) {
  const { x, y, vx = -1, vy = 0 } = shell;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx) + Math.PI + Math.sin(time * 14 + x * 0.05) * 0.12);
  const fan = [[-3, 0]];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    fan.push([Math.cos(a) * 12 + 2, Math.sin(a) * 12]);
  }
  inkShape(ctx, fan, { fill: COLORS.shell, width: 2.2, seed, smooth: false });
  for (const ry of [-7, -2, 3, 8]) inkLine(ctx, [[-3, 0], [11, ry * 0.9]], { stroke: COLORS.shellRidge, width: 1.3, seed: seed + ry + 9 });
  ctx.restore();
}

export function drawBubble(ctx, bubble, time, seed = 901) {
  const { x, y, size = 40, carry = null } = bubble;
  const r = size / 2 + Math.sin(time * 4 + x * 0.03) * 1.2;
  inkEllipse(ctx, x, y, r, r, { fill: COLORS.bubble, stroke: COLORS.bubbleInk, width: 2, seed });
  inkLine(ctx, [[x - r * 0.6, y - r * 0.2], [x - r * 0.4, y - r * 0.55], [x - r * 0.05, y - r * 0.7]], { stroke: COLORS.paper, width: 2.4, seed: seed + 1 });
  if (carry) {
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 3) * 2);
    drawGem(ctx, 0.8, COLORS.crystal, COLORS.crystalLight, seed + 2);
    ctx.restore();
  }
}

export function drawPlayerBubble(ctx, player, time, seed = 921) {
  const cx = player.x;
  const cy = player.y - player.h / 2 - 4;
  const wobble = Math.sin(time * 6) * 1.6;
  inkEllipse(ctx, cx, cy, 32 + wobble, 34 - wobble, { fill: COLORS.bubble, stroke: COLORS.bubbleInk, width: 2.2, seed });
  inkLine(ctx, [[cx - 20, cy - 12], [cx - 14, cy - 22], [cx - 5, cy - 27]], { stroke: COLORS.paper, width: 2.6, seed: seed + 1 });
}

export function drawTealCrystal(ctx, crystal, time, seed = 941) {
  const bob = Math.sin(time * 3 + crystal.x * 0.05) * 4;
  ctx.save();
  ctx.translate(crystal.x, crystal.y + bob);
  const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
  glow.addColorStop(0, 'rgba(20, 184, 166, 0.45)');
  glow.addColorStop(1, 'rgba(20, 184, 166, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  drawGem(ctx, 1.15, COLORS.teal, COLORS.tealLight, seed);
  drawStar(ctx, 8, -12, 2 + Math.max(0, Math.sin(time * 4 + crystal.x)) * 3, COLORS.paper, seed + 7);
  ctx.restore();
}

export function drawPearl(ctx, pearl, time, seed = 961) {
  const { x, y, open = false } = pearl;
  ctx.save();
  ctx.translate(x, y);
  inkPoly(ctx, [[-22, -2], [-24, -14], [-12, -20], [0, -22], [12, -20], [24, -14], [22, -2]], { fill: COLORS.shell, width: INK_W, seed, smooth: true });
  for (const rx of [-12, -4, 4, 12]) inkLine(ctx, [[rx * 0.4, -3], [rx, -18]], { stroke: COLORS.shellRidge, width: 1.3, seed: seed + rx + 20 });
  if (open) {
    inkPoly(ctx, [[-20, -20], [-26, -36], [-6, -34]], { fill: COLORS.shell, width: 2.2, seed: seed + 2 });
    inkPoly(ctx, [[20, -20], [26, -36], [6, -34]], { fill: COLORS.shell, width: 2.2, seed: seed + 3 });
  } else {
    const shine = 1 + Math.sin(time * 3) * 0.06;
    inkEllipse(ctx, 0, -26, 15 * shine, 15 * shine, { fill: COLORS.pearl, width: INK_W, seed: seed + 4 });
    inkLine(ctx, [[-8, -31], [-4, -35], [1, -36]], { stroke: COLORS.pearlShine, width: 2.6, seed: seed + 5 });
    drawStar(ctx, 14, -40, 2.5 + Math.max(0, Math.sin(time * 4)) * 2.5, COLORS.star, seed + 6);
  }
  ctx.restore();
}

export function drawCrab(ctx, crab, time, seed = 981) {
  const { x, y, dir = 1, anim = 0, cooldown = 0 } = crab;
  const scuttle = Math.sin(anim) * 3;
  const snip = Math.sin(time * 18) * 0.35 + (cooldown > 0.5 ? 0.6 : 0);
  ctx.save();
  flip(ctx, x, y, dir);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sx = -10 + i * 9;
      inkLine(ctx, [[sx, -8], [sx + side * 0, -2 + (i % 2 ? scuttle : -scuttle) * 0.4], [sx + (i - 1) * 3, 0]], { width: 1.8, seed: seed + i + (side + 1) * 3, smooth: false });
    }
  }
  inkEllipse(ctx, 0, -12, 17, 11, { fill: COLORS.crab, width: INK_W, seed: seed + 10 });
  for (const ex of [-4, 6]) {
    inkLine(ctx, [[ex, -21], [ex, -28]], { width: 1.8, seed: seed + 11 + ex });
    inkEllipse(ctx, ex, -29, 3, 3, { fill: COLORS.eyeWhite, width: 1.4, seed: seed + 14 + ex });
    dot(ctx, ex + 0.8, -29, 1.2);
  }
  inkLine(ctx, [[10, -9], [16, -14 - snip * 8]], { width: 2.2, seed: seed + 20 });
  for (const sign of [-1, 1]) {
    inkPoly(ctx, [[16, -14 - snip * 8], [26, -24 - sign * snip * 10], [25, -16 - snip * 4], [27, -10 + sign * snip * 8]], { fill: COLORS.crab, width: 2.2, seed: seed + 22 + sign, smooth: false });
  }
  inkLine(ctx, [[-10, -9], [-17, -15]], { width: 2.2, seed: seed + 26 });
  inkEllipse(ctx, -20, -19, 6, 5, { fill: COLORS.crab, width: 2, seed: seed + 27 });
  ctx.restore();
}

export function drawSandStick(ctx, mover, seed = 1001) {
  const { x, y, w, dx = 0, dy = 0 } = mover;
  const top = y;
  const h = 18;
  const left = x;
  const right = x + w;
  const round = [];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI;
    round.push([right - 6 + Math.cos(a) * 9, top + 9 + Math.sin(a) * 9]);
  }
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI / 2 + (i / 6) * Math.PI;
    round.push([left + 6 + Math.cos(a) * 9, top + 9 + Math.sin(a) * 9]);
  }
  inkShape(ctx, round, { fill: COLORS.sand, width: INK_W, seed });
  for (let rx = left + 14; rx < right - 10; rx += 22) {
    inkLine(ctx, [[rx, top + 5], [rx + 6, top + 8], [rx + 12, top + 5]], { stroke: COLORS.seaFloorShade, width: 1.4, seed: seed + rx });
  }
  if (Math.abs(dy) > 0.05) {
    const dir = Math.sign(dy);
    for (const k of [0, 1, 2]) {
      const bx = left + w * (0.25 + 0.25 * k);
      inkEllipse(ctx, bx, dir > 0 ? top - 6 - k * 5 : top + h + 6 + k * 5, 2.4 - k * 0.5, 2.4 - k * 0.5, { fill: COLORS.bubble, stroke: COLORS.bubbleInk, width: 1.2, seed: seed + 30 + k });
    }
  } else if (Math.abs(dx) > 0.05) {
    const dir = Math.sign(dx);
    const back = dir > 0 ? left - 6 : right + 6;
    for (const k of [0, 1, 2]) {
      const by = top + 3 + k * 6;
      inkLine(ctx, [[back - dir * k * 3, by], [back - dir * (12 + k * 3), by]], { stroke: COLORS.bubbleInk, width: 1.4, seed: seed + 40 + k });
    }
  }
}

export function drawBubbleCage(ctx, goal, time, seed = 1021) {
  const cx = goal.x;
  const cy = goal.y - 42 - Math.sin(time * 2) * 3;
  const wobble = Math.sin(time * 5) * 1.5;
  inkEllipse(ctx, cx, cy, 48 + wobble, 52 - wobble, { fill: COLORS.bubble, stroke: COLORS.bubbleInk, width: 2.6, seed });
  inkLine(ctx, [[cx - 30, cy - 20], [cx - 22, cy - 34], [cx - 8, cy - 42]], { stroke: COLORS.paper, width: 3, seed: seed + 1 });
}
