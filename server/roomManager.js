/** Room Manager — handles room creation, joining, and state */

const crypto = require('crypto');

/** @type {Map<string, Room>} */
const rooms = new Map();

// Rate limiting: max 5 rooms per IP per minute
const rateLimiter = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000;

class Room {
  constructor(code, hostSocketId) {
    this.code = code;
    this.host = hostSocketId;
    this.guest = null;
    this.ready = false;
    this.createdAt = Date.now();
  }

  isFull() {
    return this.host && this.guest;
  }

  getOpponent(socketId) {
    return socketId === this.host ? this.guest : this.host;
  }

  getSide(socketId) {
    return socketId === this.host ? 'left' : 'right';
  }
}

/** Generate a cryptographically random 6-char room code */
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  // Ensure uniqueness
  if (rooms.has(code)) return generateCode();
  return code;
};

/** Check rate limit for IP */
const checkRateLimit = (ip) => {
  const now = Date.now();
  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, []);
  }
  const timestamps = rateLimiter.get(ip).filter((t) => now - t < RATE_WINDOW);
  rateLimiter.set(ip, timestamps);

  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  return true;
};

/** Create a new room */
const createRoom = (socketId, ip) => {
  if (!checkRateLimit(ip)) {
    return { error: 'Too many rooms created. Please wait.' };
  }

  const code = generateCode();
  const room = new Room(code, socketId);
  rooms.set(code, room);

  // Auto-cleanup after 10 minutes if not started
  setTimeout(() => {
    if (rooms.has(code) && !rooms.get(code).ready) {
      rooms.delete(code);
    }
  }, 600000);

  return { roomCode: code };
};

/** Join an existing room */
const joinRoom = (code, socketId) => {
  // Validate code format
  if (typeof code !== 'string' || code.length < 4 || code.length > 6) {
    return { error: 'Invalid room code' };
  }

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const room = rooms.get(sanitized);

  if (!room) {
    return { error: 'Room not found' };
  }

  if (room.isFull()) {
    return { error: 'Room is full' };
  }

  room.guest = socketId;
  room.ready = true;

  return { roomCode: sanitized, room };
};

/** Remove a player from their room */
const leaveRoom = (socketId) => {
  for (const [code, room] of rooms) {
    if (room.host === socketId || room.guest === socketId) {
      const opponent = room.getOpponent(socketId);
      rooms.delete(code);
      return { code, opponent };
    }
  }
  return null;
};

/** Find room by socket ID */
const findRoom = (socketId) => {
  for (const [code, room] of rooms) {
    if (room.host === socketId || room.guest === socketId) {
      return { code, room };
    }
  }
  return null;
};

/** Get room count (for monitoring) */
const getRoomCount = () => rooms.size;

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  findRoom,
  getRoomCount,
};
