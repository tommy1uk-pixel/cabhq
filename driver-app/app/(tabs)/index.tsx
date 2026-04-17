import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_API_BASE_URL = 'http://192.168.1.135:3002';

const STORAGE_KEYS = {
  backendUrl: 'cabhq_driver_backend_url',
  driverId: 'cabhq_driver_driver_id',
  token: 'cabhq_driver_token',
};

type DriverShiftSummary = {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs?: number;
  activeJobs: number;
};

type DriverShift = {
  id: string;
  driverId: string;
  companyId: string;
  startedAt: string;
  endedAt?: string | null;
  startStatus?: string | null;
  endStatus?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active: boolean;
  durationMinutes: number;
  summary: DriverShiftSummary;
};

type DriverDispatchState = {
  assignable: boolean;
  blockedReasons: string[];
};

type DriverComplianceState = {
  blocked: boolean;
  overallStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | string;
};

type DriverDocument = {
  id: string;
  title: string;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'NO_EXPIRY';
  expiryDate?: string | null;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  pin?: string | null;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lastLocationAt?: string | null;
  documents?: DriverDocument[];
  dispatch?: DriverDispatchState;
  compliance?: DriverComplianceState;
  shift?: DriverShift | null;
};

type BookingEvent = {
  id: string;
  message: string;
  createdAt: string;
};

type Booking = {
  id: string;
  reference: string;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  status: string;
  quotedPrice?: number | null;
  pricingMode?: string | null;
  driverId?: string | null;
  events?: BookingEvent[];
};

type BootstrapResponse = {
  driver: Driver;
  offer: Booking | null;
  activeJobs: Booking[];
  currentJob?: Booking | null;
  currentShift?: {
    shift: DriverShift | null;
  } | null;
  home?: {
    hasActiveOffer?: boolean;
    hasActiveJob?: boolean;
    activeOfferSecondsRemaining?: number;
    activeOfferExpiresAt?: string | null;
    onShift?: boolean;
    shiftStartedAt?: string | null;
  };
};

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const headers = new Headers(options?.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${normalizedBaseUrl}${normalizedPath}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || `Request failed (${response.status})`,
    );
  }

  return data as T;
}

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
  return `£${value.toFixed(2)}`;
}

function formatMinutes(value?: number | null) {
  if (value == null) return '—';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'amber' | 'red' | 'cyan' | 'slate';
}) {
  const styles = {
    green: { backgroundColor: '#052e1b', color: '#6ee7b7' },
    amber: { backgroundColor: '#3b2305', color: '#fcd34d' },
    red: { backgroundColor: '#3b0a0a', color: '#fca5a5' },
    cyan: { backgroundColor: '#082f49', color: '#67e8f9' },
    slate: { backgroundColor: '#1e293b', color: '#cbd5e1' },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: styles.backgroundColor,
      }}
    >
      <Text style={{ color: styles.color, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  color = '#0891b2',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#334155' : color,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
      }}
    >
      <Text style={{ color: '#94a3b8', fontSize: 14 }}>{label}</Text>
      <Text
        style={{
          color: 'white',
          fontSize: 14,
          fontWeight: '600',
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
      }}
    >
      <View
        style={{
          marginBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function LoginScreen({
  backendUrl,
  setBackendUrl,
  driverId,
  setDriverId,
  token,
  setToken,
  loading,
  error,
  onContinue,
}: {
  backendUrl: string;
  setBackendUrl: (value: string) => void;
  driverId: string;
  setDriverId: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  loading: boolean;
  error: string;
  onContinue: () => void;
}) {
  const ready =
    backendUrl.trim().length > 0 &&
    driverId.trim().length > 0 &&
    token.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1.5,
            }}
          >
            CABHQ DRIVER APP
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 32,
              fontWeight: '800',
              marginTop: 10,
            }}
          >
            Driver Login Setup
          </Text>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 15,
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Enter your backend URL, driver ID, and JWT token to open the live
            driver dashboard.
          </Text>

          <View style={{ marginTop: 24, gap: 14 }}>
            <View>
              <Text style={{ color: '#cbd5e1', marginBottom: 8, fontWeight: '600' }}>
                Backend URL
              </Text>
              <TextInput
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="http://192.168.1.135:3002"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: '#07111f',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            </View>

            <View>
              <Text style={{ color: '#cbd5e1', marginBottom: 8, fontWeight: '600' }}>
                Driver ID
              </Text>
              <TextInput
                value={driverId}
                onChangeText={setDriverId}
                placeholder="Paste driver id here"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: '#07111f',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            </View>

            <View>
              <Text style={{ color: '#cbd5e1', marginBottom: 8, fontWeight: '600' }}>
                JWT Token
              </Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Paste token here"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                style={{
                  backgroundColor: '#07111f',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 120,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </View>

          {error ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: '#3b0a0a',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ color: '#fecaca', fontSize: 14, fontWeight: '700' }}>
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={!ready || loading}
            onPress={onContinue}
            style={{
              marginTop: 22,
              backgroundColor: ready && !loading ? '#0891b2' : '#334155',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>
              {loading ? 'Connecting...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function DriverDashboard({
  backendUrl,
  driver,
  activeOffer,
  activeJobs,
  refreshing,
  busyAction,
  onRefresh,
  onStartShift,
  onEndShift,
  onAcceptOffer,
  onRejectOffer,
  onDisconnect,
}: {
  backendUrl: string;
  driver: Driver;
  activeOffer: Booking | null;
  activeJobs: Booking[];
  refreshing: boolean;
  busyAction: string | null;
  onRefresh: () => void;
  onStartShift: () => void;
  onEndShift: () => void;
  onAcceptOffer: () => void;
  onRejectOffer: () => void;
  onDisconnect: () => void;
}) {
  const blockedReasons = driver.dispatch?.blockedReasons ?? [];
  const onShift = Boolean(driver.shift?.active);

  const complianceTone = useMemo(() => {
    if (driver.compliance?.overallStatus === 'EXPIRED') return 'red' as const;
    if (driver.compliance?.overallStatus === 'EXPIRING') return 'amber' as const;
    return 'green' as const;
  }, [driver.compliance?.overallStatus]);

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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                DRIVER APP
              </Text>
              <Text
                style={{
                  color: 'white',
                  fontSize: 28,
                  fontWeight: '800',
                  marginTop: 6,
                }}
              >
                {driver.name || 'Driver'}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
                {driver.email || driver.phone || 'No contact details'}
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
              <Text style={{ color: 'white', fontWeight: '700' }}>Disconnect</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 16,
            }}
          >
            <Badge
              label={onShift ? 'ON SHIFT' : 'OFF SHIFT'}
              tone={onShift ? 'cyan' : 'slate'}
            />
            <Badge
              label={(driver.status || 'UNKNOWN').replace('_', ' ')}
              tone={
                ['ONLINE', 'AVAILABLE', 'ON_DUTY'].includes((driver.status || '').toUpperCase())
                  ? 'green'
                  : ['BUSY'].includes((driver.status || '').toUpperCase())
                    ? 'cyan'
                    : 'amber'
              }
            />
            <Badge
              label={driver.compliance?.overallStatus || 'VALID'}
              tone={complianceTone}
            />
            <Badge
              label={driver.dispatch?.assignable === false ? 'DISPATCH BLOCKED' : 'DISPATCH READY'}
              tone={driver.dispatch?.assignable === false ? 'red' : 'green'}
            />
          </View>
        </View>

        <SectionCard
          title="Shift"
          right={
            onShift && driver.shift ? (
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                {formatMinutes(driver.shift.durationMinutes)}
              </Text>
            ) : undefined
          }
        >
          <DetailRow label="Status" value={onShift ? 'On shift' : 'Off shift'} />
          <DetailRow
            label="Started"
            value={driver.shift?.startedAt ? formatDateTime(driver.shift.startedAt) : '—'}
          />
          <DetailRow
            label="Completed Jobs"
            value={String(driver.shift?.summary?.completedJobs ?? 0)}
          />
          <DetailRow
            label="Active Jobs"
            value={String(driver.shift?.summary?.activeJobs ?? 0)}
          />

          <View style={{ marginTop: 14 }}>
            {!onShift ? (
              <PrimaryButton
                label={busyAction === 'start-shift' ? 'Starting shift...' : 'Start Shift'}
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
          <DetailRow
            label="Assignable"
            value={driver.dispatch?.assignable === false ? 'No' : 'Yes'}
          />
          <DetailRow
            label="Compliance"
            value={driver.compliance?.overallStatus || 'VALID'}
          />
          <DetailRow
            label="Last GPS Update"
            value={formatDateTime(driver.lastLocationAt)}
          />

          {blockedReasons.length > 0 ? (
            <View
              style={{
                marginTop: 14,
                backgroundColor: '#3b0a0a',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: '#fecaca',
                  fontSize: 12,
                  fontWeight: '800',
                  marginBottom: 8,
                }}
              >
                BLOCKED REASONS
              </Text>
              {blockedReasons.map((reason) => (
                <Text
                  key={reason}
                  style={{ color: '#fee2e2', fontSize: 14, marginBottom: 6 }}
                >
                  • {reason}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>

        {activeOffer ? (
          <SectionCard title="Active Offer" right={<Badge label="NEW OFFER" tone="amber" />}>
            <DetailRow label="Reference" value={activeOffer.reference} />
            <DetailRow label="Pickup" value={activeOffer.pickup} />
            <DetailRow label="Dropoff" value={activeOffer.dropoff} />
            <DetailRow label="Pickup Time" value={formatDateTime(activeOffer.pickupTime)} />
            <DetailRow label="Fare" value={formatCurrency(activeOffer.quotedPrice)} />
            <DetailRow label="Pricing" value={activeOffer.pricingMode || '—'} />

            <View style={{ marginTop: 16, gap: 10 }}>
              <PrimaryButton
                label={busyAction === 'accept-offer' ? 'Accepting...' : 'Accept Job'}
                onPress={onAcceptOffer}
                disabled={busyAction !== null}
                color="#059669"
              />
              <PrimaryButton
                label={busyAction === 'reject-offer' ? 'Rejecting...' : 'Reject Offer'}
                onPress={onRejectOffer}
                disabled={busyAction !== null}
                color="#dc2626"
              />
            </View>
          </SectionCard>
        ) : (
          <SectionCard title="Active Offer">
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>
              No live offer right now.
            </Text>
          </SectionCard>
        )}

        <SectionCard
          title="Current Jobs"
          right={<Badge label={`${activeJobs.length} ACTIVE`} tone="cyan" />}
        >
          {activeJobs.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>No active jobs.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {activeJobs.map((job) => (
                <View
                  key={job.id}
                  style={{
                    borderWidth: 1,
                    borderColor: '#1e293b',
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: '#07111f',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                      gap: 10,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                      {job.reference}
                    </Text>
                    <Badge
                      label={job.status.replace('_', ' ')}
                      tone={
                        ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(job.status)
                          ? 'cyan'
                          : 'slate'
                      }
                    />
                  </View>

                  <Text style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>
                    {job.pickup}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>
                    → {job.dropoff}
                  </Text>
                  <Text style={{ color: '#67e8f9', fontSize: 13 }}>
                    {formatDateTime(job.pickupTime)}
                  </Text>

                  {job.events?.length ? (
                    <View
                      style={{
                        marginTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#1e293b',
                        paddingTop: 12,
                        gap: 6,
                      }}
                    >
                      {job.events.slice(0, 3).map((event) => (
                        <Text
                          key={event.id}
                          style={{ color: '#94a3b8', fontSize: 12 }}
                        >
                          {event.message}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
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
  const [backendUrl, setBackendUrl] = useState(DEFAULT_API_BASE_URL);
  const [driverId, setDriverId] = useState('');
  const [token, setToken] = useState('');

  const [hydrating, setHydrating] = useState(true);
  const [connected, setConnected] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeOffer, setActiveOffer] = useState<Booking | null>(null);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');

  const trimmedBackendUrl = backendUrl.trim();

  useEffect(() => {
    void (async () => {
      try {
        const [storedBackendUrl, storedDriverId, storedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.backendUrl),
          AsyncStorage.getItem(STORAGE_KEYS.driverId),
          AsyncStorage.getItem(STORAGE_KEYS.token),
        ]);

        if (storedBackendUrl) setBackendUrl(storedBackendUrl);
        if (storedDriverId) setDriverId(storedDriverId);
        if (storedToken) setToken(storedToken);
      } catch (error) {
        console.error('Failed to load saved login values', error);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrating) return;
    void AsyncStorage.setItem(STORAGE_KEYS.backendUrl, backendUrl).catch((error) =>
      console.error('Failed saving backend URL', error),
    );
  }, [backendUrl, hydrating]);

  useEffect(() => {
    if (hydrating) return;
    void AsyncStorage.setItem(STORAGE_KEYS.driverId, driverId).catch((error) =>
      console.error('Failed saving driver ID', error),
    );
  }, [driverId, hydrating]);

  useEffect(() => {
    if (hydrating) return;
    void AsyncStorage.setItem(STORAGE_KEYS.token, token).catch((error) =>
      console.error('Failed saving token', error),
    );
  }, [token, hydrating]);

  const loadDashboard = useCallback(async () => {
    if (!trimmedBackendUrl || !driverId.trim() || !token.trim()) {
      throw new Error('Backend URL, driver ID, and JWT token are all required');
    }

    const bootstrap = await apiFetch<BootstrapResponse>(
      trimmedBackendUrl,
      '/driver-app/me/bootstrap',
      token,
    );

    if (!bootstrap?.driver?.id) {
      throw new Error('Bootstrap response did not contain a driver profile');
    }

    if (driverId.trim() && bootstrap.driver.id !== driverId.trim()) {
      throw new Error('JWT token does not match the driver ID entered');
    }

    setDriver({
      ...bootstrap.driver,
      shift: bootstrap.currentShift?.shift ?? bootstrap.driver.shift ?? null,
    });
    setActiveOffer(bootstrap.offer ?? null);
    setActiveJobs(Array.isArray(bootstrap.activeJobs) ? bootstrap.activeJobs : []);
  }, [trimmedBackendUrl, driverId, token]);

  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      void loadDashboard().catch((error) => {
        console.error(error);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [connected, loadDashboard]);

  async function connectToDashboard() {
    try {
      setLoading(true);
      setConnectError('');
      await loadDashboard();
      setConnected(true);
    } catch (error) {
      console.error(error);
      setConnected(false);
      setDriver(null);
      setActiveOffer(null);
      setActiveJobs([]);
      setConnectError(
        error instanceof Error ? error.message : 'Failed to connect',
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      setRefreshing(true);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setConnectError(
        error instanceof Error ? error.message : 'Refresh failed',
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStartShift() {
    try {
      setBusyAction('start-shift');
      await apiFetch(trimmedBackendUrl, '/driver-app/me/shift/start', token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setConnectError(
        error instanceof Error ? error.message : 'Failed to start shift',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleEndShift() {
    try {
      setBusyAction('end-shift');
      await apiFetch(trimmedBackendUrl, '/driver-app/me/shift/end', token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setConnectError(
        error instanceof Error ? error.message : 'Failed to end shift',
      );
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
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setConnectError(
        error instanceof Error ? error.message : 'Failed to accept offer',
      );
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
      console.error(error);
      setConnectError(
        error instanceof Error ? error.message : 'Failed to reject offer',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function disconnect() {
    setConnected(false);
    setDriver(null);
    setActiveOffer(null);
    setActiveJobs([]);
    setConnectError('');

    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.driverId),
        AsyncStorage.removeItem(STORAGE_KEYS.token),
      ]);
    } catch (error) {
      console.error('Failed clearing saved login values', error);
    }

    setDriverId('');
    setToken('');
  }

  if (hydrating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={{ color: '#cbd5e1', fontSize: 16 }}>
            Loading saved driver login...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!connected || !driver) {
    return (
      <LoginScreen
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        driverId={driverId}
        setDriverId={setDriverId}
        token={token}
        setToken={setToken}
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
      refreshing={refreshing}
      busyAction={busyAction}
      onRefresh={refresh}
      onStartShift={handleStartShift}
      onEndShift={handleEndShift}
      onAcceptOffer={handleAcceptOffer}
      onRejectOffer={handleRejectOffer}
      onDisconnect={disconnect}
    />
  );
}