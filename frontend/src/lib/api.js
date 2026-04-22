import axios from 'axios';
import { io } from 'socket.io-client';
import { useStore } from '../store';

export const api = axios.create({ baseURL: '/api' });

// Attach JWT to every request
api.interceptors.request.use(cfg => {
  const token = useStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) useStore.getState().logout();
    return Promise.reject(err);
  }
);

// Socket.io singleton
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      auth: { token: useStore.getState().token },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
