/** AI opponent — three difficulty levels */

import { CONFIG } from './config.js';

const { CANVAS_HEIGHT, PADDLE_HEIGHT, CANVAS_WIDTH } = CONFIG;

const DIFFICULTIES = {
  easy: {
    reactionDelay: 280,
    errorMargin: 45,
    speedLimit: 3.5,
    predictionNoise: 60,
  },
  medium: {
    reactionDelay: 160,
    errorMargin: 22,
    speedLimit: 5.5,
    predictionNoise: 25,
  },
  hard: {
    reactionDelay: 80,
    errorMargin: 6,
    speedLimit: 8,
    predictionNoise: 8,
  },
};

class AIController {
  constructor() {
    this.targetY = CANVAS_HEIGHT / 2;
    this.lastUpdateTime = 0;
    this.predictionOffset = 0;
    this.difficulty = 'medium';
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  /** Update AI paddle position */
  update(state, now) {
    const settings = DIFFICULTIES[this.difficulty];
    const paddle = state.paddles.right;
    const { ball } = state;

    // Only react after delay
    if (now - this.lastUpdateTime < settings.reactionDelay) {
      return this._moveToward(paddle, this.targetY, settings.speedLimit);
    }
    this.lastUpdateTime = now;

    // Only track when ball is moving toward AI
    if (ball.vx > 0) {
      this.targetY = this._predictLanding(ball, settings);
    } else {
      // Return to center when ball is going away
      this.targetY = CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 40;
    }

    return this._moveToward(paddle, this.targetY, settings.speedLimit);
  }

  /** Predict where ball will reach the AI's side */
  _predictLanding(ball, settings) {
    let px = ball.x;
    let py = ball.y;
    let pvx = ball.vx;
    let pvy = ball.vy;
    const halfH = PADDLE_HEIGHT / 2;

    // Simulate ball path
    const targetX = CANVAS_WIDTH - CONFIG.PADDLE_MARGIN;
    const maxSteps = 200;

    for (let i = 0; i < maxSteps && px < targetX; i++) {
      px += pvx;
      py += pvy;

      // Wall bounce simulation
      if (py <= CONFIG.BALL_RADIUS) {
        py = CONFIG.BALL_RADIUS;
        pvy = Math.abs(pvy);
      } else if (py >= CANVAS_HEIGHT - CONFIG.BALL_RADIUS) {
        py = CANVAS_HEIGHT - CONFIG.BALL_RADIUS;
        pvy = -Math.abs(pvy);
      }
    }

    // Add noise based on difficulty
    const noise = (Math.random() - 0.5) * settings.predictionNoise * 2;
    const error = (Math.random() - 0.5) * settings.errorMargin * 2;

    return Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, py + noise + error));
  }

  /** Move paddle toward target Y with speed limit */
  _moveToward(paddle, targetY, speedLimit) {
    const diff = targetY - paddle.y;
    const move = Math.sign(diff) * Math.min(Math.abs(diff), speedLimit);
    const halfH = PADDLE_HEIGHT / 2;

    paddle.vy = move;
    paddle.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, paddle.y + move));
    return move;
  }
}

export const ai = new AIController();
