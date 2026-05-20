import * as Location from 'expo-location';

import { LOCATION_TASK_NAME } from './background-location';
import type { LocationPayload } from './driver-types';

export async function getCurrentDriverGps(): Promise<LocationPayload> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    heading: position.coords.heading ?? null,
    speed: position.coords.speed ?? null,
  };
}

export async function requestDriverLocationPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== 'granted') {
    throw new Error('Foreground location permission denied');
  }

  const background = await Location.requestBackgroundPermissionsAsync();

  return {
    foregroundGranted: foreground.status === 'granted',
    backgroundGranted: background.status === 'granted',
  };
}

export async function startForegroundDriverGps(
  onLocation: (coords: LocationPayload) => void,
) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 5,
    },
    (position) => {
      onLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading ?? null,
        speed: position.coords.speed ?? null,
      });
    },
  );
}

export async function startBackgroundDriverGps() {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME,
  );

  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000,
    distanceInterval: 5,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'CabHQ Driver Active',
      notificationBody: 'Location tracking enabled for dispatch',
    },
  });
}

export async function stopBackgroundDriverGps() {
  const started = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME,
  );

  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function stopDriverGpsTracking(
  watcher?: Location.LocationSubscription | null,
) {
  watcher?.remove();
  await stopBackgroundDriverGps();
}