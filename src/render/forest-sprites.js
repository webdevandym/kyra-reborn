import { COLORS, BOIL, PORTAL, MONKEY, GRANDMA } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly, inkRect } from './ink.js';
import { dot, flip } from './kit.js';
import { hearts, dizzyStars } from './status.js';

const HOUSE_K = 1.4;
export const HOUSE_SIZE = { w: 152 * HOUSE_K, h: 150 * HOUSE_K };

const pen = (k) => (width, seed, extra) => ({ width: width / k, jitter: BOIL.jitter / k, offset: 1.6 / k, seed, ...extra });

function begin(ctx, x, y, dir, k) {
  ctx.save();
  flip(ctx, x, y, dir);
  ctx.scale(k, k);
  return pen(k);
}

function tube(ctx, k, points, thickness, color, seed, edge = 2) {
  const jitter = BOIL.jitter / k;
  inkLine(ctx, points, { width: thickness + (2 * edge) / k, jitter, seed });
  inkLine(ctx, points, { stroke: color, width: thickness, jitter, seed: seed + 1 });
}

function circle(ctx, cx, cy, r, options) {
  inkEllipse(ctx, cx, cy, r, r, options);
}

function quads(start, ...segments) {
  const points = [start];
  let [px, py] = start;
  for (const [cx, cy, ex, ey] of segments) {
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const m = 1 - t;
      points.push([m * m * px + 2 * m * t * cx + t * t * ex, m * m * py + 2 * m * t * cy + t * t * ey]);
    }
    px = ex;
    py = ey;
  }
  return points;
}

function status(ctx, { x, y }, time, seed, { lives = 0, dizzy = 0, heartsY, starsY }) {
  ctx.save();
  ctx.translate(x, y);
  hearts(ctx, lives, heartsY, time, seed);
  if (dizzy > 0) dizzyStars(ctx, starsY, time, seed + 10);
  ctx.restore();
}

function scenery(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  return pen(s);
}

export function drawPine(ctx, x, y, s, seed, far = false) {
  const o = scenery(ctx, x, y, s);
  const base = { stroke: COLORS.inkSoft };
  const leaf = { ...base, fill: far ? COLORS.forestFar : COLORS.pine };
  inkRect(ctx, -8, -32, 16, 32, o(2.6, seed, { ...base, fill: far ? COLORS.forestFarTrunk : COLORS.wood }));
  inkPoly(ctx, [[-55, -30], [0, -100], [55, -30]], o(2.6, seed + 1, leaf));
  inkPoly(ctx, [[-44, -70], [0, -135], [44, -70]], o(2.6, seed + 2, leaf));
  inkPoly(ctx, [[-32, -105], [0, -168], [32, -105]], o(2.6, seed + 3, leaf));
  if (!far) {
    for (const [nx, ny] of [[-18, -52], [12, -54], [-12, -92], [6, -96]]) inkLine(ctx, [[nx, ny], [nx + 9, ny - 7]], o(1.5, seed + 4 + nx, base));
  }
  ctx.restore();
}

export function drawOak(ctx, x, y, s, seed, far = false) {
  const o = scenery(ctx, x, y, s);
  const base = { stroke: COLORS.inkSoft };
  inkRect(ctx, -13, -100, 26, 100, o(2.6, seed, { ...base, fill: far ? COLORS.forestFarTrunk : COLORS.wood }));
  inkShape(ctx, [[-67, -100], [-88, -125], [-59, -145], [-48, -172], [-1, -177], [30, -185], [59, -145], [88, -125], [67, -100], [7, -78]], o(2.6, seed + 1, { ...base, fill: far ? COLORS.forestFar : COLORS.oak }));
  if (!far) {
    inkLine(ctx, [[-4, -8], [-4, -60]], o(1.6, seed + 2, base));
    inkLine(ctx, [[6, -14], [6, -44]], o(1.6, seed + 3, base));
    for (const [lx, ly] of [[-40, -130], [10, -150], [30, -118], [-20, -104]]) inkLine(ctx, [[lx, ly], [lx + 8, ly - 8], [lx + 16, ly]], o(1.6, seed + 4 + lx, base));
  }
  ctx.restore();
}

export function drawBush(ctx, x, y, s, seed, far = false) {
  const o = scenery(ctx, x, y, s);
  const base = { stroke: COLORS.inkSoft };
  inkShape(ctx, [[-40, 0], [-48, -16], [-42, -30], [-22, -52], [-6, -46], [22, -48], [38, -34], [44, -14], [38, 0]], o(2.6, seed, { ...base, fill: far ? COLORS.forestFar : COLORS.bush }));
  if (!far) {
    inkLine(ctx, [[-20, -16], [-14, -22], [-8, -16]], o(1.5, seed + 1, base));
    inkLine(ctx, [[8, -22], [14, -28], [20, -22]], o(1.5, seed + 2, base));
    for (const [bx, by] of [[-14, -30], [16, -12], [26, -30]]) circle(ctx, bx, by, 3, o(1.4, seed + 3 + bx, { fill: COLORS.berry }));
  }
  ctx.restore();
}

function ear(ctx, o, cx, cy, degrees, seed) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((degrees * Math.PI) / 180);
  inkEllipse(ctx, 0, 0, 4.5, 14, o(2.4, seed, { fill: COLORS.rabbit }));
  ctx.restore();
}

export function drawRabbit(ctx, rabbit, time, seed = 1101) {
  const { x, y, dir = -1, anim = 0 } = rabbit;
  const o = begin(ctx, x, y, dir, 0.7);
  const hop = Math.abs(Math.sin(anim * 0.9)) * 7;
  const reach = Math.sin(anim * 0.9) * 6;
  ctx.translate(0, -hop);
  circle(ctx, -24, -26, 7, o(2.4, seed + 1, { fill: COLORS.eyeWhite }));
  inkEllipse(ctx, 0, -24, 24, 17, o(2.4, seed + 2, { fill: COLORS.rabbit }));
  inkEllipse(ctx, -12 - reach, -4, 13, 5, o(2.4, seed + 3, { fill: COLORS.rabbit }));
  inkLine(ctx, [[14, -14], [16 + reach * 0.6, 0]], o(2.4, seed + 4));
  circle(ctx, 24, -38, 12, o(2.4, seed + 5, { fill: COLORS.rabbit }));
  ear(ctx, o, 20, -62, -8 - hop * 1.5, seed + 6);
  ear(ctx, o, 31, -62, 10 - hop * 1.5, seed + 7);
  inkLine(ctx, [[20, -70], [20, -58]], o(2, seed + 8, { stroke: COLORS.blush }));
  inkLine(ctx, [[31, -70], [31, -58]], o(2, seed + 9, { stroke: COLORS.blush }));
  dot(ctx, 28, -40, 1.8);
  circle(ctx, 36, -36, 2.2, o(1.2, seed + 10, { fill: COLORS.blush }));
  ctx.restore();
}

function deerLeg(ctx, o, cx, half, shift, fill, seed) {
  inkPoly(ctx, [[cx - half, -50], [cx - 4 + shift, -8], [cx + 4 + shift, -8], [cx + half, -50]], o(2.4, seed, { fill }));
  inkPoly(ctx, [[cx - 4 + shift, -8], [cx + 4 + shift, -8], [cx + 5 + shift, 0], [cx - 5 + shift, 0]], o(2.4, seed + 1, { fill: COLORS.hoof }));
}

const ANTLERS = [
  [[44, -118], [40, -140], [50, -158]],
  [[42, -128], [34, -134], [30, -146]],
  [[44, -138], [54, -142], [62, -152]],
  [[47, -148], [40, -156], [38, -166]],
  [[52, -116], [54, -138], [66, -150]],
  [[54, -128], [62, -132], [70, -128]],
];

export function drawDeer(ctx, deer, time, seed = 1121) {
  const { x, y, dir = -1, anim = 0, lives = 2, dizzy = 0 } = deer;
  const k = 0.6;
  const o = begin(ctx, x, y, dir, k);
  if (dizzy > 0) ctx.rotate(Math.sin(time * 10) * 0.06);
  const swing = Math.sin(anim * 1.4) * 6;
  ANTLERS.forEach((branch, i) => tube(ctx, k, branch, 3.4, COLORS.antler, seed + 10 + i * 2, 1.6));
  deerLeg(ctx, o, -15, 7, -swing, COLORS.deerFar, seed + 1);
  deerLeg(ctx, o, 28.5, 7, swing, COLORS.deerFar, seed + 3);
  inkShape(ctx, [[20, -82], [32, -106], [36, -118], [58, -118], [72, -111], [76, -102], [62, -99], [54, -96], [50, -76], [46, -62]], o(2.4, seed + 5, { fill: COLORS.deer }));
  inkShape(ctx, [[-42, -62], [-44, -84], [-16, -86], [12, -90], [36, -82], [48, -74], [44, -58], [34, -44], [4, -46], [-28, -42]], o(2.4, seed + 6, { fill: COLORS.deer }));
  deerLeg(ctx, o, -29, 9, swing, COLORS.deer, seed + 7);
  deerLeg(ctx, o, 15, 7, -swing, COLORS.deer, seed + 9);
  inkEllipse(ctx, 2, -50, 26, 5, o(2.4, seed + 11, { fill: COLORS.deerBelly, stroke: null }));
  for (const [sx, sy] of [[-20, -72], [-4, -78], [14, -74], [-12, -62], [8, -62], [28, -68]]) dot(ctx, sx, sy, 2.4, COLORS.eyeWhite);
  inkShape(ctx, [[-42, -72], [-54, -80], [-52, -66], [-47, -62], [-42, -64]], o(2.4, seed + 12, { fill: COLORS.eyeWhite }));
  inkShape(ctx, [[36, -118], [26, -130], [18, -124], [24, -116], [34, -110]], o(2.4, seed + 13, { fill: COLORS.deer }));
  inkLine(ctx, [[33, -118], [27, -124], [23, -122]], o(1.8, seed + 14, { stroke: COLORS.blush }));
  dot(ctx, 52, -110, 2.6);
  dot(ctx, 53, -111, 0.9, COLORS.eyeWhite);
  inkEllipse(ctx, 73, -104, 3.2, 2.6, o(2.4, seed + 15, { fill: COLORS.zombieMouth, stroke: null }));
  inkLine(ctx, [[72, -100], [66, -99], [62, -100]], o(1.4, seed + 16));
  ctx.restore();
  status(ctx, deer, time, seed + 40, { lives, dizzy, heartsY: -112, starsY: -78 });
}

function wave(from, hump, count, base, amp, phase) {
  const points = [];
  for (let i = 0; i <= count * 5; i++) {
    const u = i / 5;
    points.push([from + u * hump, base - amp * (1 - (0.7 * u) / count) * Math.sin(Math.PI * u - phase)]);
  }
  return points;
}

function snakeHead(ctx, o, hx, hy, rx, ry, { winding, time, seed }) {
  inkEllipse(ctx, hx, hy, rx, ry, o(2.4, seed, { fill: COLORS.snake }));
  circle(ctx, hx + 5, hy - 4, 3.2, o(1.4, seed + 1, { fill: COLORS.eyeWhite }));
  dot(ctx, hx + 6, hy - 4, 1.3);
  if (winding) {
    inkPoly(ctx, [[hx + rx - 6, hy - 2], [hx + rx + 8, hy - 11], [hx + rx + 8, hy + 7], [hx + rx - 6, hy + 2]], o(2, seed + 2, { fill: COLORS.zombieMouth }));
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 20));
    circle(ctx, hx + rx + 9, hy - 2, 5, o(1.6, seed + 3, { fill: COLORS.cone, stroke: COLORS.coneScale }));
    ctx.globalAlpha = 1;
    return;
  }
  const lick = Math.sin(time * 12) * 2;
  inkLine(ctx, [[hx + rx, hy + 2], [hx + rx + 11, hy - 1 + lick]], o(2, seed + 4, { stroke: COLORS.berry }));
  inkLine(ctx, [[hx + rx, hy + 2], [hx + rx + 11, hy + 6 - lick]], o(2, seed + 5, { stroke: COLORS.berry }));
}

export function drawSnake(ctx, snake, time, seed = 1141) {
  const { x, y, dir = -1, fly = false, winding = false, dizzy = 0 } = snake;
  const k = 0.55;
  const o = begin(ctx, x, y, dir, k);
  const phase = time * 4;
  if (fly) {
    ctx.translate(0, -16 / k);
    const body = wave(-52, 26, 4, 0, 11, phase);
    tube(ctx, k, body, 11, COLORS.snake, seed + 1, 2.2);
    const [hx, hy] = body[body.length - 1];
    snakeHead(ctx, o, hx + 8, hy - 4, 13, 9, { winding, time, seed: seed + 3 });
    const flap = Math.sin(time * 16) * 0.35;
    for (const [wx, wy, tilt] of [[-16, -24, -25], [6, -26, -10]]) {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate((tilt * Math.PI) / 180 - flap);
      inkEllipse(ctx, 0, 0, 18, 7, o(2.4, seed + 10 + wx, { fill: COLORS.cloudShade }));
      ctx.restore();
    }
  } else {
    const body = wave(-62, 30, 4, -22, 13, phase);
    tube(ctx, k, body, 14, COLORS.snake, seed + 1, 2.2);
    for (let mx = -47; mx <= 43; mx += 30) inkLine(ctx, [[mx, -26 - Math.sin(phase + mx) * 2], [mx + 4, -20]], o(2.2, seed + 20 + mx, { stroke: COLORS.pine }));
    const [hx, hy] = body[body.length - 1];
    snakeHead(ctx, o, hx + 10, hy - 6, 14, 10, { winding, time, seed: seed + 3 });
  }
  ctx.restore();
  status(ctx, snake, time, seed + 40, { dizzy, starsY: -54 });
}

function monkeyFigure(ctx, o, k, seed, { step = 0, awake, anim = 0, time = 0 }) {
  const wag = Math.sin(time * 4 + anim) * 3;
  tube(ctx, k, quads([-20, 16], [-54, 26, -48, -10], [-46 + wag, -24, -34 + wag, -26]), 4.5, COLORS.monkey, seed, 2.2);
  inkEllipse(ctx, -12 - step, 40, 10, 5, o(2.4, seed + 3, { fill: COLORS.monkey }));
  inkEllipse(ctx, 12 + step, 40, 10, 5, o(2.4, seed + 4, { fill: COLORS.monkey }));
  inkEllipse(ctx, 0, 14, 22, 26, o(2.4, seed + 5, { fill: COLORS.monkey }));
  inkEllipse(ctx, 0, 20, 13, 17, o(1.6, seed + 6, { fill: COLORS.monkeyFace }));
  for (const side of [-1, 1]) {
    circle(ctx, side * 21, -26, 8, o(2.4, seed + 7 + side, { fill: COLORS.monkey }));
    circle(ctx, side * 21, -26, 4, o(1.2, seed + 9 + side, { fill: COLORS.monkeyFace }));
  }
  circle(ctx, 0, -24, 20, o(2.4, seed + 12, { fill: COLORS.monkey }));
  inkEllipse(ctx, 0, -19, 14, 12, o(1.6, seed + 13, { fill: COLORS.monkeyFace }));
  dot(ctx, -2.5, -14, 1.2);
  dot(ctx, 2.5, -14, 1.2);
  if (!awake) {
    inkLine(ctx, [[-9, -24], [-6, -21], [-3, -24]], o(2, seed + 14));
    inkLine(ctx, [[3, -24], [6, -21], [9, -24]], o(2, seed + 15));
    for (const side of [-1, 1]) {
      inkLine(ctx, [[side * 20, 2], [side * 6, 16]], o(5, seed + 16 + side, { stroke: COLORS.monkey }));
      inkLine(ctx, [[side * 20, 2], [side * 6, 16]], o(1.2, seed + 18 + side));
    }
    return;
  }
  for (const side of [-1, 1]) {
    inkEllipse(ctx, side * 6, -24, 3.4, 3.8, o(1.4, seed + 20 + side, { fill: COLORS.eyeWhite }));
    dot(ctx, side * 6 + 0.6, -23.4, 1.7);
    dot(ctx, side * 6 + 1.2, -24.2, 0.6, COLORS.eyeWhite);
    inkEllipse(ctx, side * 11, -13, 3.4, 2.4, o(1, seed + 22 + side, { fill: COLORS.blush, stroke: null }));
    const lift = Math.sin(anim * 1.1 + side) * 4;
    inkLine(ctx, [[side * 20, 0], [side * 36, -26 + lift]], o(5, seed + 24 + side, { stroke: COLORS.monkey }));
    inkLine(ctx, [[side * 20, 0], [side * 36, -26 + lift]], o(1.2, seed + 26 + side));
    circle(ctx, side * 38, -30 + lift, 5, o(2.4, seed + 28 + side, { fill: COLORS.monkey }));
  }
  inkLine(ctx, [[-10, -30], [-6, -33], [-2, -30]], o(1.6, seed + 30));
  inkLine(ctx, [[2, -30], [6, -33], [10, -30]], o(1.6, seed + 31));
  inkLine(ctx, [[-7, -11], [0, -4], [7, -11]], o(2.6, seed + 32));
}

function sleepingMonkey(ctx, { x, y }, time, seed) {
  const cy = y - 46 + Math.sin(time * 2 + x * 0.02) * 3;
  inkEllipse(ctx, x, cy, 44, 44, { fill: COLORS.monkeyBubbleFill, stroke: COLORS.monkeyBubble, width: 2.6, seed });
  inkLine(ctx, [[x - 30, cy - 19], [x - 24, cy - 31], [x - 8, cy - 39]], { stroke: COLORS.eyeWhite, width: 3, seed: seed + 1 });
  ctx.save();
  ctx.translate(x, cy + 24);
  ctx.scale(0.5, 0.5);
  ctx.translate(0, -45);
  monkeyFigure(ctx, pen(0.5), 0.5, seed + 10, { awake: false, time });
  ctx.restore();
  for (const [zx, zy, s] of [[x + 34, cy - 40, 7], [x + 46, cy - 56, 5]]) {
    inkLine(ctx, [[zx, zy], [zx + s, zy], [zx, zy + s], [zx + s, zy + s]], { width: 1.8, seed: seed + zx, smooth: false });
  }
}

export function drawMonkey(ctx, monkey, time, seed = 1161) {
  const { x, y, dir = -1, anim = 0, mode = 'awake', hidden = false, dizzy = 0, lives = MONKEY.lives } = monkey;
  if (hidden) return;
  if (mode === 'asleep') {
    sleepingMonkey(ctx, monkey, time, seed);
    return;
  }
  const k = 0.6;
  const o = begin(ctx, x, y, dir, k);
  if (dizzy > 0) ctx.rotate(Math.sin(time * 10) * 0.08);
  ctx.translate(0, -45);
  monkeyFigure(ctx, o, k, seed, { step: Math.sin(anim * 1.2) * 4, awake: true, anim, time });
  ctx.restore();
  status(ctx, monkey, time, seed + 60, { lives, dizzy, heartsY: -72, starsY: -60 });
}

export function drawGrandma(ctx, grandma, time, seed = 1181) {
  const { x, y, dir = -1, anim = 0, dizzy = 0, lives = GRANDMA.lives, winding = false, phase = 'sticks', hasStick = true } = grandma;
  const k = 0.62;
  const o = begin(ctx, x, y, dir, k);
  if (dizzy > 0) ctx.rotate(Math.sin(time * 10) * 0.05);
  const step = Math.sin(anim * 0.7) * 3;
  ctx.translate(0, -Math.abs(Math.sin(anim * 0.7)) * 2);
  inkEllipse(ctx, -12 - step, -2, 10, 5, o(2.4, seed + 1, { fill: COLORS.monkey }));
  inkEllipse(ctx, 12 + step, -2, 10, 5, o(2.4, seed + 2, { fill: COLORS.monkey }));
  inkShape(ctx, [[-12, -76], [-21, -66], [-31, -40], [-34, -9], [0, 2], [34, -9], [31, -40], [21, -66], [12, -76], [0, -71]], o(2.4, seed + 3, { fill: COLORS.dress }));
  inkShape(ctx, [[-10, -58], [0, -52], [10, -58], [14, -36], [15, -16], [0, -9], [-15, -16], [-14, -36]], o(1.6, seed + 4, { fill: COLORS.eyeWhite }));
  circle(ctx, 0, -92, 15, o(2.4, seed + 5, { fill: COLORS.skin }));
  circle(ctx, -12, -102, 8, o(2.4, seed + 6, { fill: COLORS.hair }));
  circle(ctx, 0, -107, 9, o(2.4, seed + 7, { fill: COLORS.hair }));
  circle(ctx, 12, -102, 8, o(2.4, seed + 8, { fill: COLORS.hair }));
  circle(ctx, 0, -119, 7, o(2.4, seed + 9, { fill: COLORS.hair }));
  circle(ctx, -5, -92, 4.5, o(1.5, seed + 10));
  circle(ctx, 6, -92, 4.5, o(1.5, seed + 11));
  dot(ctx, -5, -92, 1.2);
  dot(ctx, 6, -92, 1.2);
  inkLine(ctx, [[-4, -83], [0, -80], [4, -83]], o(1.6, seed + 12));
  const hand = winding ? [30, -110] : hasStick || phase === 'balls' ? [34, -98] : [28, -54];
  inkLine(ctx, [[14, -68], hand], o(5, seed + 13, { stroke: COLORS.skin }));
  inkLine(ctx, [[14, -68], hand], o(1.2, seed + 14));
  if (phase === 'balls') {
    const [bx, by] = hand;
    circle(ctx, bx + 4, by - 8, 10, o(2.4, seed + 15, { fill: COLORS.ball }));
    inkLine(ctx, [[bx - 1, by - 12], [bx + 3, by - 16]], o(2, seed + 16, { stroke: COLORS.eyeWhite }));
  } else if (hasStick) {
    const tip = winding ? [8, -160] : [46, -154];
    tube(ctx, k, [hand, tip], 3.6, COLORS.wood, seed + 17, 1.8);
    const hookDir = winding ? -1 : 1;
    inkLine(ctx, [tip, [tip[0] + hookDir * 7, tip[1] - 9], [tip[0] + hookDir * 15, tip[1]]], o(3, seed + 19));
  }
  inkLine(ctx, [[-14, -68], [-30, -80]], o(5, seed + 20, { stroke: COLORS.skin }));
  circle(ctx, -40, -86, 10, o(2.4, seed + 21, { fill: COLORS.ball }));
  inkLine(ctx, [[-45, -90], [-41, -94], [-37, -92]], o(2, seed + 22, { stroke: COLORS.eyeWhite }));
  ctx.restore();
  status(ctx, grandma, time, seed + 60, { lives, dizzy, heartsY: -98, starsY: -84 });
}

export function drawHouse(ctx, house, time, seed = 1221) {
  const k = HOUSE_K;
  const o = pen(k);
  ctx.save();
  ctx.translate(house.x, house.y);
  ctx.scale(k, k);
  inkRect(ctx, -62, -92, 124, 92, o(2.6, seed, { fill: COLORS.houseWall }));
  inkPoly(ctx, [[-76, -92], [0, -150], [76, -92]], o(2.6, seed + 1, { fill: COLORS.roof }));
  inkRect(ctx, 34, -138, 15, 30, o(2.6, seed + 2, { fill: COLORS.stone }));
  inkRect(ctx, -16, -54, 30, 54, o(2.6, seed + 3, { fill: COLORS.wood }));
  dot(ctx, 8, -26, 2.4);
  inkRect(ctx, 26, -74, 24, 24, o(2.6, seed + 4, { fill: COLORS.windowGlass }));
  inkLine(ctx, [[38, -74], [38, -50]], o(1.5, seed + 5));
  inkLine(ctx, [[26, -62], [50, -62]], o(1.5, seed + 6));
  inkRect(ctx, -52, -60, 22, 22, o(2.6, seed + 7, { fill: COLORS.windowGlass }));
  inkLine(ctx, [[-41, -60], [-41, -38]], o(1.5, seed + 8));
  inkLine(ctx, [[-52, -49], [-30, -49]], o(1.5, seed + 9));
  for (let i = 0; i < 3; i++) {
    const p = (time * 0.5 + i / 3) % 1;
    const r = 4 + p * 6;
    ctx.globalAlpha = 1 - p;
    inkEllipse(ctx, 41.5 + Math.sin(p * 5 + i) * 5, -144 - p * 50, r, r, o(1.4, seed + 10 + i, { fill: COLORS.cloud, stroke: COLORS.inkSoft }));
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function coneArt(ctx, o, seed) {
  inkLine(ctx, [[0, -19], [2, -28]], o(2.6, seed));
  inkPoly(ctx, quads([-9, -15], [0, -23, 9, -15], [14, -2, 6, 12], [3, 18, 0, 21], [-3, 18, -6, 12], [-14, -2, -9, -15]), o(2.2, seed + 1, { fill: COLORS.cone }));
  const rows = [
    quads([-11, -7], [-5, -1, 0, -7], [5, -1, 11, -7]),
    quads([-11, 0], [-5, 6, 0, 0], [5, 6, 11, 0]),
    quads([-9, 7], [-4, 13, 0, 7], [4, 13, 9, 7]),
    quads([-5, 14], [0, 18, 5, 14]),
    quads([-7, -13], [-3.5, -8, 0, -13], [3.5, -8, 7, -13]),
  ];
  rows.forEach((row, i) => inkLine(ctx, row, o(1.6, seed + 2 + i, { stroke: COLORS.coneScale, smooth: false })));
  inkLine(ctx, quads([-6, -12], [-9, -3, -5, 5]), o(2.2, seed + 8, { stroke: COLORS.coneLight }));
}

export function drawCone(ctx, cone, time, seed = 1281) {
  const { x, y, vx = -1, vy = 0 } = cone;
  const k = 0.6;
  const o = pen(k);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx) - Math.PI / 2);
  ctx.scale(k, k);
  inkLine(ctx, [[-6, -36], [-6, -52]], o(1.8, seed + 20, { stroke: COLORS.inkSoft }));
  inkLine(ctx, [[5, -40], [5, -58]], o(1.8, seed + 21, { stroke: COLORS.inkSoft }));
  coneArt(ctx, o, seed);
  ctx.restore();
}

export function drawStick(ctx, stick, time, seed = 1301) {
  const { x, y, vx = -1, vy = 0 } = stick;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));
  tube(ctx, 1, [[-14, 0], [14, 0]], 3.6, COLORS.wood, seed, 1.8);
  inkLine(ctx, [[14, 0], [20, -7], [27, -1]], { width: 2.6, seed: seed + 2 });
  inkLine(ctx, [[-4, 0], [-2, -4]], { width: 1.4, seed: seed + 3 });
  ctx.restore();
}

export function drawBall(ctx, ball, time, seed = 1321) {
  const { x, y } = ball;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 9);
  circle(ctx, 0, 0, 11, { fill: COLORS.ball, width: 2.4, seed });
  inkLine(ctx, [[-9, -4], [0, 0], [9, -4]], { width: 1.6, seed: seed + 1 });
  inkLine(ctx, [[-6, -8], [-2, -10]], { stroke: COLORS.eyeWhite, width: 2.2, seed: seed + 2 });
  ctx.restore();
}

export function drawForestPortal(ctx, portal, progress, time, seed = 1241) {
  if (progress <= 0) return;
  const { x, y, h = PORTAL.h } = portal;
  const s = 1 - (1 - Math.min(1, progress)) ** 3;
  const k = (h / 112) * s;
  ctx.save();
  ctx.translate(x, y - h / 2);
  inkEllipse(ctx, 0, 0, 38 * k, 56 * k, { fill: COLORS.star, width: 3, seed });
  inkEllipse(ctx, 0, 0, 29 * k, 44 * k, { fill: COLORS.crystal, width: 2.4, seed: seed + 1 });
  inkEllipse(ctx, 0, 0, 19 * k, 31 * k, { fill: COLORS.goal, width: 2.4, seed: seed + 2 });
  const spiral = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const a = t * Math.PI * 4 + time * 4;
    spiral.push([Math.cos(a) * 15 * k * t, Math.sin(a) * 24 * k * t]);
  }
  inkLine(ctx, spiral, { width: 2, seed: seed + 3 });
  ctx.restore();
}

export function drawCage(ctx, goal, time, seed = 1261) {
  const { x, y } = goal;
  const top = y - 84;
  for (const bx of [-28, -14, 0, 14, 28]) inkRect(ctx, x + bx - 2.5, top, 5, 82, { fill: COLORS.wood, width: 2, seed: seed + bx });
  inkRect(ctx, x - 38, top - 6, 76, 10, { fill: COLORS.wood, width: 2.4, seed: seed + 40 });
  inkRect(ctx, x - 38, y - 6, 76, 10, { fill: COLORS.wood, width: 2.4, seed: seed + 41 });
  inkLine(ctx, [[x - 8, top - 6], [x - 6, top - 18], [x + 6, top - 18], [x + 8, top - 6]], { width: 2.4, seed: seed + 42 });
  inkRect(ctx, x - 7, y - 30, 14, 11, { fill: COLORS.crown, width: 2, seed: seed + 43 });
  inkLine(ctx, [[x - 4, y - 30], [x - 4, y - 38], [x + 4, y - 38], [x + 4, y - 30]], { width: 2, seed: seed + 44 });
}
