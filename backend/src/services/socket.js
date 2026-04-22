import jwt from 'jsonwebtoken';

// Map socket.id -> userId for private room routing
const socketUserMap = new Map();

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId   = payload.id;
        socket.username = payload.username;
      } catch {}
    }
    next();
  });

  io.on('connection', (socket) => {
    // Put authenticated users in their private room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      socketUserMap.set(socket.id, socket.userId);
      console.log(`[WS] ${socket.username} connected`);
    }

    socket.on('disconnect', () => {
      socketUserMap.delete(socket.id);
    });
  });

  // Broadcast live user count every 15s
  setInterval(() => {
    io.emit('online:count', { count: io.engine.clientsCount });
  }, 15_000);
}
