/** Shared game configuration / constants */

export const CONFIG = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 700,
  PADDLE_WIDTH: 18,
  PADDLE_HEIGHT: 120,
  PADDLE_MARGIN: 40,
  BALL_RADIUS: 10,
  BALL_INITIAL_SPEED: 7,
  MAX_BALL_SPEED: 18,
  WINNING_SCORE: 11,
  NET_TICK_RATE: 30,
  SMOOTHING_ALPHA: 0.3,
  PARTICLE_POOL_SIZE: 300,
  TRAIL_LENGTH: 8,
};

/** Create fresh game state */
export const createState = () => ({
  ball: {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    spin: 0,
    speed: CONFIG.BALL_INITIAL_SPEED,
  },
  paddles: {
    left: {
      x: CONFIG.PADDLE_MARGIN,
      y: CONFIG.CANVAS_HEIGHT / 2,
      vy: 0,
    },
    right: {
      x: CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_MARGIN,
      y: CONFIG.CANVAS_HEIGHT / 2,
      vy: 0,
    },
  },
  scores: { left: 0, right: 0 },
  rally: 0,
  phase: 'menu',
  mode: null,
  difficulty: 'medium',
  side: 'left',
  lastScorer: null,
});
