/** UI Screens — menu navigation, HUD updates, overlays */

const $ = (id) => document.getElementById(id);

const screens = {};
let currentScreen = null;

/** Initialize all screen references */
export const initScreens = () => {
  screens.landing = $('screen-landing');
  screens.mode = $('screen-mode');
  screens.difficulty = $('screen-difficulty');
  screens.lobby = $('screen-lobby');
  screens.countdown = $('screen-countdown');
  screens.hud = $('hud');
  screens.gameover = $('screen-gameover');
  screens.settings = $('screen-settings');
  screens.cameraError = $('screen-camera-error');
};

/** Show a screen, hide the previous one */
export const showScreen = (name) => {
  // Hide all screens
  Object.values(screens).forEach((el) => {
    if (el) el.classList.remove('active');
  });

  // Show the target
  if (screens[name]) {
    screens[name].classList.add('active');
    currentScreen = name;
  }
};

/** Show multiple screens at once (e.g., HUD + countdown) */
export const showScreens = (...names) => {
  Object.values(screens).forEach((el) => {
    if (el) el.classList.remove('active');
  });
  names.forEach((name) => {
    if (screens[name]) screens[name].classList.add('active');
  });
};

/** Update HUD scores */
export const updateHUD = (state) => {
  const leftScore = $('hud-left-score');
  const rightScore = $('hud-right-score');
  const rally = $('hud-rally');

  if (leftScore) leftScore.textContent = state.scores.left;
  if (rightScore) rightScore.textContent = state.scores.right;
  if (rally) rally.textContent = `Rally: ${state.rally}`;
};

/** Set HUD player labels */
export const setHUDLabels = (leftLabel, rightLabel) => {
  const left = $('hud-left-label');
  const right = $('hud-right-label');
  if (left) left.textContent = leftLabel;
  if (right) right.textContent = rightLabel;
};

/** Update FPS display */
export const updateFPS = (fps) => {
  const el = $('hud-fps');
  if (el) el.textContent = `${fps} FPS`;
};

/** Show/hide hand detection indicator */
export const showHandIndicator = (show) => {
  const el = $('hand-indicator');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
};

/** Run countdown animation (3, 2, 1, GO!) */
export const runCountdown = (onComplete) => {
  showScreens('hud', 'countdown');
  const numEl = $('countdown-number');
  let count = 3;

  const tick = () => {
    if (count > 0) {
      numEl.textContent = count;
      numEl.style.animation = 'none';
      // Force reflow
      void numEl.offsetWidth;
      numEl.style.animation = 'countPulse 0.8s ease-out';
      count--;
      setTimeout(tick, 1000);
    } else {
      numEl.textContent = 'GO!';
      numEl.style.color = '#39ff14';
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = 'countPulse 0.5s ease-out';
      setTimeout(() => {
        showScreen('hud');
        numEl.style.color = '';
        onComplete();
      }, 600);
    }
  };

  tick();
  return { cancel: () => { count = -1; } };
};

/** Show game over screen */
export const showGameOver = (winner, scores, playerSide = 'left') => {
  const title = $('gameover-title');
  const score = $('gameover-score');

  const isWin = winner === playerSide;
  title.textContent = isWin ? 'YOU WIN!' : 'YOU LOSE!';
  title.style.background = isWin
    ? 'linear-gradient(135deg, #39ff14, #00d4ff)'
    : 'linear-gradient(135deg, #ff2d78, #ff6b35)';
  title.style.webkitBackgroundClip = 'text';
  title.style.backgroundClip = 'text';

  score.textContent = `${scores.left} — ${scores.right}`;

  showScreen('gameover');
};

/** Show room code in lobby */
export const showRoomCode = (code) => {
  const display = $('room-code-display');
  const waiting = $('waiting-msg');
  if (display) {
    display.textContent = code;
    display.classList.remove('hidden');
  }
  if (waiting) waiting.classList.remove('hidden');
};

/** Show join error */
export const showJoinError = (msg) => {
  const el = $('join-error');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
};

/** Hide join error */
export const hideJoinError = () => {
  const el = $('join-error');
  if (el) el.classList.add('hidden');
};

/** Reset lobby UI */
export const resetLobby = () => {
  const display = $('room-code-display');
  const waiting = $('waiting-msg');
  const input = $('input-room-code');
  if (display) display.classList.add('hidden');
  if (waiting) waiting.classList.add('hidden');
  if (input) input.value = '';
  hideJoinError();
};

/** Get current screen name */
export const getCurrentScreen = () => currentScreen;
