'use client';

import { io, Socket } from 'socket.io-client';

type DriverLocationPayload = {
  driverId?: string;
  bookingId?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  heading?: number | null;
  speed?: number | null;
  etaMinutes?: number | null;
  distanceMiles?: number | null;
};

type TrackingJoinPayload = {
  bookingId: string;
};

type CompanyJoinPayload = {
  companyId: string;
};

type SocketStatus = {
  connected: boolean;
  id: string | null;
  url: string;
  tokenSet: boolean;
};

function cleanUrl(value?: string | null) {
  return (value || '').trim().replace(/\/+$/, '');
}

function getApiBase() {
  const envSocket = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (envSocket?.trim()) {
    return cleanUrl(envSocket);
  }

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
let currentCompanyId: string | null = null;
let joinedTrackingRooms = new Set<string>();

function bindCoreSocketLogs(nextSocket: Socket) {
  nextSocket.on('connect', () => {
    console.log('Realtime connected', {
      id: nextSocket.id,
      url: SOCKET_URL,
    });

    nextSocket.emit('ping');

    if (currentCompanyId) {
      nextSocket.emit('company:join', {
        companyId: currentCompanyId,
      });
    }

    for (const bookingId of joinedTrackingRooms) {
      nextSocket.emit('tracking:join', {
        bookingId,
      });
    }
  });

  nextSocket.on('disconnect', (reason) => {
    console.log('Realtime disconnected', reason);
  });

  nextSocket.on('connect_error', (err) => {
    console.error('Realtime connection error', err.message);
  });

  nextSocket.on('system:connected', (payload) => {
    console.log('Realtime authenticated', payload);
  });

  nextSocket.on('pong', (payload) => {
    console.log('Realtime pong', payload);
  });

  nextSocket.on('system:error', (payload) => {
    console.error('Realtime system error', payload);
  });

  nextSocket.on('driver:location:saved', (payload) => {
    console.log('Driver location saved', payload);
  });

  nextSocket.io.on('reconnect', (attempt) => {
    console.log('Realtime reconnected', attempt);

    if (currentToken) {
      nextSocket.auth = {
        token: currentToken,
      };
    }

    if (currentCompanyId) {
      nextSocket.emit('company:join', {
        companyId: currentCompanyId,
      });
    }

    for (const bookingId of joinedTrackingRooms) {
      nextSocket.emit('tracking:join', {
        bookingId,
      });
    }
  });
}

export function getSocket(token: string) {
  if (!token?.trim()) {
    throw new Error('Socket token missing');
  }

  currentToken = token;

  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token,
      },
    });

    bindCoreSocketLogs(socket);
  } else {
    socket.auth = {
      token,
    };

    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function getAnonymousSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    bindCoreSocketLogs(socket);
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function joinCompanyRoom(payload: CompanyJoinPayload) {
  currentCompanyId = payload.companyId;

  if (!socket) {
    console.warn('Socket not connected for company room join');
    return;
  }

  socket.emit('company:join', payload);
}

export function joinTrackingRoom(payload: TrackingJoinPayload) {
  if (!payload.bookingId?.trim()) return;

  joinedTrackingRooms.add(payload.bookingId);

  if (!socket) {
    console.warn('Socket not connected for tracking room join');
    return;
  }

  socket.emit('tracking:join', payload);
}

export function leaveTrackingRoom(payload: TrackingJoinPayload) {
  if (!payload.bookingId?.trim()) return;

  joinedTrackingRooms.delete(payload.bookingId);

  if (!socket) {
    return;
  }

  socket.emit('tracking:leave', payload);
}

export function markTrackingViewed(payload: TrackingJoinPayload) {
  if (!payload.bookingId?.trim()) return;

  if (!socket) {
    console.warn('Socket not connected for tracking viewed event');
    return;
  }

  socket.emit('tracking:viewed', payload);
}

export function emitDriverLocation(payload: DriverLocationPayload) {
  if (!socket) {
    console.warn('Socket not connected for driver location emit');
    return;
  }

  socket.emit('driver:location', payload);
}

export function emitDriverLocationUpdate(payload: DriverLocationPayload) {
  if (!socket) {
    console.warn('Socket not connected for driver location update emit');
    return;
  }

  socket.emit('driver:location:update', payload);
}

export function onRealtimeEvent<TPayload = unknown>(
  event: string,
  handler: (payload: TPayload) => void,
) {
  if (!socket) {
    console.warn(`Socket not connected for listener: ${event}`);
    return () => undefined;
  }

  socket.on(event, handler as (...args: unknown[]) => void);

  return () => {
    socket?.off(event, handler as (...args: unknown[]) => void);
  };
}

export function getSocketStatus(): SocketStatus {
  return {
    connected: Boolean(socket?.connected),
    id: socket?.id ?? null,
    url: SOCKET_URL,
    tokenSet: Boolean(currentToken),
  };
}

export function reconnectSocket() {
  if (!socket) return;

  if (currentToken) {
    socket.auth = {
      token: currentToken,
    };
  }

  socket.connect();
}

export function closeSocket() {
  if (socket) {
    for (const bookingId of joinedTrackingRooms) {
      socket.emit('tracking:leave', {
        bookingId,
      });
    }

    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = null;
  currentCompanyId = null;
  joinedTrackingRooms = new Set<string>();
}

export { SOCKET_URL };
