/** Socket.IO client wrapper for online multiplayer */

import { io } from 'socket.io-client';

class NetworkClient {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.side = null; // 'left' or 'right'
    this.connected = false;
    this.handlers = {};
  }

  /** Connect to the server */
  connect() {
    if (this.socket) return;

    // In dev (Vite proxy) or production (same origin)
    this.socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this._emit('connected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this._emit('disconnected');
    });

    this.socket.on('room-created', (data) => {
      this.roomCode = data.roomCode;
      this.side = 'left';
      this._emit('room-created', data);
    });

    this.socket.on('room-joined', (data) => {
      this.roomCode = data.roomCode;
      this.side = 'right';
      this._emit('room-joined', data);
    });

    this.socket.on('room-ready', (data) => {
      this._emit('room-ready', data);
    });

    this.socket.on('opponent-paddle', (data) => {
      this._emit('opponent-paddle', data);
    });

    this.socket.on('ball-sync', (data) => {
      this._emit('ball-sync', data);
    });

    this.socket.on('score-update', (data) => {
      this._emit('score-update', data);
    });

    this.socket.on('game-over', (data) => {
      this._emit('game-over', data);
    });

    this.socket.on('opponent-disconnected', () => {
      this._emit('opponent-disconnected');
    });

    this.socket.on('error', (data) => {
      this._emit('error', data);
    });
  }

  /** Create a new room */
  createRoom() {
    if (!this.socket) this.connect();
    this.socket.emit('create-room');
  }

  /** Join an existing room */
  joinRoom(code) {
    if (!this.socket) this.connect();
    // Sanitize: only alphanumeric, max 6 chars
    const sanitized = String(code).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    this.socket.emit('join-room', { code: sanitized });
  }

  /** Send paddle position */
  sendPaddlePosition(y, vy) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('paddle-move', { y, vy });
  }

  /** Disconnect and cleanup */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomCode = null;
    this.side = null;
    this.connected = false;
  }

  /** Register event handler */
  on(event, callback) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(callback);
  }

  /** Remove event handler */
  off(event, callback) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter((cb) => cb !== callback);
  }

  _emit(event, data) {
    if (!this.handlers[event]) return;
    for (const cb of this.handlers[event]) {
      cb(data);
    }
  }
}

export const network = new NetworkClient();
