/** Physics module — ball movement, collisions, scoring */

import { CONFIG } from './config.js';

const { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, MAX_BALL_SPEED } = CONFIG;

/**
 * Reset ball to center with serve direction
 * @param {object} ball
 * @param {string} direction - 'left' or 'right'
 */
export const resetBall = (ball, direction = 'right') => {
  ball.x = CANVAS_WIDTH / 2;
  ball.y = CANVAS_HEIGHT / 2;
  ball.spin = 0;

  const angle = (Math.random() * 0.8 - 0.4); // -0.4 to 0.4 radians
  const dir = direction === 'left' ? -1 : 1;
  ball.vx = dir * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
};

/**
 * Step ball physics for one frame
 * @param {object} state - full game state
 * @param {number} dt - delta time in seconds (typically 1/60)
 * @returns {{ scored: string|null, hitPaddle: string|null, hitWall: boolean, impactForce: number }}
 */
export const stepPhysics = (state, dt) => {
  const { ball, paddles } = state;
  const scale = dt * 60; // normalize to 60fps baseline

  const result = { scored: null, hitPaddle: null, hitWall: false, impactForce: 0 };

  // Move ball
  ball.x += ball.vx * scale;
  ball.y += ball.vy * scale;

  // Apply spin to curve
  ball.vy += ball.spin * 0.15 * scale;

  // Top/bottom wall bounce
  if (ball.y - BALL_RADIUS <= 0) {
    ball.y = BALL_RADIUS;
    ball.vy = Math.abs(ball.vy);
    ball.spin *= 0.8;
    result.hitWall = true;
  } else if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - BALL_RADIUS;
    ball.vy = -Math.abs(ball.vy);
    ball.spin *= 0.8;
    result.hitWall = true;
  }

  // Paddle collisions
  const leftPaddle = paddles.left;
  const rightPaddle = paddles.right;

  // Left paddle
  if (ball.vx < 0) {
    const paddleResult = checkPaddleCollision(ball, leftPaddle, 'left');
    if (paddleResult) {
      result.hitPaddle = 'left';
      result.impactForce = paddleResult.force;
    }
  }

  // Right paddle
  if (ball.vx > 0) {
    const paddleResult = checkPaddleCollision(ball, rightPaddle, 'right');
    if (paddleResult) {
      result.hitPaddle = 'right';
      result.impactForce = paddleResult.force;
    }
  }

  // Scoring
  if (ball.x - BALL_RADIUS <= 0) {
    result.scored = 'right';
  } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
    result.scored = 'left';
  }

  return result;
};

/** Check and resolve collision with a paddle */
const checkPaddleCollision = (ball, paddle, side) => {
  const halfW = PADDLE_WIDTH / 2;
  const halfH = PADDLE_HEIGHT / 2;

  const paddleLeft = paddle.x - halfW;
  const paddleRight = paddle.x + halfW;
  const paddleTop = paddle.y - halfH;
  const paddleBottom = paddle.y + halfH;

  const withinY = ball.y + BALL_RADIUS >= paddleTop && ball.y - BALL_RADIUS <= paddleBottom;

  let hit = false;
  if (side === 'left') {
    hit = withinY && ball.x - BALL_RADIUS <= paddleRight && ball.x - BALL_RADIUS >= paddleLeft - 10;
  } else {
    hit = withinY && ball.x + BALL_RADIUS >= paddleLeft && ball.x + BALL_RADIUS <= paddleRight + 10;
  }

  if (!hit) return null;

  // Reflect
  const relativeY = (ball.y - paddle.y) / halfH; // -1 to 1
  const bounceAngle = relativeY * (Math.PI / 3); // max 60 degrees

  const speed = Math.min(
    Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.03,
    MAX_BALL_SPEED
  );

  const dir = side === 'left' ? 1 : -1;
  ball.vx = dir * speed * Math.cos(bounceAngle);
  ball.vy = speed * Math.sin(bounceAngle);

  // Transfer paddle velocity to spin
  ball.spin = (paddle.vy || 0) * 0.1;

  // Push ball outside paddle
  if (side === 'left') {
    ball.x = paddleRight + BALL_RADIUS + 1;
  } else {
    ball.x = paddleLeft - BALL_RADIUS - 1;
  }

  const force = speed / MAX_BALL_SPEED;
  return { force };
};

/**
 * Check if the game is won (first to 11, must win by 2 after deuce)
 */
export const checkWin = (scores) => {
  const { left, right } = scores;
  const max = Math.max(left, right);
  const min = Math.min(left, right);

  if (max >= CONFIG.WINNING_SCORE && max - min >= 2) {
    return left > right ? 'left' : 'right';
  }
  return null;
};
