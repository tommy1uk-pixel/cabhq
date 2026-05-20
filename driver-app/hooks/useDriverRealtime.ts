import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

import {
  createDriverSocket,
  destroyDriverSocket,
  emitDriverLocation,
} from '@/lib/driver-socket';

export function useDriverRealtime({
  connected,
  backendUrl,
  token,
  onConnected,
  onDisconnected,
  onError,
  onReloadDashboard,
  onOfferCreated,
}: {
  connected: boolean;
  backendUrl: string;
  token: string;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
  onReloadDashboard: () => void;
  onOfferCreated: () => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!connected || !token) return;

    const socket = createDriverSocket({
      backendUrl,
      token,
      handlers: {
        onConnected,
        onDisconnected,
        onError,
        onReloadDashboard,
        onOfferCreated,
      },
    });

    socketRef.current = socket;

    return () => {
      destroyDriverSocket(socket);
      socketRef.current = null;
    };
  }, [
    connected,
    backendUrl,
    token,
    onConnected,
    onDisconnected,
    onError,
    onReloadDashboard,
    onOfferCreated,
  ]);

  function sendDriverLocation(payload: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  }) {
    emitDriverLocation(socketRef.current, payload);
  }

  function disconnectRealtime() {
    destroyDriverSocket(socketRef.current);
    socketRef.current = null;
  }

  return {
    socketRef,
    sendDriverLocation,
    disconnectRealtime,
  };
}
