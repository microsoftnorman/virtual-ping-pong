/** Server-side game loop — authoritative ball physics for online matches */

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const PADDLE_WIDTH = 18;
const PADDLE_HEIGHT = 120;
const BALL_RADIUS = 10;
const BALL_INITIAL_SPEED = 7;
const MAX_BALL_SPEED = 18;
const WINNING_SCORE = 11;
const TICK_RATE = 30;

class ServerGameLoop {
  constructor(io, roomCode, hostId, guestId) {
    this.io = io;
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.guestId = guestId;
    this.interval = null;

    this.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      spin: 0,
      speed: BALL_INITIAL_SPEED,
    };

    this.paddles = {
      left: { y: CANVAS_HEIGHT / 2, vy: 0 },
      right: { y: CANVAS_HEIGHT / 2, vy: 0 },
    };

    this.scores = { left: 0, right: 0 };
    this.rally = 0;
    this.phase = 'countdown';
  }

  /** Start the server-side game loop */
  start() {
    // Countdown delay
    setTimeout(() => {
      this.phase = 'playing';
      this._resetBall('right');
      this.interval = setInterval(() => this._tick(), 1000 / TICK_RATE);
    }, 4000); // 3-2-1-go = ~4s
  }

  /** Stop the game loop */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Update paddle position from client */
  updatePaddle(socketId, y, vy) {
    // Validate input
    if (typeof y !== 'number' || isNaN(y)) return;
    const clampedY = Math.max(PADDLE_HEIGHT / 2, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT / 2, y));
    const clampedVy = typeof vy === 'number' && !isNaN(vy) ? Math.max(-20, Math.min(20, vy)) : 0;

    const side = socketId === this.hostId ? 'left' : 'right';
    this.paddles[side].y = clampedY;
    this.paddles[side].vy = clampedVy;

    // Relay to opponent
    const opponentId = socketId === this.hostId ? this.guestId : this.hostId;
    this.io.to(opponentId).emit('opponent-paddle', { y: clampedY, vy: clampedVy });
  }

  _tick() {
    if (this.phase !== 'playing') return;

    const dt = 1 / TICK_RATE;
    const scale = dt * 60;

    // Move ball
    this.ball.x += this.ball.vx * scale;
    this.ball.y += this.ball.vy * scale;
    this.ball.vy += this.ball.spin * 0.15 * scale;

    // Wall bounce
    if (this.ball.y - BALL_RADIUS <= 0) {
      this.ball.y = BALL_RADIUS;
      this.ball.vy = Math.abs(this.ball.vy);
      this.ball.spin *= 0.8;
    } else if (this.ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
      this.ball.y = CANVAS_HEIGHT - BALL_RADIUS;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.ball.spin *= 0.8;
    }

    // Paddle collisions
    this._checkPaddle('left');
    this._checkPaddle('right');

    // Scoring
    if (this.ball.x - BALL_RADIUS <= 0) {
      this._score('right');
    } else if (this.ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
      this._score('left');
    }

    // Broadcast ball state
    this.io.to(this.roomCode).emit('ball-sync', {
      x: this.ball.x,
      y: this.ball.y,
      vx: this.ball.vx,
      vy: this.ball.vy,
    });
  }

  _checkPaddle(side) {
    const paddle = this.paddles[side];
    const halfH = PADDLE_HEIGHT / 2;
    const halfW = PADDLE_WIDTH / 2;
    const paddleX = side === 'left' ? 40 : CANVAS_WIDTH - 40;

    const paddleLeft = paddleX - halfW;
    const paddleRight = paddleX + halfW;
    const paddleTop = paddle.y - halfH;
    const paddleBottom = paddle.y + halfH;

    const withinY = this.ball.y + BALL_RADIUS >= paddleTop && this.ball.y - BALL_RADIUS <= paddleBottom;

    let hit = false;
    if (side === 'left' && this.ball.vx < 0) {
      hit = withinY && this.ball.x - BALL_RADIUS <= paddleRight && this.ball.x - BALL_RADIUS >= paddleLeft - 10;
    } else if (side === 'right' && this.ball.vx > 0) {
      hit = withinY && this.ball.x + BALL_RADIUS >= paddleLeft && this.ball.x + BALL_RADIUS <= paddleRight + 10;
    }

    if (!hit) return;

    const relativeY = (this.ball.y - paddle.y) / halfH;
    const bounceAngle = relativeY * (Math.PI / 3);
    const speed = Math.min(
      Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.03,
      MAX_BALL_SPEED
    );

    const dir = side === 'left' ? 1 : -1;
    this.ball.vx = dir * speed * Math.cos(bounceAngle);
    this.ball.vy = speed * Math.sin(bounceAngle);
    this.ball.spin = (paddle.vy || 0) * 0.1;

    if (side === 'left') {
      this.ball.x = paddleRight + BALL_RADIUS + 1;
    } else {
      this.ball.x = paddleLeft - BALL_RADIUS - 1;
    }

    this.rally++;
    if (this.rally % 3 === 0) {
      this.ball.speed = Math.min(this.ball.speed + 0.3, MAX_BALL_SPEED);
    }
  }

  _score(scorer) {
    this.scores[scorer]++;
    this.rally = 0;
    this.ball.speed = BALL_INITIAL_SPEED;

    this.io.to(this.roomCode).emit('score-update', {
      scores: { ...this.scores },
      rally: 0,
    });

    // Check win
    const { left, right } = this.scores;
    const max = Math.max(left, right);
    const min = Math.min(left, right);

    if (max >= WINNING_SCORE && max - min >= 2) {
      const winner = left > right ? 'left' : 'right';
      this.io.to(this.roomCode).emit('game-over', { winner });
      this.stop();
      return;
    }

    // Reset ball
    this.phase = 'scored';
    setTimeout(() => {
      this.phase = 'playing';
      this._resetBall(scorer === 'left' ? 'left' : 'right');
    }, 1200);
  }

  _resetBall(direction) {
    this.ball.x = CANVAS_WIDTH / 2;
    this.ball.y = CANVAS_HEIGHT / 2;
    this.ball.spin = 0;

    const angle = (Math.random() * 0.8 - 0.4);
    const dir = direction === 'left' ? -1 : 1;
    this.ball.vx = dir * this.ball.speed * Math.cos(angle);
    this.ball.vy = this.ball.speed * Math.sin(angle);
  }
}

export { ServerGameLoop };
