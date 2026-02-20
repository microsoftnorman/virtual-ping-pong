/** Game Engine — core loop, state management, ties everything together */

import { CONFIG, createState } from './config.js';
import { resetBall, stepPhysics, checkWin } from './physics.js';
import { render, renderMenuBg, shake, clearTrail, initCanvas } from './renderer.js';
import { particles } from './particles.js';
import { ai } from './ai.js';
import { audio } from '../audio/audioManager.js';
import { handTracker } from '../tracking/handTracker.js';
import { network } from '../network/client.js';
import * as ui from '../ui/screens.js';

const { CANVAS_HEIGHT, PADDLE_HEIGHT } = CONFIG;

class GameEngine {
  constructor() {
    this.state = createState();
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.lastTime = 0;
    this.fpsCounter = { frames: 0, lastTime: 0, value: 60 };
    this.showFps = false;
    this.useKeyboard = false;
    this.keys = { up: false, down: false };
    this.networkTickInterval = null;
    this.countdownHandle = null;
    this.lastPaddleY = 0;
  }

  /** Initialize the engine */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = initCanvas(canvas);
    this._setupKeyboard();
    this._startLoop();
  }

  /** Start a solo game vs AI */
  startSoloGame(difficulty) {
    this.state = createState();
    this.state.mode = 'solo';
    this.state.difficulty = difficulty;
    this.state.side = 'left';
    ai.setDifficulty(difficulty);
    clearTrail();
    particles.clear();

    ui.setHUDLabels('YOU', 'AI');
    ui.updateHUD(this.state);
    audio.startMusic();

    this._startCountdown();
  }

  /** Start an online game */
  startOnlineGame(side) {
    this.state = createState();
    this.state.mode = 'online';
    this.state.side = side;
    clearTrail();
    particles.clear();

    ui.setHUDLabels(
      side === 'left' ? 'YOU' : 'OPPONENT',
      side === 'right' ? 'YOU' : 'OPPONENT'
    );
    ui.updateHUD(this.state);
    audio.startMusic();

    this._startNetworkSync();
    this._startCountdown();
  }

  /** Stop the current game */
  stopGame() {
    this.state.phase = 'menu';
    audio.stopMusic();
    this._stopNetworkSync();
    if (this.countdownHandle) this.countdownHandle.cancel();
    particles.clear();
    clearTrail();
  }

  // === Private methods ===

  _startCountdown() {
    this.state.phase = 'countdown';
    this.countdownHandle = ui.runCountdown(() => {
      this.state.phase = 'playing';
      audio.play('go');
      resetBall(this.state.ball, 'right');
    });
    audio.play('countdown', { number: 3 });
    setTimeout(() => audio.play('countdown', { number: 2 }), 1000);
    setTimeout(() => audio.play('countdown', { number: 1 }), 2000);
  }

  _startLoop() {
    const loop = (timestamp) => {
      this.animFrameId = requestAnimationFrame(loop);

      // Delta time
      if (!this.lastTime) this.lastTime = timestamp;
      const rawDt = (timestamp - this.lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05); // cap at 50ms
      this.lastTime = timestamp;

      // FPS counter
      this._updateFps(timestamp);

      // Update & render based on phase
      switch (this.state.phase) {
        case 'menu':
          renderMenuBg(this.ctx, timestamp);
          break;
        case 'countdown':
          this._updatePlayerPaddle();
          render(this.ctx, this.state);
          break;
        case 'playing':
          this._updatePlaying(dt);
          render(this.ctx, this.state);
          break;
        case 'scored':
          render(this.ctx, this.state);
          break;
        case 'gameover':
          render(this.ctx, this.state);
          break;
        default:
          renderMenuBg(this.ctx, timestamp);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  _updatePlaying(dt) {
    // Update player paddle
    this._updatePlayerPaddle();

    // Update AI or online opponent
    if (this.state.mode === 'solo') {
      ai.update(this.state, performance.now());
    }

    // Step physics (only in solo mode, server handles online)
    if (this.state.mode === 'solo' || this.state.mode === 'online') {
      const result = stepPhysics(this.state, dt);

      if (result.hitPaddle) {
        audio.play('hit', { force: result.impactForce });
        particles.emit('hit', this.state.ball.x, this.state.ball.y);
        if (result.impactForce > 0.6) shake(result.impactForce * 8);
        this.state.rally++;
        ui.updateHUD(this.state);

        // Speed up every 3 rallies
        if (this.state.rally % 3 === 0) {
          this.state.ball.speed = Math.min(
            this.state.ball.speed + 0.3,
            CONFIG.MAX_BALL_SPEED
          );
        }
      }

      if (result.hitWall) {
        audio.play('wallBounce');
        particles.emit('wallBounce', this.state.ball.x, this.state.ball.y);
      }

      if (result.scored) {
        this._handleScore(result.scored);
      }
    }
  }

  _updatePlayerPaddle() {
    const playerSide = this.state.side;
    const paddle = this.state.paddles[playerSide];
    const prevY = paddle.y;

    if (this.useKeyboard) {
      // Keyboard control
      const speed = 7;
      if (this.keys.up) paddle.y -= speed;
      if (this.keys.down) paddle.y += speed;
    } else if (handTracker.position.detected) {
      // Hand tracking
      paddle.y = handTracker.position.y;
    }

    // Clamp
    const halfH = PADDLE_HEIGHT / 2;
    paddle.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, paddle.y));

    // Track velocity for spin
    paddle.vy = paddle.y - prevY;
  }

  _handleScore(scorer) {
    this.state.scores[scorer]++;
    this.state.rally = 0;
    this.state.ball.speed = CONFIG.BALL_INITIAL_SPEED;
    this.state.lastScorer = scorer;

    audio.play('score');
    particles.emit('score', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    ui.updateHUD(this.state);

    // Check for win
    const winner = checkWin(this.state.scores);
    if (winner) {
      this._handleGameOver(winner);
      return;
    }

    // Reset ball after delay
    this.state.phase = 'scored';
    setTimeout(() => {
      if (this.state.phase !== 'scored') return;
      const serveDir = scorer === 'left' ? 'left' : 'right';
      resetBall(this.state.ball, serveDir);
      clearTrail();
      this.state.phase = 'playing';
    }, 1200);
  }

  _handleGameOver(winner) {
    this.state.phase = 'gameover';
    const isWin = winner === this.state.side;
    audio.play(isWin ? 'win' : 'lose');
    particles.emit('win', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 3);
    audio.stopMusic();

    setTimeout(() => {
      ui.showGameOver(winner, this.state.scores, this.state.side);
    }, 1500);
  }

  _startNetworkSync() {
    this.networkTickInterval = setInterval(() => {
      const paddle = this.state.paddles[this.state.side];
      network.sendPaddlePosition(paddle.y, paddle.vy);
    }, 1000 / CONFIG.NET_TICK_RATE);

    // Listen for opponent paddle updates
    network.on('opponent-paddle', (data) => {
      const oppSide = this.state.side === 'left' ? 'right' : 'left';
      const opp = this.state.paddles[oppSide];
      // Smooth opponent position
      opp.y += (data.y - opp.y) * 0.4;
      opp.vy = data.vy || 0;
    });

    // Listen for ball sync from server
    network.on('ball-sync', (data) => {
      const ball = this.state.ball;
      // Interpolate toward server state
      ball.x += (data.x - ball.x) * 0.3;
      ball.y += (data.y - ball.y) * 0.3;
      ball.vx = data.vx;
      ball.vy = data.vy;
    });

    // Listen for score updates
    network.on('score-update', (data) => {
      this.state.scores = data.scores;
      this.state.rally = data.rally || 0;
      ui.updateHUD(this.state);
    });

    // Listen for game over
    network.on('game-over', (data) => {
      this._handleGameOver(data.winner);
    });

    // Opponent disconnect
    network.on('opponent-disconnected', () => {
      this.state.phase = 'gameover';
      ui.showGameOver(this.state.side, this.state.scores, this.state.side);
    });
  }

  _stopNetworkSync() {
    if (this.networkTickInterval) {
      clearInterval(this.networkTickInterval);
      this.networkTickInterval = null;
    }
    network.off('opponent-paddle');
    network.off('ball-sync');
    network.off('score-update');
    network.off('game-over');
    network.off('opponent-disconnected');
  }

  _setupKeyboard() {
    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down',
      w: 'up', W: 'up',
      s: 'down', S: 'down',
    };

    document.addEventListener('keydown', (e) => {
      const action = keyMap[e.key];
      if (action) {
        this.keys[action] = true;
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      const action = keyMap[e.key];
      if (action) {
        this.keys[action] = false;
      }
    });
  }

  _updateFps(timestamp) {
    this.fpsCounter.frames++;
    if (timestamp - this.fpsCounter.lastTime >= 1000) {
      this.fpsCounter.value = this.fpsCounter.frames;
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = timestamp;
      if (this.showFps) {
        ui.updateFPS(this.fpsCounter.value);
      }
    }
  }

  setShowFps(show) {
    this.showFps = show;
    if (!show) {
      const el = document.getElementById('hud-fps');
      if (el) el.textContent = '';
    }
  }

  setKeyboardMode(on) {
    this.useKeyboard = on;
  }
}

export const engine = new GameEngine();
