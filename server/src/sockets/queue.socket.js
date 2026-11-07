import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;

/**
 * Initialize Socket.IO Server with HTTP Server
 * Supports authenticated sessions and scoped rooms
 */
export const initSocketServer = (httpServer) => {
  const getAllowedOrigins = () => {
    const envUrl = process.env.CLIENT_URL || '';
    const parsedFromEnv = envUrl
      .split(',')
      .map((u) => u.trim().replace(/\/$/, ''))
      .filter(Boolean);

    return [
      ...parsedFromEnv,
      'https://queueless-rho-swart.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ];
  };

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        const allowed = getAllowedOrigins();
        if (allowed.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        socket.user = null;
        return next();
      }

      const secret = process.env.JWT_SECRET || 'queueless_jwt_secret_dev_key_2026';
      const decoded = jwt.verify(token, secret);
      socket.user = decoded; // { id, email, role }
      return next();
    } catch (err) {
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Admin / Staff room
    if (user && ['admin', 'provider', 'staff'].includes(user.role)) {
      socket.join('admin-queue');
    }

    // Customer private room: only receives their own private updates
    if (user && user.id) {
      socket.join(`user_${user.id}`);
    }

    socket.on('disconnect', () => {});
  });

  ioInstance = io;
  return io;
};

export const getIO = () => ioInstance;

/**
 * Broadcast queue state change to clients
 */
export const emitQueueUpdate = (data = {}) => {
  if (!ioInstance) return;

  // 1. Broadcast sanitized summary to public/general listeners (no private user data)
  ioInstance.emit('queue:updated', {
    currentlyServingToken: data.currentlyServingToken || null,
    totalWaiting: data.totalWaiting ?? null,
    timestamp: new Date().toISOString(),
  });

  // 2. Broadcast complete operational payload to admin room
  ioInstance.to('admin-queue').emit('admin:queue-changed', {
    ...data,
    timestamp: new Date().toISOString(),
  });

  // 3. Send private personalized update to the affected customer only
  if (data.customerId) {
    ioInstance.to(`user_${data.customerId}`).emit('user:ticket-updated', {
      tokenNumber: data.tokenNumber,
      status: data.status,
      positionAhead: data.positionAhead,
      estimatedWaitMinutes: data.estimatedWaitMinutes,
      currentlyServingToken: data.currentlyServingToken,
      timestamp: new Date().toISOString(),
    });
  }
};

