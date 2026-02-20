/** Main entry — bootstraps all modules, wires up UI events */

import { engine } from './game/engine.js';
import { handTracker } from './tracking/handTracker.js';
import { network } from './network/client.js';
import { audio } from './audio/audioManager.js';
import { setHighContrast } from './game/renderer.js';
import * as ui from './ui/screens.js';

const $ = (id) => document.getElementById(id);

let cameraReady = false;

const main = async () => {
  // Initialize UI
  ui.initScreens();

  // Initialize engine with canvas
  const canvas = $('gameCanvas');
  engine.init(canvas);

  // Scale canvas to fill window
  const resizeCanvas = () => {
    const scaleX = window.innerWidth / 1200;
    const scaleY = window.innerHeight / 700;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.width = `${1200 * scale}px`;
    canvas.style.height = `${700 * scale}px`;
    canvas.style.left = `${(window.innerWidth - 1200 * scale) / 2}px`;
    canvas.style.top = `${(window.innerHeight - 700 * scale) / 2}px`;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Show landing screen
  ui.showScreen('landing');

  // === Button bindings ===

  // Play button → init audio (needs user gesture) → mode select
  $('btn-play').addEventListener('click', () => {
    audio.init();
    audio.resume();
    ui.showScreen('mode');
  });

  // Solo mode
  $('btn-solo').addEventListener('click', () => {
    ui.showScreen('difficulty');
  });

  // Online mode
  $('btn-online').addEventListener('click', () => {
    ui.resetLobby();
    ui.showScreen('lobby');
  });

  // Back buttons
  $('btn-back-mode').addEventListener('click', () => ui.showScreen('landing'));
  $('btn-back-diff').addEventListener('click', () => ui.showScreen('mode'));
  $('btn-back-lobby').addEventListener('click', () => {
    network.disconnect();
    ui.showScreen('mode');
  });

  // Difficulty selection → start game
  document.querySelectorAll('.btn-difficulty').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const difficulty = btn.dataset.difficulty;
      await initCamera();
      engine.startSoloGame(difficulty);
    });
  });

  // Create room
  $('btn-create-room').addEventListener('click', () => {
    network.connect();
    network.createRoom();
  });

  // Join room
  $('btn-join-room').addEventListener('click', () => {
    const code = $('input-room-code').value.trim();
    if (code.length < 4) {
      ui.showJoinError('Code must be at least 4 characters');
      return;
    }
    ui.hideJoinError();
    network.connect();
    network.joinRoom(code);
  });

  // Enter key to join
  $('input-room-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-join-room').click();
  });

  // Game over buttons
  $('btn-play-again').addEventListener('click', () => {
    engine.stopGame();
    if (engine.state.mode === 'solo') {
      engine.startSoloGame(engine.state.difficulty);
    } else {
      ui.showScreen('lobby');
    }
  });

  $('btn-menu').addEventListener('click', () => {
    engine.stopGame();
    network.disconnect();
    ui.showScreen('landing');
  });

  // Settings
  $('btn-settings').addEventListener('click', () => {
    ui.showScreen('settings');
  });

  $('btn-close-settings').addEventListener('click', () => {
    // Return to whatever was active
    if (engine.state.phase === 'playing' || engine.state.phase === 'scored') {
      ui.showScreen('hud');
    } else {
      ui.showScreen('landing');
    }
  });

  // Settings toggles
  $('setting-sound').addEventListener('change', (e) => {
    audio.setEnabled(e.target.checked);
  });

  $('setting-music').addEventListener('change', (e) => {
    audio.setMusicEnabled(e.target.checked);
  });

  $('setting-fps').addEventListener('change', (e) => {
    engine.setShowFps(e.target.checked);
  });

  $('setting-keyboard').addEventListener('change', (e) => {
    engine.setKeyboardMode(e.target.checked);
    if (e.target.checked) {
      ui.showHandIndicator(false);
    }
  });

  $('setting-contrast').addEventListener('change', (e) => {
    setHighContrast(e.target.checked);
    document.body.classList.toggle('high-contrast', e.target.checked);
  });

  // Camera error screen
  $('btn-keyboard-fallback').addEventListener('click', () => {
    engine.setKeyboardMode(true);
    $('setting-keyboard').checked = true;
    ui.showScreen('difficulty');
  });

  $('btn-retry-camera').addEventListener('click', async () => {
    await initCamera();
    if (cameraReady) ui.showScreen('difficulty');
  });

  // === Network event handlers ===

  network.on('room-created', (data) => {
    ui.showRoomCode(data.roomCode);
  });

  network.on('room-joined', () => {
    // Waiting for game to start
  });

  network.on('room-ready', async () => {
    await initCamera();
    engine.startOnlineGame(network.side);
  });

  network.on('error', (data) => {
    ui.showJoinError(data.message || 'Connection error');
  });

  network.on('opponent-disconnected', () => {
    // Engine handles this
  });

  // Hand detection indicator
  handTracker.onDetectionChange = (detected) => {
    if (!engine.useKeyboard) {
      ui.showHandIndicator(!detected);
    }
  };
};

/** Initialize camera and hand tracking */
const initCamera = async () => {
  if (cameraReady || engine.useKeyboard) return;

  try {
    const video = $('webcam');
    await handTracker.init(video);
    await handTracker.start();
    cameraReady = true;
    ui.showHandIndicator(true); // Show until hand detected
  } catch (err) {
    console.error('Camera init failed:', err);
    ui.showScreen('cameraError');
  }
};

// Start the app
main();
