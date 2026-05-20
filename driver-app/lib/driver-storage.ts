import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Driver, Booking, DriverMapState } from './driver-types';

export const STORAGE_KEYS = {
  username: 'cabhq_driver_username',
  pin: 'cabhq_driver_pin',
  token: 'cabhq_driver_token',
  mapState: 'cabhq_driver_map_state',
};

export async function saveUsername(username: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.username, username);
}

export async function savePin(pin: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.pin, pin);
}

export async function saveToken(token: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.token, token);
}

export async function loadStoredAuth() {
  const [username, pin, token] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.username),
    AsyncStorage.getItem(STORAGE_KEYS.pin),
    AsyncStorage.getItem(STORAGE_KEYS.token),
  ]);

  return {
    username: username || '',
    pin: pin || '',
    token: token || '',
  };
}

export async function clearStoredAuth() {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.username),
    AsyncStorage.removeItem(STORAGE_KEYS.pin),
    AsyncStorage.removeItem(STORAGE_KEYS.token),
  ]);
}

export function normalizeJobStatus(status?: string | null) {
  return (status || 'UNKNOWN').toUpperCase();
}

export function getCurrentMapJob(activeJobs: Booking[]) {
  const priority = [
    'EN_ROUTE',
    'ARRIVED',
    'ON_JOB',
    'ACCEPTED',
    'OFFERED',
  ];

  return (
    [...activeJobs].sort((a, b) => {
      const aIndex = priority.indexOf(normalizeJobStatus(a.status));
      const bIndex = priority.indexOf(normalizeJobStatus(b.status));

      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    })[0] ?? null
  );
}

export async function persistDriverMapState(
  driver: Driver | null,
  activeOffer: Booking | null,
  activeJobs: Booking[],
) {
  const activeJob = getCurrentMapJob(activeJobs);

  const mapState: DriverMapState = {
    driver,
    activeJob,
    activeOffer,
    activeJobs,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    STORAGE_KEYS.mapState,
    JSON.stringify(mapState),
  );
}