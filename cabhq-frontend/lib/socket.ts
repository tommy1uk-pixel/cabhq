'use client';

import { io, Socket } from 'socket.io-client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

const SOCKET_URL = `${API_URL}/realtime`;

let socket: Socket | null = null;

export function getSocket(token: string) {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,

      auth: {
        token,
      },
    });

    socket.on('connect', () => {
      console.log('Realtime connected', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Realtime disconnected', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Realtime connection error', err.message);
    });
  } else {
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}