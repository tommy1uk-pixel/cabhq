import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocationPayload } from './driver-types';

const GPS_QUEUE_KEY = 'cabhq_driver_gps_queue';
const MAX_QUEUE_SIZE = 100;

export type QueuedGpsPoint = LocationPayload & {
  queuedAt: string;
};

export async function loadGpsQueue(): Promise<QueuedGpsPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(GPS_QUEUE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveGpsQueue(points: QueuedGpsPoint[]) {
  const trimmed = points.slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(trimmed));
}

export async function queueGpsPoint(point: LocationPayload) {
  const existing = await loadGpsQueue();

  await saveGpsQueue([
    ...existing,
    {
      ...point,
      queuedAt: new Date().toISOString(),
    },
  ]);
}

export async function clearGpsQueue() {
  await AsyncStorage.removeItem(GPS_QUEUE_KEY);
}

export async function flushGpsQueue(
  send: (point: QueuedGpsPoint) => Promise<void>,
) {
  const points = await loadGpsQueue();

  if (points.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      remaining: 0,
    };
  }

  const remaining: QueuedGpsPoint[] = [];
  let sent = 0;

  for (const point of points) {
    try {
      await send(point);
      sent += 1;
    } catch {
      remaining.push(point);
    }
  }

  await saveGpsQueue(remaining);

  return {
    attempted: points.length,
    sent,
    remaining: remaining.length,
  };
}