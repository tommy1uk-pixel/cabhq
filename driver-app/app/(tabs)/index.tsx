import '../../lib/background-location';

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ActivityIndicator,
  LogBox,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '@/components/driver/Badge';
import { CompletedJobCard } from '@/components/driver/CompletedJobCard';
import { DetailRow } from '@/components/driver/DetailRow';
import { IncomingOfferScreen } from '@/components/driver/IncomingOfferScreen';
import { JobCard } from '@/components/driver/JobCard';
import { LoginScreen } from '@/components/driver/LoginScreen';
import { PrimaryButton } from '@/components/driver/PrimaryButton';
import { SectionCard } from '@/components/driver/SectionCard';
import { SummaryTile } from '@/components/driver/SummaryTile';

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

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return `£${Number(value).toFixed(2)}`;
}

function formatMinutes(value?: number | null) {
  if (value == null) return '—';

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function isAirportBooking(job?: Booking | null) {
  return Boolean(
    job?.isAirportBooking ||
      job?.airportCode ||
      job?.airportName ||
      job?.airportTerminal ||
      job?.flightNumber ||
      job?.flightDirection ||
      job?.flightDateTime ||
      job?.airline ||
      job?.meetAndGreet ||
      job?.airportNotes,
  );
}

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

  return Math.max(0, Math.ceil((offeredAt + OFFER_TIMEOUT_SECONDS * 1000 - now) / 1000));
}

function DriverDashboard({
  backendUrl,
  driver,
  activeOffer,
  activeJobs,
  completedJobs,
  refreshing,
  busyAction,
  locationEnabled,
  locationStatus,
  offerSecondsRemaining,
  onRefresh,
  onStartShift,
  onEndShift,
  onAcceptOffer,
  onRejectOffer,
  onJobAction,
  onDisconnect,
  onTestAlert,
  onSendCurrentGps,
  onGoOnline,
}: {
  backendUrl: string;
  driver: Driver;
  activeOffer: Booking | null;
  activeJobs: Booking[];
  completedJobs: Booking[];
  refreshing: boolean;
  busyAction: string | null;
  locationEnabled: boolean;
  locationStatus: string;
  offerSecondsRemaining: number;
  onRefresh: () => void;
  onStartShift: () => void;
  onEndShift: () => void;
  onAcceptOffer: () => void;
  onRejectOffer: () => void;
  onJobAction: (bookingId: string, endpoint: string, busyKey: string) => void;
  onDisconnect: () => void;
  onTestAlert: () => void;
  onSendCurrentGps: () => void;
  onGoOnline: () => void;
}) {
  const blockedReasons = driver.dispatch?.blockedReasons ?? [];
  const onShift = Boolean(driver.shift?.active);
  const driverStatus = (driver.status || 'UNKNOWN').toUpperCase();
  const isOnlineStatus = ['ONLINE', 'AVAILABLE', 'ON_DUTY'].includes(driverStatus);
  const hasGps = Boolean(driver.latitude != null && driver.longitude != null && driver.lastLocationAt);

  const completedTotal = completedJobs.reduce((sum, job: any) => {
    const price = job.quotedPrice ?? job.pricing?.quotedPrice ?? job.fare ?? job.price ?? 0;
    return sum + Number(price || 0);
  }, 0);

  const completedCount = completedJobs.length || driver.shift?.summary?.completedJobs || 0;
  const airportActiveJobs = activeJobs.filter(isAirportBooking).length;
  const liveEtaJobs = activeJobs.filter((job) => job.etaMinutes != null).length;

  const complianceTone = useMemo(() => {
    if (driver.compliance?.overallStatus === 'EXPIRED') return 'red' as const;
    if (driver.compliance?.overallStatus === 'EXPIRING') return 'amber' as const;
    return 'green' as const;
  }, [driver.compliance?.overallStatus]);

  if (activeOffer) {
    return (
      <IncomingOfferScreen
        offer={activeOffer}
        secondsRemaining={offerSecondsRemaining}
        busyAction={busyAction}
        onAcceptOffer={onAcceptOffer}
        onRejectOffer={onRejectOffer}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
                DRIVER APP
              </Text>

              <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', marginTop: 6 }}>
                {driver.name || 'Driver'}
              </Text>

              <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
                {driver.username ? `@${driver.username}` : driver.email || driver.phone || 'No contact details'}
              </Text>

              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                {backendUrl}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onDisconnect}
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '800' }}>Disconnect</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <Badge label={onShift ? 'ON SHIFT' : 'OFF SHIFT'} tone={onShift ? 'cyan' : 'slate'} />
            <Badge
              label={driverStatus.replace('_', ' ')}
              tone={isOnlineStatus ? 'green' : driverStatus === 'BUSY' || driverStatus === 'OFFERED' ? 'cyan' : 'amber'}
            />
            <Badge label={hasGps ? 'GPS LIVE' : 'NO GPS'} tone={hasGps ? 'green' : 'red'} />
            <Badge label={driver.compliance?.overallStatus || 'VALID'} tone={complianceTone} />
            <Badge
              label={driver.dispatch?.assignable === false ? 'DISPATCH BLOCKED' : 'DISPATCH READY'}
              tone={driver.dispatch?.assignable === false ? 'red' : 'green'}
            />
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            <PrimaryButton label="Test Alert Sound" onPress={onTestAlert} disabled={busyAction !== null} color="#7c3aed" />

            <PrimaryButton
              label={busyAction === 'go-online' ? 'Going Online...' : 'Go Online Now'}
              onPress={onGoOnline}
              disabled={busyAction !== null}
              color="#0891b2"
            />

            <PrimaryButton
              label={busyAction === 'gps-now' ? 'Sending GPS...' : 'Send Current GPS Now'}
              onPress={onSendCurrentGps}
              disabled={busyAction !== null}
              color="#059669"
            />
          </View>
        </View>

        <SectionCard title="Today Summary">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <SummaryTile label="Earnings" value={formatCurrency(completedTotal)} tone="green" />
            <SummaryTile label="Completed" value={String(completedCount)} tone="cyan" />
            <SummaryTile label="Active Jobs" value={String(activeJobs.length)} tone="amber" />
            <SummaryTile label="Airport Jobs" value={String(airportActiveJobs)} tone="cyan" />
            <SummaryTile label="Live ETAs" value={String(liveEtaJobs)} tone="green" />
            <SummaryTile label="Shift Time" value={formatMinutes(driver.shift?.durationMinutes ?? null)} tone="slate" />
          </View>
        </SectionCard>

        <SectionCard title="Shift">
          <DetailRow label="Status" value={onShift ? 'On shift' : 'Off shift'} />
          <DetailRow label="Driver Status" value={driverStatus} />
          <DetailRow label="Started" value={driver.shift?.startedAt ? formatDateTime(driver.shift.startedAt) : '—'} />
          <DetailRow label="Completed Jobs" value={String(driver.shift?.summary?.completedJobs ?? 0)} />
          <DetailRow label="Active Jobs" value={String(driver.shift?.summary?.activeJobs ?? 0)} />
          <DetailRow label="Shift Time" value={formatMinutes(driver.shift?.durationMinutes ?? null)} />

          <View style={{ marginTop: 14 }}>
            {!onShift ? (
              <PrimaryButton
                label={busyAction === 'start-shift' ? 'Starting shift...' : 'Start Shift / Go Online'}
                onPress={onStartShift}
                disabled={busyAction !== null}
                color="#059669"
              />
            ) : (
              <PrimaryButton
                label={busyAction === 'end-shift' ? 'Ending shift...' : 'End Shift'}
                onPress={onEndShift}
                disabled={busyAction !== null}
                color="#d97706"
              />
            )}
          </View>
        </SectionCard>

        <SectionCard title="Dispatch Status">
          <DetailRow label="Assignable" value={driver.dispatch?.assignable === false ? 'No' : 'Yes'} />
          <DetailRow label="Compliance" value={driver.compliance?.overallStatus || 'VALID'} />
          <DetailRow label="Location Tracking" value={locationEnabled ? 'Active' : 'Inactive'} />
          <DetailRow label="Last GPS Update" value={formatDateTime(driver.lastLocationAt)} />
          <DetailRow
            label="Coordinates"
            value={
              driver.latitude != null && driver.longitude != null
                ? `${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)}`
                : '—'
            }
          />

          {locationStatus ? (
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 10 }}>{locationStatus}</Text>
          ) : null}

          {blockedReasons.length > 0 ? (
            <View style={{ marginTop: 14, backgroundColor: '#3b0a0a', borderRadius: 14, padding: 14 }}>
              <Text style={{ color: '#fecaca', fontSize: 12, fontWeight: '900', marginBottom: 8 }}>
                BLOCKED REASONS
              </Text>

              {blockedReasons.map((reason) => (
                <Text key={reason} style={{ color: '#fee2e2', fontSize: 14, marginBottom: 6 }}>
                  • {reason}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Current Jobs" right={<Badge label={`${activeJobs.length} ACTIVE`} tone="cyan" />}>
          {activeJobs.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>No active jobs.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} busyAction={busyAction} onJobAction={onJobAction} />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Completed Jobs" right={<Badge label={`${completedJobs.length} DONE`} tone="green" />}>
          {completedJobs.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>No completed jobs yet.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {completedJobs.slice(0, 10).map((job) => (
                <CompletedJobCard key={job.id} job={job} />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Driver Profile">
          <DetailRow label="Licence Number" value={driver.licenceNumber || '—'} />
          <DetailRow label="Taxi Badge Expiry" value={formatDate(driver.badgeExpiry)} />
          <DetailRow label="DBS Expiry" value={formatDate(driver.dbsExpiry)} />
          <DetailRow label="Licence Expiry" value={formatDate(driver.licenceExpiry)} />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
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