import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER, CONE } from '../src/config.js';
import { createEnemy, updateEnemy } from '../src/core/enemies.js';
import { testLevel } from './helpers.js';

const STEPS = 1200;
const DISTANCE = 3 * TILE;
const SQ = Math.SQRT1_2;
const COMPASS = [
  ['east', 1, 0, 1, 0],
  ['south-east', 1, 1, SQ, SQ],
  ['south', 0, 1, 0, 1],
  ['south-west', -1, 1, -SQ, SQ],
  ['west', -1, 0, -1, 0],
  ['north-west', -1, -1, -SQ, -SQ],
  ['north', 0, -1, 0, -1],
  ['north-east', 1, -1, SQ, -SQ],
];

const round = (n) => Math.round(n * 1000) / 1000 + 0;

const ROW = 'C' + '.'.repeat(30) + 'G';
const PILLAR = '.'.repeat(15) + '#' + '.'.repeat(16);
const level = testLevel([ROW, PILLAR, PILLAR, PILLAR, PILLAR, '#'.repeat(ROW.length)]);

function snakeOf(kind) {
  const spec = { kind: 'snake', x: 15.5 * TILE, y: 7 * TILE };
  return createEnemy(kind === 'flying' ? { ...spec, fly: true } : spec);
}

function runScenario(kind, [, sx, sy]) {
  const e = snakeOf(kind);
  const centreY = kind === 'flying' ? e.homeY : e.y - e.h / 2;
  const player = { x: e.x + sx * DISTANCE, y: centreY + sy * DISTANCE + PLAYER.h / 2, h: PLAYER.h, facing: 1, dead: false };
  const cones = [];
  for (let step = 1; step <= STEPS; step++) {
    const shot = updateEnemy(e, STEP, level, player);
    if (shot) cones.push({ step, vx: round(shot.vx), vy: round(shot.vy) });
  }
  return cones;
}

const EXPECTED = {
  'snake walking: chicken to the east': [
    { step: 193, vx: 260, vy: 0 },
    { step: 385, vx: 260, vy: 0 },
    { step: 415, vx: 260, vy: 0 },
    { step: 607, vx: 260, vy: 0 },
    { step: 637, vx: 260, vy: 0 },
    { step: 667, vx: 260, vy: 0 },
    { step: 859, vx: 260, vy: 0 },
    { step: 1051, vx: 260, vy: 0 },
    { step: 1081, vx: 260, vy: 0 },
  ],
  'snake walking: chicken to the south-east': [
    { step: 193, vx: 183.848, vy: 183.848 },
    { step: 385, vx: 183.848, vy: 183.848 },
    { step: 415, vx: 183.848, vy: 183.848 },
    { step: 607, vx: 183.848, vy: 183.848 },
    { step: 637, vx: 183.848, vy: 183.848 },
    { step: 667, vx: 183.848, vy: 183.848 },
    { step: 859, vx: 183.848, vy: 183.848 },
    { step: 1051, vx: 183.848, vy: 183.848 },
    { step: 1081, vx: 183.848, vy: 183.848 },
  ],
  'snake walking: chicken to the south': [
    { step: 193, vx: 0, vy: 260 },
    { step: 385, vx: 0, vy: 260 },
    { step: 415, vx: 0, vy: 260 },
    { step: 607, vx: 0, vy: 260 },
    { step: 637, vx: 0, vy: 260 },
    { step: 667, vx: 0, vy: 260 },
    { step: 859, vx: 0, vy: 260 },
    { step: 1051, vx: 0, vy: 260 },
    { step: 1081, vx: 0, vy: 260 },
  ],
  'snake walking: chicken to the south-west': [
    { step: 193, vx: -183.848, vy: 183.848 },
    { step: 385, vx: -183.848, vy: 183.848 },
    { step: 415, vx: -183.848, vy: 183.848 },
    { step: 607, vx: -183.848, vy: 183.848 },
    { step: 637, vx: -183.848, vy: 183.848 },
    { step: 667, vx: -183.848, vy: 183.848 },
    { step: 859, vx: -183.848, vy: 183.848 },
    { step: 1051, vx: -183.848, vy: 183.848 },
    { step: 1081, vx: -183.848, vy: 183.848 },
  ],
  'snake walking: chicken to the west': [
    { step: 193, vx: -260, vy: 0 },
    { step: 385, vx: -260, vy: 0 },
    { step: 415, vx: -260, vy: 0 },
    { step: 607, vx: -260, vy: 0 },
    { step: 637, vx: -260, vy: 0 },
    { step: 667, vx: -260, vy: 0 },
    { step: 859, vx: -260, vy: 0 },
    { step: 1051, vx: -260, vy: 0 },
    { step: 1081, vx: -260, vy: 0 },
  ],
  'snake walking: chicken to the north-west': [
    { step: 193, vx: -183.848, vy: -183.848 },
    { step: 385, vx: -183.848, vy: -183.848 },
    { step: 415, vx: -183.848, vy: -183.848 },
    { step: 607, vx: -183.848, vy: -183.848 },
    { step: 637, vx: -183.848, vy: -183.848 },
    { step: 667, vx: -183.848, vy: -183.848 },
    { step: 859, vx: -183.848, vy: -183.848 },
    { step: 1051, vx: -183.848, vy: -183.848 },
    { step: 1081, vx: -183.848, vy: -183.848 },
  ],
  'snake walking: chicken to the north': [
    { step: 264, vx: 0, vy: -260 },
    { step: 456, vx: 0, vy: -260 },
    { step: 486, vx: 0, vy: -260 },
    { step: 678, vx: 0, vy: -260 },
    { step: 708, vx: 0, vy: -260 },
    { step: 738, vx: 0, vy: -260 },
    { step: 930, vx: 0, vy: -260 },
    { step: 1122, vx: 0, vy: -260 },
    { step: 1152, vx: 0, vy: -260 },
  ],
  'snake walking: chicken to the north-east': [
    { step: 193, vx: 183.848, vy: -183.848 },
    { step: 385, vx: 183.848, vy: -183.848 },
    { step: 415, vx: 183.848, vy: -183.848 },
    { step: 607, vx: 183.848, vy: -183.848 },
    { step: 637, vx: 183.848, vy: -183.848 },
    { step: 667, vx: 183.848, vy: -183.848 },
    { step: 859, vx: 183.848, vy: -183.848 },
    { step: 1051, vx: 183.848, vy: -183.848 },
    { step: 1081, vx: 183.848, vy: -183.848 },
  ],
  'snake flying: chicken to the east': [
    { step: 193, vx: 260, vy: 0 },
    { step: 385, vx: 260, vy: 0 },
    { step: 415, vx: 260, vy: 0 },
    { step: 607, vx: 260, vy: 0 },
    { step: 637, vx: 260, vy: 0 },
    { step: 667, vx: 260, vy: 0 },
    { step: 859, vx: 260, vy: 0 },
    { step: 1051, vx: 260, vy: 0 },
    { step: 1081, vx: 260, vy: 0 },
  ],
  'snake flying: chicken to the south-east': [
    { step: 193, vx: 183.848, vy: 183.848 },
    { step: 385, vx: 183.848, vy: 183.848 },
    { step: 415, vx: 183.848, vy: 183.848 },
    { step: 607, vx: 183.848, vy: 183.848 },
    { step: 637, vx: 183.848, vy: 183.848 },
    { step: 667, vx: 183.848, vy: 183.848 },
    { step: 859, vx: 183.848, vy: 183.848 },
    { step: 1051, vx: 183.848, vy: 183.848 },
    { step: 1081, vx: 183.848, vy: 183.848 },
  ],
  'snake flying: chicken to the south': [
    { step: 193, vx: 0, vy: 260 },
    { step: 385, vx: 0, vy: 260 },
    { step: 415, vx: 0, vy: 260 },
    { step: 607, vx: 0, vy: 260 },
    { step: 637, vx: 0, vy: 260 },
    { step: 667, vx: 0, vy: 260 },
    { step: 859, vx: 0, vy: 260 },
    { step: 1051, vx: 0, vy: 260 },
    { step: 1081, vx: 0, vy: 260 },
  ],
  'snake flying: chicken to the south-west': [
    { step: 193, vx: -183.848, vy: 183.848 },
    { step: 385, vx: -183.848, vy: 183.848 },
    { step: 415, vx: -183.848, vy: 183.848 },
    { step: 607, vx: -183.848, vy: 183.848 },
    { step: 637, vx: -183.848, vy: 183.848 },
    { step: 667, vx: -183.848, vy: 183.848 },
    { step: 859, vx: -183.848, vy: 183.848 },
    { step: 1051, vx: -183.848, vy: 183.848 },
    { step: 1081, vx: -183.848, vy: 183.848 },
  ],
  'snake flying: chicken to the west': [
    { step: 193, vx: -260, vy: 0 },
    { step: 385, vx: -260, vy: 0 },
    { step: 415, vx: -260, vy: 0 },
    { step: 607, vx: -260, vy: 0 },
    { step: 637, vx: -260, vy: 0 },
    { step: 667, vx: -260, vy: 0 },
    { step: 859, vx: -260, vy: 0 },
    { step: 1051, vx: -260, vy: 0 },
    { step: 1081, vx: -260, vy: 0 },
  ],
  'snake flying: chicken to the north-west': [
    { step: 193, vx: -183.848, vy: -183.848 },
    { step: 385, vx: -183.848, vy: -183.848 },
    { step: 415, vx: -183.848, vy: -183.848 },
    { step: 607, vx: -183.848, vy: -183.848 },
    { step: 637, vx: -183.848, vy: -183.848 },
    { step: 667, vx: -183.848, vy: -183.848 },
    { step: 859, vx: -183.848, vy: -183.848 },
    { step: 1051, vx: -183.848, vy: -183.848 },
    { step: 1081, vx: -183.848, vy: -183.848 },
  ],
  'snake flying: chicken to the north': [
    { step: 264, vx: 0, vy: -260 },
    { step: 456, vx: 0, vy: -260 },
    { step: 486, vx: 0, vy: -260 },
    { step: 678, vx: 0, vy: -260 },
    { step: 708, vx: 0, vy: -260 },
    { step: 738, vx: 0, vy: -260 },
    { step: 930, vx: 0, vy: -260 },
    { step: 1122, vx: 0, vy: -260 },
    { step: 1152, vx: 0, vy: -260 },
  ],
  'snake flying: chicken to the north-east': [
    { step: 193, vx: 183.848, vy: -183.848 },
    { step: 385, vx: 183.848, vy: -183.848 },
    { step: 415, vx: 183.848, vy: -183.848 },
    { step: 607, vx: 183.848, vy: -183.848 },
    { step: 637, vx: 183.848, vy: -183.848 },
    { step: 667, vx: 183.848, vy: -183.848 },
    { step: 859, vx: 183.848, vy: -183.848 },
    { step: 1051, vx: 183.848, vy: -183.848 },
    { step: 1081, vx: 183.848, vy: -183.848 },
  ],
};

for (const kind of ['walking', 'flying']) {
  for (const compass of COMPASS) {
    const [name, , , dx, dy] = compass;
    const label = `snake ${kind}: chicken to the ${name}`;
    test(label, () => {
      const cones = runScenario(kind, compass);
      assert.ok(cones.length >= 5, `${label}: only ${cones.length} cones recorded`);
      for (const cone of cones) {
        assert.equal(cone.vx, round(dx * CONE.speed), `step ${cone.step} vx`);
        assert.equal(cone.vy, round(dy * CONE.speed), `step ${cone.step} vy`);
      }
      assert.deepEqual(cones, EXPECTED[label], JSON.stringify(cones));
    });
  }
}
