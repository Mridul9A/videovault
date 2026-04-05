import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Use WebSocket transport first, fall back to polling.
      // This prevents the "message channel closed before a response was received"
      // error caused by Chrome extensions intercepting long-polling XHR requests.
      transports: ['websocket', 'polling'],
    });

    // Log connection errors in dev only
    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.warn('[Socket] Connection error:', err.message);
      }
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const subscribeToVideo = (videoId) => {
  getSocket().emit('subscribe:video', videoId);
};

export const unsubscribeFromVideo = (videoId) => {
  getSocket().emit('unsubscribe:video', videoId);
};
