# Virtual Ping Pong — Requirements Document

## Overview
A browser-based virtual ping pong game that uses a webcam to track the player's hand, turning it into a paddle in real-time. Supports **single-player vs AI** and **two-player over the Internet** via WebRTC/WebSocket.

---

## Functional Requirements

### FR-1: Hand Tracking Paddle
- Use MediaPipe Hands (via `@mediapipe/hands` or the CDN) to detect hand landmarks from the webcam feed.
- Map the palm center (landmark 9) to a 2D paddle position on the game canvas.
- Paddle follows hand movement with low latency (<50 ms perceived).
- Visual indicator when no hand is detected ("Show your hand!").

### FR-2: Game Modes
| Mode | Description |
|------|-------------|
| **Solo vs AI** | Player on the left, AI paddle on the right. Three difficulty levels: Easy, Medium, Hard. |
| **Online 1v1** | Two players connect via a shared room code. Each sees themselves on their side. |

### FR-3: Game Rules
- First to **11 points** wins (must win by 2 after 10-10, deuce rules).
- Ball speed increases slightly after every 3 rallies.
- Paddle angle affects ball trajectory (top-spin / back-spin illusion).
- 3-second countdown before serve.
- Ball resets to center after each point.

### FR-4: Networking (Online Mode)
- Room-based matchmaking: host creates a room → gets a 6-character code → guest joins.
- State synchronization via WebSocket (Socket.IO).
- Server-authoritative ball physics to prevent cheating.
- Latency compensation with client-side prediction.
- Graceful disconnect handling (opponent leaves → win by forfeit).

### FR-5: UI / UX
- Landing page with animated 3D ping pong table background (CSS/Canvas).
- Mode selection screen (Solo / Online).
- In-game HUD: score, rally count, speed indicator, FPS counter (toggle).
- Particle effects on ball hit, point scored, and match win.
- Screen shake on powerful hits.
- Responsive design (desktop browsers, min 960px width).

### FR-6: Audio
- Paddle hit sound (varies by impact force).
- Table bounce sound.
- Point scored fanfare.
- Background ambient music (toggleable).
- Crowd cheer on match point.

---

## Non-Functional Requirements

### NFR-1: Performance
- 60 FPS rendering on mid-range hardware.
- Hand tracking at ≥25 FPS.
- Network tick rate: 30 Hz.

### NFR-2: Browser Support
- Chrome 90+, Edge 90+, Firefox 100+ (with WebRTC).
- Requires HTTPS for camera access (or localhost).

### NFR-3: Security
- Room codes are cryptographically random.
- No PII collected; camera feed stays local (never sent to server).
- Input validation on all socket messages.
- Rate limiting on room creation.

### NFR-4: Accessibility
- High-contrast mode toggle.
- Keyboard fallback for paddle control (arrow keys / WASD).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + HTML5 Canvas |
| Hand Tracking | MediaPipe Hands (WASM/GPU) |
| Rendering | Canvas 2D with glow/particle effects |
| Audio | Web Audio API + Howler.js |
| Networking | Socket.IO (client + server) |
| Server | Node.js + Express |
| Build | Vite |

---

## Deliverables
1. `REQUIREMENTS.md` (this file)
2. `IMPLEMENTATION_PLAN.md`
3. `.github/copilot-instructions.md`
4. Full source code under `src/`
5. `package.json` with scripts: `dev`, `build`, `start`
