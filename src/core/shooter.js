import { STEP } from '../config.js';

export function shooterState(cfg, minVolley) {
  return { lives: cfg.lives, dizzy: 0, cooldown: cfg.fireEvery, winding: false, volleySize: minVolley, volleyHigh: false, nextHigh: false, shotsLeft: 0, gap: 0 };
}

export function updateShooter(e, dt, level, player, rules) {
  const { cfg } = rules;
  e.anim += dt;
  if (player && player.x !== e.x) e.dir = Math.sign(player.x - e.x);
  if (e.dizzy > 0) {
    e.dizzy = Math.max(0, e.dizzy - dt);
    e.winding = false;
    return null;
  }
  if (!player) return null;
  if (!rules.inRange(e, level, player)) {
    e.winding = false;
    e.shotsLeft = 0;
    e.cooldown = Math.max(e.cooldown, cfg.windup + STEP);
    return null;
  }
  if (e.shotsLeft > 0) {
    e.gap -= dt;
    if (e.gap > 0) return null;
    e.shotsLeft -= 1;
    if (e.shotsLeft === 0) e.cooldown = cfg.fireEvery + e.gap;
    else e.gap += cfg.volleyGap;
    return rules.shoot(e, player);
  }
  e.cooldown -= dt;
  e.winding = e.cooldown <= cfg.windup;
  if (e.cooldown > 0) return null;
  e.winding = false;
  e.volleyHigh = e.nextHigh;
  e.nextHigh = !e.nextHigh;
  e.shotsLeft = e.volleySize - 1;
  e.volleySize = e.volleySize === rules.maxVolley ? rules.minVolley : e.volleySize + 1;
  if (e.shotsLeft === 0) e.cooldown += cfg.fireEvery;
  else e.gap = cfg.volleyGap + e.cooldown;
  return rules.shoot(e, player);
}

export function hurtShooter(e, cfg) {
  e.lives -= 1;
  e.dizzy = cfg.dizzyTime;
  e.winding = false;
  e.shotsLeft = 0;
  e.cooldown = cfg.fireEvery;
}

export function stompShooter(e, cfg, defeat) {
  if (e.dizzy > 0) return 'bounce';
  if (e.lives > 1) {
    hurtShooter(e, cfg);
    return 'hurt';
  }
  return defeat(e);
}
