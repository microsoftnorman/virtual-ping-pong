/** Express + Socket.IO server */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createRoom, joinRoom, leaveRoom, findRoom, getRoomCount } = require('./roomManager');
const { ServerGameLoop } = require('./gameLoop');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  },
  transports: ['websocket', 'polling'],
});

// Serve static files from dist (production build)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Active game loops
const gameLoops = new Map();

// === Socket.IO handlers ===
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || 'unknown';

  socket.on('create-room', () => {
    const result = createRoom(socket.id, ip);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    socket.join(result.roomCode);
    socket.emit('room-created', { roomCode: result.roomCode });
  });

  socket.on('join-room', (data) => {
    // Validate payload
    if (!data || typeof data.code !== 'string') {
      socket.emit('error', { message: 'Invalid request' });
      return;
    }

    const result = joinRoom(data.code, socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(result.roomCode);
    socket.emit('room-joined', { roomCode: result.roomCode });

    // Notify both players
    io.to(result.roomCode).emit('room-ready', { roomCode: result.roomCode });

    // Start server-side game loop
    const loop = new ServerGameLoop(io, result.roomCode, result.room.host, result.room.guest);
    gameLoops.set(result.roomCode, loop);
    loop.start();
  });

  socket.on('paddle-move', (data) => {
    if (!data || typeof data.y !== 'number') return;

    const found = findRoom(socket.id);
    if (!found) return;

    const loop = gameLoops.get(found.code);
    if (loop) {
      loop.updatePaddle(socket.id, data.y, data.vy);
    }
  });

  socket.on('disconnect', () => {
    const result = leaveRoom(socket.id);
    if (result) {
      // Stop game loop
      const loop = gameLoops.get(result.code);
      if (loop) {
        loop.stop();
        gameLoops.delete(result.code);
      }

      // Notify opponent
      if (result.opponent) {
        io.to(result.opponent).emit('opponent-disconnected');
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Virtual Ping Pong server running on port ${PORT}`);
});
