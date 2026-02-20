/** Canvas 2D Renderer — Neon/dark aesthetic with glow effects */

import { CONFIG } from './config.js';
import { particles } from './particles.js';

const { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, TRAIL_LENGTH } = CONFIG;

// Screen shake state
let shakeX = 0;
let shakeY = 0;
let shakeDecay = 0.9;

// Ball trail history
const trail = [];

/** Colors */
const COLORS = {
  bg: '#0a0a1a',
  table: '#0d2818',
  tableBorder: '#1a5c30',
  tableLines: 'rgba(255,255,255,0.15)',
  net: 'rgba(255,255,255,0.4)',
  netGlow: 'rgba(255,255,255,0.1)',
  ball: '#ffffff',
  ballGlow: 'rgba(255,255,255,0.6)',
  paddleLeft: '#00d4ff',
  paddleLeftGlow: 'rgba(0,212,255,0.4)',
  paddleRight: '#39ff14',
  paddleRightGlow: 'rgba(57,255,20,0.4)',
};

const COLORS_HC = {
  bg: '#000000',
  table: '#001a0d',
  tableBorder: '#00ff66',
  tableLines: 'rgba(255,255,255,0.3)',
  net: 'rgba(255,255,255,0.8)',
  netGlow: 'rgba(255,255,255,0.2)',
  ball: '#ffffff',
  ballGlow: 'rgba(255,255,255,0.8)',
  paddleLeft: '#00ffff',
  paddleLeftGlow: 'rgba(0,255,255,0.5)',
  paddleRight: '#00ff00',
  paddleRightGlow: 'rgba(0,255,0,0.5)',
};

let colors = COLORS;

export const setHighContrast = (on) => {
  colors = on ? COLORS_HC : COLORS;
};

/** Trigger screen shake */
export const shake = (intensity = 5) => {
  shakeX = (Math.random() - 0.5) * intensity * 2;
  shakeY = (Math.random() - 0.5) * intensity * 2;
};

/** Initialize canvas and return context */
export const initCanvas = (canvas) => {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  return ctx;
};

/** Main render function */
export const render = (ctx, state) => {
  // Apply shake
  shakeX *= shakeDecay;
  shakeY *= shakeDecay;
  if (Math.abs(shakeX) < 0.1) shakeX = 0;
  if (Math.abs(shakeY) < 0.1) shakeY = 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx);
  drawTable(ctx);
  drawNet(ctx);
  drawBallTrail(ctx, state.ball);
  drawBall(ctx, state.ball);
  drawPaddle(ctx, state.paddles.left, 'left');
  drawPaddle(ctx, state.paddles.right, 'right');
  particles.update();
  particles.draw(ctx);

  ctx.restore();
};

/** Render menu background animation */
export const renderMenuBg = (ctx, time) => {
  drawBackground(ctx);
  drawTable(ctx);
  drawNet(ctx);

  // Floating ball animation
  const bx = CANVAS_WIDTH / 2 + Math.sin(time * 0.002) * 200;
  const by = CANVAS_HEIGHT / 2 + Math.cos(time * 0.003) * 100;
  drawBall(ctx, { x: bx, y: by });

  // Faint paddles
  ctx.globalAlpha = 0.3;
  drawPaddle(ctx, { x: CONFIG.PADDLE_MARGIN, y: CANVAS_HEIGHT / 2 + Math.sin(time * 0.001) * 80 }, 'left');
  drawPaddle(ctx, { x: CANVAS_WIDTH - CONFIG.PADDLE_MARGIN, y: CANVAS_HEIGHT / 2 + Math.cos(time * 0.0015) * 80 }, 'right');
  ctx.globalAlpha = 1;
};

// ===== Drawing helpers =====

const drawBackground = (ctx) => {
  // Dark gradient background
  const grad = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
  );
  grad.addColorStop(0, '#0f0f2a');
  grad.addColorStop(1, colors.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
};

const drawTable = (ctx) => {
  const margin = 20;
  const w = CANVAS_WIDTH - margin * 2;
  const h = CANVAS_HEIGHT - margin * 2;

  // Table surface with subtle 3D perspective
  ctx.fillStyle = colors.table;
  ctx.strokeStyle = colors.tableBorder;
  ctx.lineWidth = 3;

  // Draw with rounded corners
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(margin + r, margin);
  ctx.lineTo(margin + w - r, margin);
  ctx.quadraticCurveTo(margin + w, margin, margin + w, margin + r);
  ctx.lineTo(margin + w, margin + h - r);
  ctx.quadraticCurveTo(margin + w, margin + h, margin + w - r, margin + h);
  ctx.lineTo(margin + r, margin + h);
  ctx.quadraticCurveTo(margin, margin + h, margin, margin + h - r);
  ctx.lineTo(margin, margin + r);
  ctx.quadraticCurveTo(margin, margin, margin + r, margin);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center line
  ctx.strokeStyle = colors.tableLines;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, margin);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - margin);
  ctx.stroke();
  ctx.setLineDash([]);

  // Edge lines
  ctx.strokeStyle = colors.tableLines;
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 15, margin + 15, w - 30, h - 30);
};

const drawNet = (ctx) => {
  const x = CANVAS_WIDTH / 2;

  // Net glow
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = colors.netGlow;

  ctx.strokeStyle = colors.net;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 15);
  ctx.lineTo(x, CANVAS_HEIGHT - 15);
  ctx.stroke();

  // Net posts
  ctx.fillStyle = colors.net;
  ctx.fillRect(x - 4, 10, 8, 10);
  ctx.fillRect(x - 4, CANVAS_HEIGHT - 20, 8, 10);

  // Net mesh lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let y = 30; y < CANVAS_HEIGHT - 20; y += 20) {
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.stroke();
  }

  ctx.restore();
};

const drawBallTrail = (ctx, ball) => {
  // Record trail position
  trail.push({ x: ball.x, y: ball.y });
  if (trail.length > TRAIL_LENGTH) trail.shift();

  ctx.save();
  for (let i = 0; i < trail.length - 1; i++) {
    const alpha = (i / trail.length) * 0.3;
    const size = BALL_RADIUS * (i / trail.length) * 0.8;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.ball;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawBall = (ctx, ball) => {
  ctx.save();

  // Outer glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = colors.ballGlow;

  // Ball body
  const grad = ctx.createRadialGradient(
    ball.x - 2, ball.y - 2, 1,
    ball.x, ball.y, BALL_RADIUS
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ccccff');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawPaddle = (ctx, paddle, side) => {
  const halfW = PADDLE_WIDTH / 2;
  const halfH = PADDLE_HEIGHT / 2;
  const x = paddle.x - halfW;
  const y = paddle.y - halfH;

  const color = side === 'left' ? colors.paddleLeft : colors.paddleRight;
  const glowColor = side === 'left' ? colors.paddleLeftGlow : colors.paddleRightGlow;

  ctx.save();

  // Glow
  ctx.shadowBlur = 25;
  ctx.shadowColor = glowColor;

  // Paddle body
  const grad = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, lightenColor(color, 30));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;

  // Rounded rectangle
  const r = PADDLE_WIDTH / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + PADDLE_WIDTH - r, y);
  ctx.quadraticCurveTo(x + PADDLE_WIDTH, y, x + PADDLE_WIDTH, y + r);
  ctx.lineTo(x + PADDLE_WIDTH, y + PADDLE_HEIGHT - r);
  ctx.quadraticCurveTo(x + PADDLE_WIDTH, y + PADDLE_HEIGHT, x + PADDLE_WIDTH - r, y + PADDLE_HEIGHT);
  ctx.lineTo(x + r, y + PADDLE_HEIGHT);
  ctx.quadraticCurveTo(x, y + PADDLE_HEIGHT, x, y + PADDLE_HEIGHT - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Edge highlight
  ctx.shadowBlur = 0;
  ctx.strokeStyle = lightenColor(color, 60);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
};

const lightenColor = (hex, amount) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `rgb(${r},${g},${b})`;
};

/** Clear the trail history */
export const clearTrail = () => {
  trail.length = 0;
};
