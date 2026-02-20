# Virtual Ping Pong — Implementation Plan

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│  │ Hand    │→│ Game     │→│ Canvas │  │ Socket.IO  │  │
│  │ Tracker │  │ Engine   │  │ Render │  │ Client     │  │
│  └─────────┘  └──────────┘  └────────┘  └─────┬──────┘  │
│       ↑                                       │          │
│    Webcam                                     │          │
└───────────────────────────────────────────────┼──────────┘
                                                │ WebSocket
┌───────────────────────────────────────────────┼──────────┐
│                    Node.js Server             │          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┴───────┐  │
│  │ Express    │  │ Room Manager│  │ Socket.IO Server │  │
│  │ (static)   │  │             │  │                  │  │
│  └────────────┘  └─────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## File Structure

```
virtual-ping-pong/
├── .github/
│   └── copilot-instructions.md
├── server/
│   ├── index.js              # Express + Socket.IO server
│   ├── roomManager.js        # Room creation, joining, state
│   └── gameLoop.js           # Server-side ball physics (authoritative)
├── src/
│   ├── index.html            # Entry point
│   ├── main.js               # App bootstrap
│   ├── styles/
│   │   └── main.css          # All styles
│   ├── game/
│   │   ├── engine.js         # Core game loop, state management
│   │   ├── physics.js        # Ball & paddle collision, movement
│   │   ├── renderer.js       # Canvas 2D drawing + effects
│   │   ├── particles.js      # Particle system for hit/score effects
│   │   └── ai.js             # AI opponent logic
│   ├── tracking/
│   │   └── handTracker.js    # MediaPipe Hands integration
│   ├── network/
│   │   └── client.js         # Socket.IO client wrapper
│   ├── audio/
│   │   └── audioManager.js   # Sound loading & playback
│   └── ui/
│       └── screens.js        # Menu, HUD, overlays
├── public/
│   └── sounds/               # Audio assets (generated via Web Audio)
├── package.json
├── vite.config.js
├── REQUIREMENTS.md
└── IMPLEMENTATION_PLAN.md
```

---

## Phase 1: Project Setup
1. Initialize npm project with Vite
2. Install dependencies: `socket.io`, `socket.io-client`, `express`, `mediapipe`
3. Create Vite config with dev server proxy to Express backend
4. Set up `.github/copilot-instructions.md`

## Phase 2: Hand Tracking (tracking/handTracker.js)
1. Initialize MediaPipe Hands with GPU acceleration
2. Set up webcam capture via `getUserMedia`
3. Extract palm center from landmarks (landmark 9 = middle finger MCP)
4. Normalize coordinates to game canvas space
5. Smooth position with exponential moving average (α = 0.3)
6. Expose `{ x, y, detected }` state

## Phase 3: Game Engine (game/engine.js + physics.js)
1. Game state object: ball, paddles, scores, rally, phase
2. `requestAnimationFrame` loop with delta-time
3. Ball physics: position, velocity, spin
4. Wall collision (top/bottom bounce)
5. Paddle collision with angle reflection + spin transfer
6. Scoring detection (ball passes left/right edge)
7. Speed progression after every 3 rallies

## Phase 4: Rendering (game/renderer.js + particles.js)
1. Draw table: 3D-perspective green surface with white lines, net
2. Draw ball: circle with motion blur trail (5 ghost images)
3. Draw paddles: rounded rectangles with glow effect
4. Particle system: burst on hit (sparks), cascade on score (confetti)
5. Screen shake: translate canvas on powerful hits
6. Score display with large animated numbers
7. Neon glow aesthetic with dark background

## Phase 5: UI Screens (ui/screens.js)
1. **Landing screen**: Title, animated background, Play button
2. **Mode select**: Solo vs AI / Online 1v1
3. **AI difficulty**: Easy / Medium / Hard
4. **Online lobby**: Create room (show code) / Join room (enter code)
5. **In-game HUD**: Scores, rally counter, connection status
6. **Game over**: Winner announcement, play again, back to menu
7. **Settings**: Audio toggle, FPS counter, high-contrast, keyboard mode

## Phase 6: AI Opponent (game/ai.js)
1. Track ball position and predict landing Y
2. Move AI paddle toward predicted Y with speed cap
3. Difficulty levels:
   - Easy: slow reaction, ±40px random error
   - Medium: moderate speed, ±20px error
   - Hard: fast, ±5px error, anticipates spin
4. Add humanlike delay (100-300ms reaction time)

## Phase 7: Networking (server/ + network/client.js)
1. Express serves built static files
2. Socket.IO handles:
   - `create-room` → generate 6-char code, join socket room
   - `join-room` → validate code, join, emit `room-ready`
   - `paddle-move` → relay paddle position to opponent
   - `ball-sync` → server sends authoritative ball state at 30Hz
   - `score-update` → server validates and broadcasts
   - `disconnect` → notify opponent, handle forfeit
3. Server-side game loop runs ball physics for online matches
4. Client-side prediction: render ball locally, correct on server update

## Phase 8: Audio (audio/audioManager.js)
1. Synthesize sounds programmatically (Web Audio API):
   - Paddle hit: short burst, pitch varies with velocity
   - Table bounce: softer thud
   - Score: ascending arpeggio
   - Win: triumph fanfare
2. Background ambient: low-pass filtered noise + gentle beat
3. Volume controls, mute toggle

## Phase 9: Polish & Integration
1. Add countdown timer (3, 2, 1, GO!)
2. Deuce logic (must win by 2 after 10-10)
3. Camera permission error handling with helpful messages
4. Keyboard fallback mode (arrow keys)
5. Cross-browser testing
6. Performance optimization (offscreen canvas for particles)

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Canvas 2D over WebGL | Simpler, sufficient for 2D game, better browser compat |
| MediaPipe over TensorFlow.js | Faster hand tracking, WASM+GPU backend, smaller bundle |
| Server-authoritative ball | Prevents cheating in online mode |
| Vite over Webpack | Faster dev server, native ES modules, simpler config |
| Synthesized audio | No asset files needed, instant loading, customizable |
| Socket.IO over raw WS | Auto-reconnect, rooms, fallback transport |

---

## Success Criteria
- [ ] Hand tracks smoothly at ≥25 FPS
- [ ] Ball physics feel natural and responsive
- [ ] AI provides challenge at all difficulty levels
- [ ] Online mode works with <100ms perceived latency
- [ ] Visual effects create "wow factor"
- [ ] Game runs at 60 FPS on mid-range hardware
