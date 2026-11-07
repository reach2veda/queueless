import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Resolves the Socket.IO server URL based on runtime environment:
 * 1. Explicit VITE_SOCKET_URL environment override
 * 2. Derived from VITE_API_BASE_URL (removing trailing /api)
 * 3. In production browser runtime, same-origin window.location.origin
 * 4. Safe local development fallback (http://localhost:5000)
 */
export const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && typeof apiBase === 'string' && apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    // In production builds, default to current origin rather than localhost
    if (import.meta.env.PROD) {
      return window.location.origin;
    }
  }

  return 'http://localhost:5000';
};

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('queueless_token');
    const socketUrl = resolveSocketUrl();

    socketInstance = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const refreshSocketAuth = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  return getSocket();
};

