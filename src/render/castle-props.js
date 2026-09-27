import { COLORS } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly, inkRect } from './ink.js';
import { drawStar } from './sprites.js';

const FLOOR = 450;
const SOFT = { stroke: COLORS.inkSoft };

function archPoints(cx, top, w, h) {
  const points = [[cx - w / 2, top + h], [cx - w / 2, top + w / 2]];
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    points.push([cx + Math.cos(a) * (w / 2), top + w / 2 + Math.sin(a) * (w / 2)]);
  }
  points.push([cx + w / 2, top + w / 2], [cx + w / 2, top + h]);
  return points;
}

function flame(ctx, cx, base, size, time, seed) {
  const flicker = Math.sin(time * 13 + seed) * size * 0.1;
  inkPoly(ctx, [[cx - size / 3, base], [cx, base - size + flicker], [cx + size / 3, base]], { fill: COLORS.torch, stroke: COLORS.inkSoft, width: 1.4, seed, jitter: 1.2 });
  inkPoly(ctx, [[cx - size / 8, base], [cx, base - size / 2 + flicker], [cx + size / 8, base]], { fill: COLORS.fireCore, stroke: null, seed: seed + 1, jitter: 0.8 });
}

export function drawWindow(ctx, cx, time, seed) {
  inkPoly(ctx, archPoints(cx, 110, 56, 96), { fill: COLORS.windowSky, ...SOFT, width: 2.2, seed });
  inkLine(ctx, [[cx, 110], [cx, 206]], { ...SOFT, width: 1.6, seed: seed + 1 });
  inkLine(ctx, [[cx - 28, 160], [cx + 28, 160]], { ...SOFT, width: 1.6, seed: seed + 2 });
  drawStar(ctx, cx - 13, 138, 3.5, COLORS.star, seed + 3);
  drawStar(ctx, cx + 12, 180, 3, COLORS.star, seed + 4);
}

export function drawBarredWindow(ctx, cx, time, seed) {
  inkRect(ctx, cx - 26, 120, 52, 44, { fill: COLORS.windowSky, ...SOFT, width: 2.2, seed });
  for (const bx of [-13, 0, 13]) inkLine(ctx, [[cx + bx, 120], [cx + bx, 164]], { ...SOFT, width: 2.4, seed: seed + bx });
}

export function drawTorch(ctx, cx, time, seed) {
  inkRect(ctx, cx - 4, 190, 8, 22, { fill: COLORS.wood, ...SOFT, width: 1.8, seed });
  flame(ctx, cx, 190, 24, time, seed + 2);
}

export function drawBanner(ctx, cx, time, seed) {
  inkLine(ctx, [[cx - 24, 96], [cx + 24, 96]], { ...SOFT, width: 2.2, seed });
  inkPoly(ctx, [[cx - 18, 96], [cx + 18, 96], [cx + 18, 200], [cx, 184], [cx - 18, 200]], { fill: COLORS.banner, ...SOFT, width: 2, seed: seed + 1 });
  drawStar(ctx, cx, 136, 7, COLORS.crown, seed + 2);
}

export function drawTapestry(ctx, cx, time, seed) {
  inkLine(ctx, [[cx - 40, 90], [cx + 40, 90]], { ...SOFT, width: 2.4, seed });
  inkRect(ctx, cx - 34, 90, 68, 150, { fill: COLORS.princessCape, ...SOFT, width: 2, seed: seed + 1 });
  inkRect(ctx, cx - 26, 100, 52, 130, { fill: null, ...SOFT, width: 1.4, seed: seed + 2 });
  drawStar(ctx, cx, 150, 12, COLORS.crown, seed + 3);
}

export function drawArmour(ctx, cx, time, seed) {
  inkLine(ctx, [[cx + 22, FLOOR], [cx + 22, FLOOR - 150]], { ...SOFT, width: 2.4, seed });
  inkPoly(ctx, [[cx + 16, FLOOR - 150], [cx + 22, FLOOR - 166], [cx + 28, FLOOR - 150]], { fill: COLORS.stoneShade, ...SOFT, width: 1.6, seed: seed + 1 });
  inkEllipse(ctx, cx, FLOOR - 118, 12, 14, { fill: COLORS.stoneShade, ...SOFT, width: 2, seed: seed + 2 });
  inkLine(ctx, [[cx - 7, FLOOR - 120], [cx + 7, FLOOR - 120]], { ...SOFT, width: 1.4, seed: seed + 3 });
  inkRect(ctx, cx - 14, FLOOR - 104, 28, 44, { fill: COLORS.stoneShade, ...SOFT, width: 2, seed: seed + 4 });
  inkLine(ctx, [[cx - 7, FLOOR - 60], [cx - 8, FLOOR]], { ...SOFT, width: 3, seed: seed + 5 });
  inkLine(ctx, [[cx + 7, FLOOR - 60], [cx + 8, FLOOR]], { ...SOFT, width: 3, seed: seed + 6 });
}

export function drawChandelier(ctx, cx, time, seed) {
  inkLine(ctx, [[cx, 45], [cx, 90]], { ...SOFT, width: 1.6, seed });
  inkShape(ctx, [[cx - 40, 96], [cx + 40, 96], [cx + 28, 106], [cx - 28, 106]], { fill: COLORS.wood, ...SOFT, width: 1.8, seed: seed + 1, smooth: false });
  for (const dx of [-32, 0, 32]) {
    inkRect(ctx, cx + dx - 3, 84, 6, 12, { fill: COLORS.bone, ...SOFT, width: 1.2, seed: seed + dx });
    flame(ctx, cx + dx, 84, 12, time, seed + dx + 7);
  }
}

export function drawBookshelf(ctx, cx, time, seed) {
  const top = FLOOR - 220;
  inkRect(ctx, cx - 44, top, 88, 220, { fill: COLORS.wood, ...SOFT, width: 2.2, seed });
  const spines = [COLORS.banner, COLORS.leaves, COLORS.windowSky, COLORS.crown, COLORS.portal];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = top + 14 + shelf * 52;
    inkLine(ctx, [[cx - 44, y + 40], [cx + 44, y + 40]], { ...SOFT, width: 1.6, seed: seed + shelf });
    for (let b = 0; b < 7; b++) {
      const h = 28 + ((seed + shelf * 7 + b * 3) % 3) * 4;
      ctx.fillStyle = spines[(seed + shelf + b) % spines.length];
      ctx.fillRect(cx - 38 + b * 11, y + 40 - h, 8, h);
    }
  }
}

export function drawCandle(ctx, cx, time, seed) {
  inkLine(ctx, [[cx, FLOOR], [cx, FLOOR - 70]], { ...SOFT, width: 2.4, seed });
  inkLine(ctx, [[cx - 12, FLOOR], [cx + 12, FLOOR]], { ...SOFT, width: 2.4, seed: seed + 1 });
  inkRect(ctx, cx - 4, FLOOR - 92, 8, 22, { fill: COLORS.bone, ...SOFT, width: 1.4, seed: seed + 2 });
  flame(ctx, cx, FLOOR - 92, 14, time, seed + 3);
}

export function drawPots(ctx, cx, time, seed) {
  inkLine(ctx, [[cx - 50, 110], [cx + 50, 110]], { ...SOFT, width: 2.4, seed });
  [[-34, 16], [0, 22], [34, 14]].forEach(([dx, r], i) => {
    inkLine(ctx, [[cx + dx, 110], [cx + dx, 124]], { ...SOFT, width: 1.2, seed: seed + i });
    inkEllipse(ctx, cx + dx, 124 + r, r, r * 0.8, { fill: COLORS.stoneShade, ...SOFT, width: 1.8, seed: seed + 10 + i });
  });
}

export function drawHam(ctx, cx, time, seed) {
  const swing = Math.sin(time * 1.5 + seed) * 0.06;
  ctx.save();
  ctx.translate(cx, 90);
  ctx.rotate(swing);
  inkLine(ctx, [[0, 0], [0, 40]], { ...SOFT, width: 1.4, seed });
  inkEllipse(ctx, 0, 70, 18, 30, { fill: COLORS.ratEar, ...SOFT, width: 2, seed: seed + 1 });
  inkEllipse(ctx, 0, 100, 5, 8, { fill: COLORS.bone, ...SOFT, width: 1.4, seed: seed + 2 });
  ctx.restore();
}

export function drawBarrel(ctx, cx, time, seed) {
  inkEllipse(ctx, cx, FLOOR - 34, 26, 34, { fill: COLORS.wood, ...SOFT, width: 2.2, seed });
  inkLine(ctx, [[cx - 26, FLOOR - 50], [cx + 26, FLOOR - 50]], { ...SOFT, width: 1.6, seed: seed + 1 });
  inkLine(ctx, [[cx - 26, FLOOR - 18], [cx + 26, FLOOR - 18]], { ...SOFT, width: 1.6, seed: seed + 2 });
}

export function drawStove(ctx, cx, time, seed) {
  inkRect(ctx, cx - 50, FLOOR - 110, 100, 110, { fill: COLORS.stone, ...SOFT, width: 2.2, seed });
  inkPoly(ctx, archPoints(cx, FLOOR - 70, 50, 70), { fill: COLORS.spider, ...SOFT, width: 2, seed: seed + 1 });
  flame(ctx, cx - 10, FLOOR - 6, 26, time, seed + 2);
  flame(ctx, cx + 10, FLOOR - 6, 20, time, seed + 3);
}

export function drawChain(ctx, cx, time, seed) {
  const sway = Math.sin(time * 1.2 + seed) * 3;
  for (let i = 0; i < 7; i++) {
    inkEllipse(ctx, cx + (sway * i) / 7, 55 + i * 16, 5, 8, { fill: null, ...SOFT, width: 2, seed: seed + i });
  }
  inkEllipse(ctx, cx + sway, 172, 11, 7, { fill: null, ...SOFT, width: 2.4, seed: seed + 9 });
}

export function drawCobweb(ctx, cx, time, seed) {
  const cy = 45;
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * Math.PI;
    inkLine(ctx, [[cx, cy], [cx + Math.cos(a) * 46, cy + Math.sin(a) * 46]], { ...SOFT, width: 1, seed: seed + i });
  }
  for (const r of [16, 30, 44]) {
    const arc = [];
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * Math.PI;
      arc.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    inkLine(ctx, arc, { ...SOFT, width: 1, seed: seed + r, smooth: false });
  }
}

export function drawVase(ctx, cx, time, seed) {
  inkShape(ctx, [[cx - 10, FLOOR], [cx - 18, FLOOR - 30], [cx - 10, FLOOR - 52], [cx + 10, FLOOR - 52], [cx + 18, FLOOR - 30], [cx + 10, FLOOR]], { fill: COLORS.windowSky, ...SOFT, width: 2, seed });
  for (const [dx, h] of [[-8, 80], [0, 90], [8, 78]]) {
    inkLine(ctx, [[cx + dx / 2, FLOOR - 52], [cx + dx, FLOOR - h]], { stroke: COLORS.leaves, width: 1.8, seed: seed + dx });
    drawStar(ctx, cx + dx, FLOOR - h, 5, COLORS.ratEar, seed + h);
  }
}

export const ROOM_PROPS = {
  hall: [drawWindow, drawTorch, drawArmour, drawBanner, drawChandelier, drawTorch],
  library: [drawBookshelf, drawCandle, drawWindow, drawBookshelf, drawChandelier, drawCandle],
  kitchen: [drawPots, drawBarrel, drawStove, drawHam, drawWindow, drawBarrel],
  dungeon: [drawChain, drawBarredWindow, drawTorch, drawCobweb, drawChain, drawBarredWindow],
  throne: [drawTapestry, drawVase, drawChandelier, drawWindow, drawVase, drawTapestry],
};

export const ROOM_TINTS = {
  hall: COLORS.castleWash,
  library: COLORS.libraryWash,
  kitchen: COLORS.kitchenWash,
  dungeon: COLORS.dungeonWash,
  throne: COLORS.throneWash,
};
