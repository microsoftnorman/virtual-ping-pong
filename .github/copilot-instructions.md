# Copilot Instructions — Virtual Ping Pong

## Project Overview
A browser-based virtual ping pong game using webcam hand tracking (MediaPipe Hands) for paddle control. Supports single-player vs AI and two-player online via Socket.IO. Built with Vanilla JS, HTML5 Canvas, Vite, and Node.js/Express.

## Architecture
- **Frontend**: Vanilla JS (ES Modules), HTML5 Canvas 2D rendering, Vite bundler
- **Hand Tracking**: MediaPipe Hands via CDN (`@mediapipe/hands`, `@mediapipe/camera_utils`)
- **Networking**: Socket.IO for real-time multiplayer (server-authoritative ball physics)
- **Server**: Node.js + Express serves static files + Socket.IO game rooms
- **Audio**: Web Audio API for synthesized sound effects (no external audio files)

## Code Conventions
- Use **ES Module** syntax (`import`/`export`) everywhere, no CommonJS in frontend code.
- Server code (`server/`) uses **CommonJS** (`require`/`module.exports`) for Node.js compat.
- Use **`const`** by default, `let` when reassignment is needed, never `var`.
- Prefer **arrow functions** for callbacks, regular functions for methods/constructors.
- Use **template literals** for string interpolation.
- Name files in **camelCase** (e.g., `handTracker.js`, `audioManager.js`).
- Name classes in **PascalCase**, constants in **UPPER_SNAKE_CASE**, variables/functions in **camelCase**.
- Keep functions **under 40 lines**; extract helpers when logic grows.
- No TypeScript — this is a vanilla JS project. Use JSDoc for critical type hints.

## Game Constants
All magic numbers live in a shared config:
```js
// Game canvas is always 1200×700 (logical pixels)
CANVAS_WIDTH = 1200
CANVAS_HEIGHT = 700
PADDLE_WIDTH = 18
PADDLE_HEIGHT = 120
BALL_RADIUS = 10
BALL_INITIAL_SPEED = 7
MAX_BALL_SPEED = 18
WINNING_SCORE = 11
NET_TICK_RATE = 30 // Hz
```

## Key Patterns

### Game State
All game state lives in a single object passed between modules:
```js
const state = {
  ball: { x, y, vx, vy, spin },
  paddles: { left: { x, y }, right: { x, y } },
  scores: { left: 0, right: 0 },
  rally: 0,
  phase: 'menu' | 'countdown' | 'playing' | 'scored' | 'gameover'
};
```

### Hand Tracking
- MediaPipe runs in a separate processing pipeline, updates a shared position object.
- Use exponential smoothing (α=0.3) to reduce jitter.
- Fallback to keyboard input if camera is unavailable.

### Rendering
- Use `requestAnimationFrame` with delta-time for frame-independent movement.
- Draw order: background → table → net → ball trail → ball → paddles → particles → HUD.
- Particle effects use object pooling (pre-allocate 200 particles).

### Networking
- Server is authoritative for ball physics in online mode.
- Clients send paddle position at 30Hz.
- Server broadcasts ball state at 30Hz.
- Client uses interpolation to smooth server updates.

## File Map
| File | Purpose |
|------|---------|
| `src/main.js` | App entry, bootstraps everything |
| `src/game/engine.js` | Game loop, state management |
| `src/game/physics.js` | Ball movement, collisions |
| `src/game/renderer.js` | Canvas drawing + visual effects |
| `src/game/particles.js` | Particle system (hit sparks, confetti) |
| `src/game/ai.js` | AI opponent behavior |
| `src/tracking/handTracker.js` | MediaPipe Hands integration |
| `src/network/client.js` | Socket.IO client wrapper |
| `src/audio/audioManager.js` | Web Audio synthesized sounds |
| `src/ui/screens.js` | Menu screens, HUD, overlays |
| `server/index.js` | Express + Socket.IO server |
| `server/roomManager.js` | Online room management |
| `server/gameLoop.js` | Server-side physics for online games |

## Common Tasks

### Adding a new visual effect
1. Add particle config to `particles.js`
2. Call `particles.emit(type, x, y)` from `engine.js`
3. Particles auto-render in the draw loop

### Adding a new sound effect
1. Add synthesis function in `audioManager.js`
2. Call `audio.play('effectName')` from game code

### Adjusting AI difficulty
- Modify constants in `ai.js`: `reactionDelay`, `errorMargin`, `speedLimit`

## Security Reminders
- Never send webcam frames to the server — all tracking is client-side.
- Validate all Socket.IO message payloads on the server.
- Room codes use `crypto.randomBytes` — no predictable sequences.
- Rate-limit room creation to prevent abuse.

## Testing
- Run dev server: `npm run dev`
- Production build: `npm run build`
- Start production server: `npm start`
- Test hand tracking: open `/` and verify webcam feed shows hand landmarks overlay.
