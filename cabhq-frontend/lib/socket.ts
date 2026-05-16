'use client';

import { io, Socket } from 'socket.io-client';

function cleanUrl(value?: string | null) {
  return (value || '').trim().replace(/\/+$/, '');
}

function getApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_URL;

  if (envBase?.trim()) {
    return cleanUrl(envBase);
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.')
    ) {
      return 'http://localhost:3002';
    }
  }

  return 'https://cabhq-production.up.railway.app';
}

const API_URL = getApiBase();
const SOCKET_URL = `${API_URL}/realtime`;

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string) {
  if (!token?.trim()) {
    throw new Error('Socket token missing');
  }

  if (!socket) {
    currentToken = token;

    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,

      auth: {
        token,
      },
    });

    socket.on('connect', () => {
      console.log('Realtime connected', {
        id: socket?.id,
        url: SOCKET_URL,
      });

      socket?.emit('ping');
    });

    socket.on('disconnect', (reason) => {
      console.log('Realtime disconnected', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Realtime connection error', err.message);
    });

    socket.on('system:connected', (payload) => {
      console.log('Realtime authenticated', payload);
    });

    socket.on('pong', (payload) => {
      console.log('Realtime pong', payload);
    });

    socket.on('system:error', (payload) => {
      console.error('Realtime system error', payload);
    });

    socket.on('driver:location:saved', (payload) => {
      console.log('Driver location saved', payload);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('Realtime reconnected', attempt);

      if (currentToken && socket) {
        socket.auth = {
          token: currentToken,
        };
      }
    });
  } else {
    currentToken = token;

    socket.auth = {
      token,
    };

    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function emitDriverLocation(payload: {
  driverId?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  heading?: number | null;
  speed?: number | null;
}) {
  if (!socket) {
    console.warn('Socket not connected for driver location emit');
    return;
  }

  socket.emit('driver:location', payload);
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}