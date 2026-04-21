'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import L, { LatLngTuple, Map as LeafletMap } from 'leaflet';
import { closeSocket, getSocket } from '../../lib/socket';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);

type Vehicle = {
  id: string;
  registration?: string;
  reg?: string;
  make?: string | null;
  model?: string | null;
} | null;

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  isOnDuty?: boolean;
  isAvailable?: boolean;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
};

type DriverSuggestion = {
  id: string;
  name: string;
  status: string;
  distanceMiles?: number | null;
  score?: number | null;
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
};

type Booking = {
  id: string;
  reference: string;
  customerName?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickup?: string;
  dropoff?: string;
  pickupAt?: string;
  pickupTime?: string;
  status: string;
  quotedPrice?: number | null;
  driverId?: string | null;
  driver?: Driver | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  suggestedDrivers?: DriverSuggestion[];
};

type TimelineEvent = {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string;
};

function getDriverName(driver: Driver) {
  return driver.fullName || driver.name || 'Unknown driver';
}

function getPickupLabel(booking: Booking) {
  return booking.pickupAddress || booking.pickup || '—';
}

function getDropoffLabel(booking: Booking) {
  return booking.dropoffAddress || booking.dropoff || '—';
}

function getPickupTimeLabel(booking: Booking) {
  return booking.pickupAt || booking.pickupTime || '';
}

function getVehicleLabel(vehicle: Vehicle) {
  if (!vehicle) return 'No vehicle assigned';

  const reg = vehicle.registration || vehicle.reg || '';
  const details = [vehicle.make, vehicle.model].filter(Boolean).join(' ');

  if (reg && details) return `${reg} • ${details}`;
  if (reg) return reg;
  if (details) return details;

  return 'Vehicle assigned';
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
    second: '2-digit',
  });
}

function formatDistance(value?: number | null) {
  if (value == null) return '—';
  return `${value.toFixed(2)} mi`;
}

function makeDriverIcon(driver: Driver) {
  const status = (driver.status || '').toUpperCase();
  const available = driver.isAvailable || status === 'AVAILABLE';
  const busy = status === 'BUSY' || status === 'ON_JOB' || status === 'EN_ROUTE';
  const blocked = status === 'OFF_DUTY';

  const color = blocked ? '#ef4444' : busy ? '#f59e0b' : available ? '#10b981' : '#06b6d4';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function makeBookingIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        min-width: 26px;
        height: 26px;
        border-radius: 9999px;
        background: ${color};
        color: white;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
        padding: 0 6px;
      ">${label}</div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-900 p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function DispatchPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState('');
  const [connected, setConnected] = useState(false);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const [autoDispatchingId, setAutoDispatchingId] = useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const liveDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          typeof driver.latitude === 'number' &&
          typeof driver.longitude === 'number',
      ),
    [drivers],
  );

  const selectedPickupPosition = useMemo<LatLngTuple | null>(() => {
    if (
      selectedBooking?.pickupLatitude == null ||
      selectedBooking?.pickupLongitude == null
    ) {
      return null;
    }
    return [
      selectedBooking.pickupLatitude,
      selectedBooking.pickupLongitude,
    ] as LatLngTuple;
  }, [selectedBooking]);

  const selectedDropoffPosition = useMemo<LatLngTuple | null>(() => {
    if (
      selectedBooking?.dropoffLatitude == null ||
      selectedBooking?.dropoffLongitude == null
    ) {
      return null;
    }
    return [
      selectedBooking.dropoffLatitude,
      selectedBooking.dropoffLongitude,
    ] as LatLngTuple;
  }, [selectedBooking]);

  const mapCenter = useMemo<LatLngTuple>(() => {
    if (selectedPickupPosition) return selectedPickupPosition;
    if (liveDrivers.length > 0) {
      return [
        liveDrivers[0].latitude as number,
        liveDrivers[0].longitude as number,
      ] as LatLngTuple;
    }
    return [51.5074, -0.1278] as LatLngTuple;
  }, [liveDrivers, selectedPickupPosition]);

  useEffect(() => {
    if (!mapRef.current) return;

    const points: LatLngTuple[] = [
      ...liveDrivers.map(
        (driver): LatLngTuple => [
          driver.latitude as number,
          driver.longitude as number,
        ],
      ),
    ];

    if (selectedPickupPosition) {
      points.push(selectedPickupPosition);
    }

    if (selectedDropoffPosition) {
      points.push(selectedDropoffPosition);
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      mapRef.current.setView(points[0], 13);
      return;
    }

    mapRef.current.fitBounds(points, { padding: [40, 40] });
  }, [liveDrivers, selectedPickupPosition, selectedDropoffPosition]);

  const loadBookings = useCallback(async () => {
    if (!token) return;

    const response = await fetch(`${API_URL}/bookings/dispatch-board`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to load bookings (${response.status})`);
    }

    const data = (await response.json()) as Booking[];
    setBookings(Array.isArray(data) ? data : []);
  }, [token]);

  const loadDrivers = useCallback(
    async (showSpinner = true) => {
      if (!token) return;

      try {
        setDriversError('');
        if (showSpinner) setDriversLoading(true);

        const response = await fetch(`${API_URL}/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to load drivers (${response.status})`);
        }

        const data = (await response.json()) as Driver[];
        setDrivers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setDriversError(
          error instanceof Error ? error.message : 'Failed to load drivers',
        );
      } finally {
        if (showSpinner) setDriversLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([loadBookings(), loadDrivers(true)]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, loadBookings, loadDrivers]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      void loadDrivers(false);
      void loadBookings();
    }, 10000);

    return () => clearInterval(interval);
  }, [token, loadDrivers, loadBookings]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('booking:created', (p) => {
      setBookings((prev) => [p.booking, ...prev]);
    });

    socket.on('booking:updated', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
    });

    socket.on('booking:assigned', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
    });

    socket.on('booking:status_changed', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
    });

    socket.on('driver:updated', (p) => {
      setDrivers((prev) => {
        const existing = prev.some((d) => d.id === p.driver.id);
        if (!existing) return [p.driver, ...prev];
        return prev.map((d) => (d.id === p.driver.id ? p.driver : d));
      });
    });

    return () => closeSocket();
  }, [token]);

  const autoDispatch = async (id: string) => {
    try {
      setAutoDispatchingId(id);
      await fetch(`${API_URL}/bookings/${id}/auto-dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadBookings();
    } finally {
      setAutoDispatchingId(null);
    }
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    try {
      setAssigningKey(`${bookingId}:${driverId}`);
      await fetch(`${API_URL}/bookings/${bookingId}/assign-driver`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });
      await loadBookings();
    } finally {
      setAssigningKey(null);
    }
  };

  const loadTimeline = async (bookingId: string) => {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setTimeline(await res.json());
  };

  const stats = useMemo(() => {
    return {
      bookings: bookings.length,
      drivers: drivers.length,
      available: drivers.filter(
        (d) => d.isAvailable || d.status === 'AVAILABLE',
      ).length,
      liveGps: liveDrivers.length,
    };
  }, [bookings, drivers, liveDrivers.length]);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <h1 className="mb-4 text-3xl font-bold">Dispatch</h1>

      <div className="mb-4">
        Status:{' '}
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Bookings" value={stats.bookings} />
        <Card label="Drivers" value={stats.drivers} />
        <Card label="Available" value={stats.available} />
        <Card label="GPS Live" value={stats.liveGps} />
      </div>

      <section className="mb-8 rounded-2xl border border-white/10 bg-gray-950 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Live Driver Map</h2>
            <p className="mt-1 text-sm text-gray-400">
              Real-time vehicle positions with booking markers
            </p>
          </div>

          <button
            onClick={() => void loadDrivers(true)}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium hover:bg-cyan-600"
          >
            Refresh Drivers
          </button>
        </div>

        {driversError ? (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {driversError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="h-[420px] w-full bg-gray-900">
            <MapContainer
              center={mapCenter}
              zoom={12}
              scrollWheelZoom
              className="h-full w-full"
              ref={(map) => {
                if (map) mapRef.current = map;
              }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {liveDrivers.map((driver) => (
                <Marker
                  key={driver.id}
                  position={[
                    driver.latitude as number,
                    driver.longitude as number,
                  ] as LatLngTuple}
                  icon={makeDriverIcon(driver)}
                >
                  <Popup>
                    <div className="min-w-[180px] text-black">
                      <div className="font-bold">{getDriverName(driver)}</div>
                      <div className="mt-1 text-sm">
                        {(driver.status || 'UNKNOWN').replace(/_/g, ' ')}
                      </div>
                      <div className="mt-1 text-sm">
                        {getVehicleLabel(driver.vehicle ?? null)}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        GPS: {formatDateTime(driver.lastLocationAt)}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {driver.latitude}, {driver.longitude}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {selectedPickupPosition ? (
                <Marker
                  position={selectedPickupPosition}
                  icon={makeBookingIcon('#2563eb', 'P')}
                >
                  <Popup>
                    <div className="text-black">
                      <div className="font-bold">Pickup</div>
                      <div className="mt-1 text-sm">
                        {selectedBooking ? getPickupLabel(selectedBooking) : '—'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ) : null}

              {selectedDropoffPosition ? (
                <Marker
                  position={selectedDropoffPosition}
                  icon={makeBookingIcon('#7c3aed', 'D')}
                >
                  <Popup>
                    <div className="text-black">
                      <div className="font-bold">Dropoff</div>
                      <div className="mt-1 text-sm">
                        {selectedBooking ? getDropoffLabel(selectedBooking) : '—'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ) : null}
            </MapContainer>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {driversLoading && drivers.length === 0 ? (
            <div className="rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
              Loading drivers...
            </div>
          ) : null}

          {!driversLoading && drivers.length === 0 ? (
            <div className="rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
              No drivers found.
            </div>
          ) : null}

          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">
                    {getDriverName(driver)}
                  </div>
                  <div className="mt-1 text-sm text-gray-400">
                    {getVehicleLabel(driver.vehicle ?? null)}
                  </div>
                </div>

                <div className="rounded-full bg-cyan-900/50 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {(driver.status || (driver.isAvailable ? 'AVAILABLE' : 'UNKNOWN')).replace(
                    /_/g,
                    ' ',
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-200">
                <div>
                  <span className="text-gray-500">Latitude:</span>{' '}
                  {driver.latitude ?? '—'}
                </div>
                <div>
                  <span className="text-gray-500">Longitude:</span>{' '}
                  {driver.longitude ?? '—'}
                </div>
                <div>
                  <span className="text-gray-500">Last GPS update:</span>{' '}
                  {formatDateTime(driver.lastLocationAt)}
                </div>
                <div>
                  <span className="text-gray-500">Duty:</span>{' '}
                  {driver.isOnDuty ? 'On duty' : 'Off duty'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8">
        <h2 className="mb-2 text-xl">Bookings</h2>

        {loading ? (
          <div>Loading...</div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className={`mb-3 rounded border p-4 ${
                selectedBooking?.id === b.id
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-white/10'
              }`}
            >
              <div className="font-bold">{b.reference}</div>
              <div className="text-sm text-gray-400">
                {getPickupLabel(b)} → {getDropoffLabel(b)}
              </div>
              {getPickupTimeLabel(b) ? (
                <div className="mt-1 text-sm text-gray-500">
                  Pickup: {formatDateTime(getPickupTimeLabel(b))}
                </div>
              ) : null}

              <div className="mt-2 text-sm">
                Status: {b.status} | Driver: {b.driver ? getDriverName(b.driver) : 'None'}
              </div>

              {b.suggestedDrivers?.length ? (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="mb-2 text-sm font-semibold text-emerald-300">
                    Suggested Drivers
                  </div>

                  <div className="space-y-2">
                    {b.suggestedDrivers.slice(0, 3).map((suggested, index) => {
                      const key = `${b.id}:${suggested.id}`;
                      return (
                        <div
                          key={suggested.id}
                          className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/20 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">
                              #{index + 1} {suggested.name}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {(suggested.status || 'UNKNOWN').replace(/_/g, ' ')} •{' '}
                              {getVehicleLabel(suggested.vehicle ?? null)}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              Score: {suggested.score ?? '—'} • Distance:{' '}
                              {formatDistance(suggested.distanceMiles)} • GPS:{' '}
                              {formatDateTime(suggested.lastLocationAt)}
                            </div>
                          </div>

                          <button
                            onClick={() => assignDriver(b.id, suggested.id)}
                            disabled={assigningKey === key}
                            className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {assigningKey === key ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => autoDispatch(b.id)}
                  disabled={autoDispatchingId === b.id}
                  className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
                >
                  {autoDispatchingId === b.id ? 'Running...' : 'Auto Dispatch'}
                </button>

                {drivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => assignDriver(b.id, d.id)}
                    disabled={assigningKey === `${b.id}:${d.id}`}
                    className="rounded bg-gray-700 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {assigningKey === `${b.id}:${d.id}`
                      ? 'Assigning...'
                      : getDriverName(d)}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setSelectedBooking(b);
                    void loadTimeline(b.id);
                  }}
                  className="rounded bg-purple-600 px-3 py-1"
                >
                  Timeline
                </button>

                <button
                  onClick={() => setSelectedBooking(b)}
                  className="rounded bg-cyan-700 px-3 py-1"
                >
                  Show on Map
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBooking && (
        <div className="mb-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <div className="text-lg font-semibold text-cyan-200">
            Selected Booking: {selectedBooking.reference}
          </div>
          <div className="mt-2 text-sm text-white/80">
            Pickup: {getPickupLabel(selectedBooking)}
          </div>
          <div className="mt-1 text-sm text-white/80">
            Dropoff: {getDropoffLabel(selectedBooking)}
          </div>
          <div className="mt-1 text-sm text-white/80">
            Pickup coords:{' '}
            {selectedBooking.pickupLatitude != null &&
            selectedBooking.pickupLongitude != null
              ? `${selectedBooking.pickupLatitude}, ${selectedBooking.pickupLongitude}`
              : 'Not available'}
          </div>
          <div className="mt-1 text-sm text-white/80">
            Dropoff coords:{' '}
            {selectedBooking.dropoffLatitude != null &&
            selectedBooking.dropoffLongitude != null
              ? `${selectedBooking.dropoffLatitude}, ${selectedBooking.dropoffLongitude}`
              : 'Not available'}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xl">Drivers</h2>

        {drivers.map((d) => (
          <div key={d.id} className="mb-2 rounded border p-3">
            {getDriverName(d)} -{' '}
            {d.isAvailable || d.status === 'AVAILABLE' ? 'Available' : 'Busy'}
            {d.latitude != null && d.longitude != null ? (
              <span className="ml-2 text-xs text-cyan-300">
                ({d.latitude}, {d.longitude})
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 p-10">
          <div className="mx-auto max-w-xl rounded bg-gray-900 p-6">
            <h2 className="mb-4 text-xl">
              Timeline - {selectedBooking.reference}
            </h2>

            {timeline.map((t) => (
              <div key={t.id} className="mb-2 text-sm">
                {new Date(t.createdAt).toLocaleTimeString()} - {t.type}
                {t.note ? ` (${t.note})` : ''}
              </div>
            ))}

            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-4 rounded bg-red-600 px-4 py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}