import '../../lib/background-location';

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ActivityIndicator,
  LogBox,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { DriverDashboard } from '@/components/driver/DriverDashboard';
import { LoginScreen } from '@/components/driver/LoginScreen';

import { LOCATION_TASK_NAME } from '../../lib/background-location';
import {
  DEFAULT_API_BASE_URL,
  apiFetch,
  bootstrapDriver,
  loginDriver,
  updateDriverLocation,
} from '../../lib/driver-api';
import {
  clearStoredAuth,
  loadStoredAuth,
  normalizeJobStatus,
  persistDriverMapState,
  savePin,
  saveToken,
  saveUsername,
} from '../../lib/driver-storage';
import type { Booking, Driver, LocationPayload } from '../../lib/driver-types';

LogBox.ignoreLogs(['Unable to activate keep awake']);

const OFFER_TIMEOUT_SECONDS = 90;

function getOfferSecondsRemaining(booking: Booking | null, now = Date.now()) {
  if (!booking || normalizeJobStatus(booking.status) !== 'OFFERED') return 0;

  if (booking.offer?.expiresAt) {
    const expiresAt = new Date(booking.offer.expiresAt).getTime();

    if (!Number.isNaN(expiresAt)) {
      return Math.max(0, Math.ceil((expiresAt - now) / 1000));
    }
  }

  if (booking.offer?.secondsRemaining != null) {
    return Math.max(0, booking.offer.secondsRemaining);
  }

  const offeredEvent = [...(booking.events ?? [])]
    .reverse()
    .find((event) => event.message?.startsWith('AUTO DISPATCH OFFERED'));

  const offeredAt = offeredEvent?.createdAt
    ? new Date(offeredEvent.createdAt).getTime()
    : null;

  if (!offeredAt || Number.isNaN(offeredAt)) return OFFER_TIMEOUT_SECONDS;

  return Math.max(
    0,
    Math.ceil((offeredAt + OFFER_TIMEOUT_SECONDS * 1000 - now) / 1000),
  );
}

export default function DriverHomeTab() {
  const backendUrl = DEFAULT_API_BASE_URL;

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');

  const [hydrating, setHydrating] = useState(true);
  const [connected, setConnected] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeOffer, setActiveOffer] = useState<Booking | null>(null);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const lastOfferIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);

  const trimmedBackendUrl = backendUrl.trim().replace(/\/+$/, '');
  const offerSecondsRemaining = getOfferSecondsRemaining(activeOffer, now);

  useEffect(() => {
    if (!driver) return;

    void persistDriverMapState(driver, activeOffer, activeJobs).catch((error) =>
      console.log('Failed to save map state', error),
    );
  }, [driver, activeOffer, activeJobs]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.log('Failed to configure audio', error);
      }
    })();
  }, []);

  const playOfferAlert = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/offer-alert.mp3'),
        { shouldPlay: true },
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          void sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Failed to play offer alert', error);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await loadStoredAuth();

        if (stored.username) setUsername(stored.username);
        if (stored.pin) setPin(stored.pin);
        if (stored.token) setToken(stored.token);
      } catch (error) {
        console.log('Failed to load saved login values', error);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrating) void saveUsername(username);
  }, [username, hydrating]);

  useEffect(() => {
    if (!hydrating) void savePin(pin);
  }, [pin, hydrating]);

  useEffect(() => {
    if (!hydrating) void saveToken(token);
  }, [token, hydrating]);

  const loadDashboard = useCallback(
    async (tokenOverride?: string) => {
      const currentToken = (tokenOverride ?? token).trim();

      if (!trimmedBackendUrl || !currentToken) {
        throw new Error('Driver login is required');
      }

      const bootstrap = await bootstrapDriver(trimmedBackendUrl, currentToken);

      if (!bootstrap?.driver?.id) {
        throw new Error('Bootstrap response did not contain a driver profile');
      }

      const nextOffer = bootstrap.offer ?? null;
      const nextActiveJobs = Array.isArray(bootstrap.activeJobs) ? bootstrap.activeJobs : [];

      setDriver({
        ...bootstrap.driver,
        shift: bootstrap.currentShift?.shift ?? bootstrap.driver.shift ?? null,
      });

      setActiveOffer(nextOffer);
      setActiveJobs(nextActiveJobs);

      await persistDriverMapState(
        bootstrap.map?.driver ?? bootstrap.driver,
        bootstrap.map?.activeOffer ?? nextOffer,
        bootstrap.map?.activeJobs ?? nextActiveJobs,
      );

      if (Array.isArray(bootstrap.completedJobs)) {
        setCompletedJobs(bootstrap.completedJobs);
      } else {
        try {
          const history = await apiFetch<{ jobs?: Booking[] } | Booking[]>(
            trimmedBackendUrl,
            '/driver-app/me/jobs/history',
            currentToken,
          );

          const jobs = Array.isArray(history)
            ? history
            : Array.isArray(history?.jobs)
              ? history.jobs
              : [];

          setCompletedJobs(jobs.filter((job) => normalizeJobStatus(job.status) === 'COMPLETED'));
        } catch {
          setCompletedJobs([]);
        }
      }

      if (nextOffer?.id) {
        if (lastOfferIdRef.current !== nextOffer.id) {
          void playOfferAlert();
        }

        lastOfferIdRef.current = nextOffer.id;
      } else {
        lastOfferIdRef.current = null;
      }
    },
    [trimmedBackendUrl, token, playOfferAlert],
  );

  const sendLocationToBackend = useCallback(
    async (coords: LocationPayload, tokenOverride?: string) => {
      const currentToken = (tokenOverride ?? token).trim();

      if (!currentToken) {
        throw new Error('No driver token available for GPS');
      }

      const result = await updateDriverLocation(trimmedBackendUrl, currentToken, coords);

      socketRef.current?.emit('driver:location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
      });

      if (result?.bootstrap?.driver) {
        setDriver({
          ...result.bootstrap.driver,
          shift: result.bootstrap.currentShift?.shift ?? result.bootstrap.driver.shift ?? null,
        });
      } else if (result?.driver) {
        setDriver((current) => (current ? { ...current, ...result.driver } : result.driver ?? null));
      }

      setLocationEnabled(true);
      setLocationStatus(
        result?.autoArrived?.changed
          ? 'GPS sent · job auto-marked ARRIVED'
          : `GPS sent ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
      );
    },
    [trimmedBackendUrl, token],
  );

  const sendCurrentGps = useCallback(
    async (tokenOverride?: string) => {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      await sendLocationToBackend(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
        },
        tokenOverride,
      );
    },
    [sendLocationToBackend],
  );

  const stopLocationTracking = useCallback(async () => {
    try {
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;

      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

      if (started) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.log('Failed to stop GPS', error);
    }
  }, []);

  const startLocationTracking = useCallback(
    async (tokenOverride?: string) => {
      const currentToken = (tokenOverride ?? token).trim();

      if (!currentToken) {
        throw new Error('No driver token available for tracking');
      }

      const foreground = await Location.requestForegroundPermissionsAsync();

      if (foreground.status !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      const background = await Location.requestBackgroundPermissionsAsync();

      if (background.status !== 'granted') {
        setLocationStatus('Foreground GPS active. Background permission denied.');
      }

      locationWatcherRef.current?.remove();

      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (position) => {
          void sendLocationToBackend(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
            },
            currentToken,
          ).catch((error) => {
            console.log('Foreground GPS upload failed', error);
            setLocationStatus(error instanceof Error ? error.message : 'GPS upload failed');
          });
        },
      );

      if (background.status === 'granted') {
        const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

        if (!alreadyStarted) {
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
      }

      setLocationEnabled(true);
      setLocationStatus('Live GPS tracking active');

      await sendCurrentGps(currentToken);
    },
    [token, sendLocationToBackend, sendCurrentGps],
  );

  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      void loadDashboard().catch((error) => console.log(error));
    }, 10000);

    return () => clearInterval(interval);
  }, [connected, loadDashboard]);

  useEffect(() => {
    if (!connected || !token) return;

    void startLocationTracking(token).catch((error) => {
      console.log('Location startup failed', error);
      setLocationEnabled(false);
      setLocationStatus(error instanceof Error ? error.message : 'Location tracking failed');
    });

    return () => {
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
    };
  }, [connected, token, startLocationTracking]);

  useEffect(() => {
    if (!connected || !token) return;

    const socket = io(`${trimmedBackendUrl}/realtime`, {
      transports: ['websocket'],
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setLocationStatus('Realtime connected');
      void loadDashboard().catch((error) => console.log(error));
    });

    socket.on('disconnect', () => {
      setLocationStatus('Realtime disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('Realtime socket error', error.message);
      setLocationStatus(`Realtime error: ${error.message}`);
    });

    [
      'driver:location:saved',
      'booking:created',
      'booking:updated',
      'booking:assigned',
      'booking:status_changed',
      'driver:updated',
    ].forEach((event) => {
      socket.on(event, () => {
        void loadDashboard().catch((error) => console.log(error));
      });
    });

    socket.on('booking:offer_created', () => {
      void playOfferAlert();
      void loadDashboard().catch((error) => console.log(error));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [connected, token, trimmedBackendUrl, loadDashboard, playOfferAlert]);

  async function connectToDashboard() {
    try {
      setLoading(true);
      setConnectError('');

      const loginResponse = await loginDriver(trimmedBackendUrl, username, pin);

      const nextToken =
        loginResponse.token ||
        loginResponse.accessToken ||
        loginResponse.access_token ||
        loginResponse.driverToken;

      if (!nextToken) {
        throw new Error('Login response did not return a driver token');
      }

      setToken(nextToken);
      await saveToken(nextToken);

      await loadDashboard(nextToken);
      setConnected(true);
      await startLocationTracking(nextToken);
    } catch (error) {
      setConnected(false);
      setDriver(null);
      setActiveOffer(null);
      setActiveJobs([]);
      setCompletedJobs([]);
      setToken('');
      setConnectError(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      setRefreshing(true);
      await loadDashboard();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGoOnline() {
    try {
      setBusyAction('go-online');

      await apiFetch(trimmedBackendUrl, '/driver-app/me/status', token, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ONLINE' }),
      });

      await startLocationTracking();
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to go online');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendCurrentGps() {
    try {
      setBusyAction('gps-now');
      await sendCurrentGps();
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to send GPS');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartShift() {
    try {
      setBusyAction('start-shift');

      await apiFetch(trimmedBackendUrl, '/driver-app/me/shift/start', token, {
        method: 'POST',
        body: JSON.stringify({ startStatus: 'ONLINE' }),
      });

      await startLocationTracking();
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to start shift');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleEndShift() {
    try {
      setBusyAction('end-shift');

      await apiFetch(trimmedBackendUrl, '/driver-app/me/shift/end', token, {
        method: 'POST',
        body: JSON.stringify({ endStatus: 'OFF_DUTY' }),
      });

      await stopLocationTracking();
      setLocationEnabled(false);
      setLocationStatus('GPS stopped');
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to end shift');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAcceptOffer() {
    if (!activeOffer) return;

    try {
      setBusyAction('accept-offer');

      await apiFetch(trimmedBackendUrl, '/driver-app/me/offer/respond', token, {
        method: 'POST',
        body: JSON.stringify({
          bookingId: activeOffer.id,
          action: 'ACCEPT',
        }),
      });

      await startLocationTracking();
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to accept offer');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRejectOffer() {
    if (!activeOffer) return;

    try {
      setBusyAction('reject-offer');

      await apiFetch(trimmedBackendUrl, '/driver-app/me/offer/respond', token, {
        method: 'POST',
        body: JSON.stringify({
          bookingId: activeOffer.id,
          action: 'REJECT',
        }),
      });

      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to reject offer');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJobAction(bookingId: string, endpoint: string, busyKey: string) {
    const optimisticStatus =
      endpoint === 'en-route'
        ? 'EN_ROUTE'
        : endpoint === 'arrived'
          ? 'ARRIVED'
          : endpoint === 'on-job' || endpoint === 'start'
            ? 'ON_JOB'
            : endpoint === 'complete'
              ? 'COMPLETED'
              : endpoint === 'no-show'
                ? 'NO_SHOW'
                : null;

    try {
      setBusyAction(`${busyKey}:${bookingId}`);

      if (optimisticStatus) {
        setActiveJobs((current) =>
          current.map((job) => (job.id === bookingId ? { ...job, status: optimisticStatus } : job)),
        );
      }

      await apiFetch(trimmedBackendUrl, `/driver-app/me/jobs/${bookingId}/${endpoint}`, token, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await sendCurrentGps().catch((error) => console.log(error));
      await loadDashboard();
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : 'Failed to update job');
      await loadDashboard().catch((refreshError) => console.log(refreshError));
    } finally {
      setBusyAction(null);
    }
  }

  async function disconnect() {
    setConnected(false);
    setDriver(null);
    setActiveOffer(null);
    setActiveJobs([]);
    setCompletedJobs([]);
    setConnectError('');
    setToken('');
    setLocationEnabled(false);
    setLocationStatus('');
    lastOfferIdRef.current = null;

    socketRef.current?.disconnect();
    socketRef.current = null;

    await stopLocationTracking();
    await clearStoredAuth();

    setUsername('');
    setPin('');
  }

  if (hydrating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={{ color: '#cbd5e1', fontSize: 16 }}>Loading saved driver login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!connected || !driver) {
    return (
      <LoginScreen
        username={username}
        setUsername={setUsername}
        pin={pin}
        setPin={setPin}
        loading={loading}
        error={connectError}
        onContinue={connectToDashboard}
      />
    );
  }

  return (
    <DriverDashboard
      backendUrl={trimmedBackendUrl}
      driver={driver}
      activeOffer={activeOffer}
      activeJobs={activeJobs}
      completedJobs={completedJobs}
      refreshing={refreshing}
      busyAction={busyAction}
      locationEnabled={locationEnabled}
      locationStatus={locationStatus}
      offerSecondsRemaining={offerSecondsRemaining}
      onRefresh={refresh}
      onStartShift={handleStartShift}
      onEndShift={handleEndShift}
      onAcceptOffer={handleAcceptOffer}
      onRejectOffer={handleRejectOffer}
      onJobAction={handleJobAction}
      onDisconnect={disconnect}
      onTestAlert={playOfferAlert}
      onSendCurrentGps={handleSendCurrentGps}
      onGoOnline={handleGoOnline}
    />
  );
}