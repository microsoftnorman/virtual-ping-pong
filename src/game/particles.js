/** Particle system with object pooling — hit sparks, confetti, etc. */

import { CONFIG } from './config.js';

const POOL_SIZE = CONFIG.PARTICLE_POOL_SIZE;

/** Particle configs for different effect types */
const PRESETS = {
  hit: {
    count: 15,
    speed: [3, 8],
    life: [15, 35],
    size: [2, 5],
    colors: ['#39ff14', '#00d4ff', '#ffffff'],
    gravity: 0.05,
    drag: 0.98,
    glow: true,
  },
  wallBounce: {
    count: 6,
    speed: [2, 5],
    life: [10, 20],
    size: [1, 3],
    colors: ['#ffffff', '#aaaaff'],
    gravity: 0,
    drag: 0.95,
    glow: false,
  },
  score: {
    count: 60,
    speed: [2, 10],
    life: [40, 80],
    size: [3, 8],
    colors: ['#39ff14', '#00d4ff', '#ff2d78', '#ff6b35', '#b44dff', '#ffdd00'],
    gravity: 0.12,
    drag: 0.97,
    glow: true,
  },
  win: {
    count: 120,
    speed: [3, 14],
    life: [60, 120],
    size: [3, 10],
    colors: ['#39ff14', '#00d4ff', '#ff2d78', '#ff6b35', '#b44dff', '#ffdd00', '#ffffff'],
    gravity: 0.08,
    drag: 0.98,
    glow: true,
  },
};

class ParticleSystem {
  constructor() {
    this.pool = new Array(POOL_SIZE);
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '', gravity: 0, drag: 0, glow: false };
    }
    this.activeCount = 0;
  }

  /** Emit particles of a given type at position */
  emit(type, x, y) {
    const preset = PRESETS[type];
    if (!preset) return;

    for (let i = 0; i < preset.count; i++) {
      const p = this._acquire();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = preset.speed[0] + Math.random() * (preset.speed[1] - preset.speed[0]);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = preset.life[0] + Math.random() * (preset.life[1] - preset.life[0]);
      p.maxLife = p.life;
      p.size = preset.size[0] + Math.random() * (preset.size[1] - preset.size[0]);
      p.color = preset.colors[Math.floor(Math.random() * preset.colors.length)];
      p.gravity = preset.gravity;
      p.drag = preset.drag;
      p.glow = preset.glow;
    }
  }

  /** Update all active particles */
  update() {
    this.activeCount = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life--;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      this.activeCount++;
    }
  }

  /** Draw all active particles */
  draw(ctx) {
    ctx.save();
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      if (p.glow) {
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _acquire() {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        return this.pool[i];
      }
    }
    return null;
  }

  clear() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i].active = false;
    }
  }
}

export const particles = new ParticleSystem();
