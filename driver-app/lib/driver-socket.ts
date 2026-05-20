import { io, Socket } from 'socket.io-client';

export type DriverSocketHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onReloadDashboard?: () => void;
  onOfferCreated?: () => void;
};

export function createDriverSocket({
  backendUrl,
  token,
  handlers,
}: {
  backendUrl: string;
  token: string;
  handlers: DriverSocketHandlers;
}) {
  const socket = io(`${backendUrl}/realtime`, {
    transports: ['websocket'],
    auth: {
      token,
    },
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    handlers.onConnected?.();
  });

  socket.on('disconnect', () => {
    handlers.onDisconnected?.();
  });

  socket.on('connect_error', (error) => {
    handlers.onError?.(error.message);
  });

  const reloadEvents = [
    'driver:location:saved',
    'booking:created',
    'booking:updated',
    'booking:assigned',
    'booking:status_changed',
    'driver:updated',
  ];

  reloadEvents.forEach((event) => {
    socket.on(event, () => {
      handlers.onReloadDashboard?.();
    });
  });

  socket.on('booking:offer_created', () => {
    handlers.onOfferCreated?.();
  });

  return socket;
}

export function destroyDriverSocket(socket: Socket | null) {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
}

export function emitDriverLocation(
  socket: Socket | null,
  payload: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  },
) {
  socket?.emit('driver:location', {
    latitude: payload.latitude,
    longitude: payload.longitude,
    heading: payload.heading ?? null,
    speed: payload.speed ?? null,
  });
}