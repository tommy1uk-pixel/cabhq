import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK_NAME = 'cabhq-driver-location';

const API_BASE = 'https://cabhq-production.up.railway.app';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  try {
    if (error) {
      console.log('Background GPS task error', error);
      return;
    }

    const locations = (
      data as {
        locations?: Location.LocationObject[];
      }
    )?.locations;

    if (!locations?.length) return;

    const latest = locations[0];

    const token = await AsyncStorage.getItem('cabhq_driver_token');

    if (!token) {
      console.log('No driver token for background GPS upload');
      return;
    }

    const response = await fetch(`${API_BASE}/driver-app/me/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        heading: latest.coords.heading ?? null,
        speed: latest.coords.speed ?? null,
      }),
    });

    const text = await response.text();

    console.log('Background GPS response', response.status, text);
  } catch (err) {
    console.log('Background GPS fatal error', err);
  }
});