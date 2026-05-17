'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

type TrackingData = {
  reference: string;
  status: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupTime: string;
  quotedPrice?: number | null;
  pricingMode?: string | null;
  distanceMiles?: number | null;
  durationMinutes?: number | null;
  company?: {
    id: string;
    name: string;
  } | null;
  driver?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    heading?: number | null;
    speed?: number | null;
    lastLocationAt?: string | null;
    vehicle?: {
      reg?: string | null;
      plateNumber?: string | null;
      make?: string | null;
      model?: string | null;
      colour?: string | null;
    } | null;
  } | null;
  timeline?: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
};

type LatLngPoint = [number, number];

type RouteResponse = {
  distanceMiles: number;
  durationMinutes: number;
  coordinates: LatLngPoint[];
};

type JourneyRoute = {
  driverToPickup: LatLngPoint[];
  pickupToDropoff: LatLngPoint[];
  driverToPickupEta: number | null;
  pickupToDropoffEta: number | null;
  driverToPickupDistance: number | null;
  pickupToDropoffDistance: number | null;
};

const REFRESH_SECONDS = 8;

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value?: number | null) {
  if (value == null) return '—';
  return `£${Number(value).toFixed(2)}`;
}

function formatDistance(value?: number | null) {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)} miles`;
}

function statusLabel(status?: string | null) {
  return (status || 'UNKNOWN').replace(/_/g, ' ');
}

function statusTone(status?: string | null) {
  const normalised = (status || '').toUpperCase();

  if (['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(normalised)) {
    return {
      border: 'border-cyan-500/25',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-200',
      dot: 'bg-cyan-300',
    };
  }

  if (normalised === 'COMPLETED') {
    return {
      border: 'border-emerald-500/25',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-200',
      dot: 'bg-emerald-300',
    };
  }

  if (['CANCELLED', 'NO_SHOW'].includes(normalised)) {
    return {
      border: 'border-red-500/25',
      bg: 'bg-red-500/10',
      text: 'text-red-200',
      dot: 'bg-red-300',
    };
  }

  if (normalised === 'OFFERED') {
    return {
      border: 'border-amber-500/25',
      bg: 'bg-amber-500/10',
      text: 'text-amber-200',
      dot: 'bg-amber-300',
    };
  }

  return {
    border: 'border-white/10',
    bg: 'bg-white/5',
    text: 'text-white/75',
    dot: 'bg-white/50',
  };
}

function customerStatusMessage(status?: string | null) {
  const normalised = (status || '').toUpperCase();

  if (normalised === 'BOOKED') return 'Your booking is confirmed.';
  if (normalised === 'OFFERED') return 'We are offering your job to a driver.';
  if (normalised === 'ACCEPTED') return 'Your driver has accepted the booking.';
  if (normalised === 'EN_ROUTE') return 'Your driver is on the way to pickup.';
  if (normalised === 'ARRIVED') return 'Your driver has arrived at pickup.';
  if (normalised === 'ON_JOB') return 'You are on your journey.';
  if (normalised === 'COMPLETED') return 'This journey has been completed.';
  if (normalised === 'CANCELLED') return 'This booking has been cancelled.';
  if (normalised === 'NO_SHOW') return 'This booking has been marked no-show.';

  return 'Tracking is live.';
}

function journeyStep(status?: string | null) {
  const normalised = (status || '').toUpperCase();

  if (normalised === 'BOOKED') return 1;
  if (normalised === 'OFFERED') return 1;
  if (normalised === 'ACCEPTED') return 2;
  if (normalised === 'EN_ROUTE') return 3;
  if (normalised === 'ARRIVED') return 4;
  if (normalised === 'ON_JOB') return 5;
  if (normalised === 'COMPLETED') return 6;

  return 1;
}

function getTrackingReference(raw: unknown) {
  if (Array.isArray(raw)) return decodeURIComponent(raw[0] || '').trim();
  if (typeof raw === 'string') return decodeURIComponent(raw).trim();
  return '';
}

function isValidCoordinate(lat?: number | null, lng?: number | null) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function getGpsAgeSeconds(value?: string | null, now = Date.now()) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.max(0, Math.round((now - date.getTime()) / 1000));
}

function formatGpsAge(value?: string | null, now = Date.now()) {
  const seconds = getGpsAgeSeconds(value, now);

  if (seconds === Number.MAX_SAFE_INTEGER) return 'Waiting for GPS';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function makeCarIcon(heading?: number | null) {
  const rotation = heading ?? 0;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 50px;
        height: 50px;
        border-radius: 999px;
        background: radial-gradient(circle at 30% 20%, #67e8f9, #0891b2 42%, #0f172a);
        border: 3px solid white;
        box-shadow: 0 16px 38px rgba(0,0,0,0.55), 0 0 28px rgba(6,182,212,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${rotation}deg);
      ">
        <div style="
          font-size: 25px;
          line-height: 1;
          transform: rotate(${-rotation}deg);
        ">🚕</div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
  });
}

function makePinIcon(label: string, colour: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: ${colour};
        border: 3px solid white;
        box-shadow: 0 14px 32px rgba(0,0,0,0.5), 0 0 22px ${colour};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        ${label}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function FitMapBounds({ points }: { points: LatLngPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 15, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [55, 55],
      animate: true,
      maxZoom: 15,
    });
  }, [points, map]);

  return null;
}

async function fetchRoute(
  from: LatLngPoint | null,
  to: LatLngPoint | null,
): Promise<RouteResponse | null> {
  if (!from || !to) return null;

  try {
    const route = await apiFetch<RouteResponse>(
      `/locations/route?fromLat=${encodeURIComponent(String(from[0]))}&fromLng=${encodeURIComponent(
        String(from[1]),
      )}&toLat=${encodeURIComponent(String(to[0]))}&toLng=${encodeURIComponent(String(to[1]))}`,
      {
        method: 'GET',
      },
      {
        publicRequest: true,
        suppressAutoClear: true,
      },
    );

    return route;
  } catch {
    return null;
  }
}

function LiveDriverMap({
  data,
  vehicle,
  route,
  now,
}: {
  data: TrackingData;
  vehicle: string;
  route: JourneyRoute;
  now: number;
}) {
  const driverLat = data.driver?.latitude ?? null;
  const driverLng = data.driver?.longitude ?? null;
  const pickupLat = data.pickupLat ?? null;
  const pickupLng = data.pickupLng ?? null;
  const dropoffLat = data.dropoffLat ?? null;
  const dropoffLng = data.dropoffLng ?? null;

  const hasDriver = isValidCoordinate(driverLat, driverLng);
  const hasPickup = isValidCoordinate(pickupLat, pickupLng);
  const hasDropoff = isValidCoordinate(dropoffLat, dropoffLng);

  const driverPoint: LatLngPoint | null = hasDriver
    ? [driverLat as number, driverLng as number]
    : null;

  const pickupPoint: LatLngPoint | null = hasPickup
    ? [pickupLat as number, pickupLng as number]
    : null;

  const dropoffPoint: LatLngPoint | null = hasDropoff
    ? [dropoffLat as number, dropoffLng as number]
    : null;

  const mapPoints = useMemo(() => {
    return [
      driverPoint,
      pickupPoint,
      dropoffPoint,
      ...route.driverToPickup,
      ...route.pickupToDropoff,
    ].filter(Boolean) as LatLngPoint[];
  }, [driverPoint, pickupPoint, dropoffPoint, route.driverToPickup, route.pickupToDropoff]);

  const carIcon = useMemo(
    () => makeCarIcon(data.driver?.heading ?? null),
    [data.driver?.heading],
  );

  const pickupIcon = useMemo(() => makePinIcon('P', '#0891b2'), []);
  const dropoffIcon = useMemo(() => makePinIcon('D', '#059669'), []);

  const fallbackCenter: LatLngPoint =
    driverPoint || pickupPoint || dropoffPoint || [51.5072, -0.1276];

  if (!hasDriver && !hasPickup && !hasDropoff) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
        <h2 className="text-xl font-black">Live map</h2>
        <p className="mt-3 text-white/60">
          Waiting for GPS and journey coordinates.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0b1220] shadow-[0_0_55px_rgba(6,182,212,0.08)]">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Live journey map</h2>
          <p className="mt-1 text-sm text-white/50">
            Driver, pickup, dropoff and route updated automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            GPS {formatGpsAge(data.driver?.lastLocationAt, now)}
          </div>

          {route.driverToPickupEta != null ? (
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
              ETA {route.driverToPickupEta} mins
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-[400px] w-full overflow-hidden bg-black md:h-[480px]">
        <MapContainer
          center={fallbackCenter}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMapBounds points={mapPoints} />

          {route.driverToPickup.length >= 2 ? (
            <Polyline
              positions={route.driverToPickup}
              pathOptions={{
                color: '#06b6d4',
                weight: 5,
                opacity: 0.9,
              }}
            />
          ) : driverPoint && pickupPoint ? (
            <Polyline
              positions={[driverPoint, pickupPoint]}
              pathOptions={{
                color: '#06b6d4',
                weight: 4,
                opacity: 0.5,
                dashArray: '8 8',
              }}
            />
          ) : null}

          {route.pickupToDropoff.length >= 2 ? (
            <Polyline
              positions={route.pickupToDropoff}
              pathOptions={{
                color: '#22c55e',
                weight: 5,
                opacity: 0.85,
              }}
            />
          ) : pickupPoint && dropoffPoint ? (
            <Polyline
              positions={[pickupPoint, dropoffPoint]}
              pathOptions={{
                color: '#22c55e',
                weight: 4,
                opacity: 0.5,
                dashArray: '8 8',
              }}
            />
          ) : null}

          {pickupPoint ? (
            <Marker position={pickupPoint} icon={pickupIcon}>
              <Popup>
                <div>
                  <strong>Pickup</strong>
                  <br />
                  {data.pickup}
                </div>
              </Popup>
            </Marker>
          ) : null}

          {dropoffPoint ? (
            <Marker position={dropoffPoint} icon={dropoffIcon}>
              <Popup>
                <div>
                  <strong>Dropoff</strong>
                  <br />
                  {data.dropoff}
                </div>
              </Popup>
            </Marker>
          ) : null}

          {driverPoint ? (
            <Marker position={driverPoint} icon={carIcon}>
              <Popup>
                <div>
                  <strong>{data.driver?.name || 'Driver'}</strong>
                  <br />
                  {vehicle}
                  <br />
                  Last update: {formatGpsAge(data.driver?.lastLocationAt, now)}
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

      <div className="grid gap-3 p-6 text-sm text-white/60 md:grid-cols-4">
        <MetricTile
          label="Driver to pickup"
          value={
            route.driverToPickupEta != null
              ? `${route.driverToPickupEta} mins`
              : 'Waiting'
          }
          hint={formatDistance(route.driverToPickupDistance)}
        />
        <MetricTile
          label="Pickup to dropoff"
          value={
            route.pickupToDropoffEta != null
              ? `${route.pickupToDropoffEta} mins`
              : data.durationMinutes != null
                ? `${data.durationMinutes} mins`
                : 'Waiting'
          }
          hint={formatDistance(route.pickupToDropoffDistance ?? data.distanceMiles)}
        />
        <MetricTile
          label="Pickup pin"
          value={pickupPoint ? 'Ready' : 'Missing'}
          hint={pickupPoint ? `${pickupPoint[0].toFixed(5)}, ${pickupPoint[1].toFixed(5)}` : 'No coordinates'}
        />
        <MetricTile
          label="GPS update"
          value={formatGpsAge(data.driver?.lastLocationAt, now)}
          hint={formatDateTime(data.driver?.lastLocationAt)}
        />
      </div>

      <div className="flex flex-wrap gap-3 px-6 pb-6">
        {driverPoint ? (
          <a
            href={`https://www.google.com/maps?q=${driverPoint[0]},${driverPoint[1]}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Open driver location
          </a>
        ) : null}

        {pickupPoint ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${pickupPoint[0]},${pickupPoint[1]}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Navigate to pickup
          </a>
        ) : null}
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 font-black text-white">{value}</div>
      {hint && hint !== '—' ? (
        <div className="mt-1 text-xs text-white/40">{hint}</div>
      ) : null}
    </div>
  );
}

function JourneyProgress({ status }: { status: string }) {
  const step = journeyStep(status);

  const steps = [
    { key: 1, label: 'Booked' },
    { key: 2, label: 'Accepted' },
    { key: 3, label: 'En route' },
    { key: 4, label: 'Arrived' },
    { key: 5, label: 'On job' },
    { key: 6, label: 'Complete' },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
      <h2 className="text-xl font-black">Journey progress</h2>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        {steps.map((item) => {
          const active = item.key <= step;

          return (
            <div
              key={item.key}
              className={`rounded-2xl border p-4 text-center ${
                active
                  ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100'
                  : 'border-white/10 bg-black/20 text-white/35'
              }`}
            >
              <div
                className={`mx-auto mb-3 h-3 w-3 rounded-full ${
                  active ? 'bg-cyan-300' : 'bg-white/20'
                }`}
              />
              <div className="text-xs font-black uppercase tracking-[0.13em]">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TrackingPage() {
  const params = useParams();
  const reference = getTrackingReference(params?.reference);

  const [data, setData] = useState<TrackingData | null>(null);
  const [route, setRoute] = useState<JourneyRoute>({
    driverToPickup: [],
    pickupToDropoff: [],
    driverToPickupEta: null,
    pickupToDropoffEta: null,
    driverToPickupDistance: null,
    pickupToDropoffDistance: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const loadTracking = useCallback(async () => {
    if (!reference) {
      setError('Missing booking reference');
      setLoading(false);
      return;
    }

    try {
      setError('');
      setRefreshing(true);

      const tracking = await apiFetch<TrackingData>(
        `/bookings/track/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
        },
        {
          publicRequest: true,
          suppressAutoClear: true,
        },
      );

      setData(tracking);
      setLoading(false);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Tracking unavailable');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [reference]);

  useEffect(() => {
    void loadTracking();

    const interval = window.setInterval(() => {
      void loadTracking();
    }, REFRESH_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadTracking]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      if (!data) {
        setRoute({
          driverToPickup: [],
          pickupToDropoff: [],
          driverToPickupEta: null,
          pickupToDropoffEta: null,
          driverToPickupDistance: null,
          pickupToDropoffDistance: null,
        });
        return;
      }

      const driverPoint: LatLngPoint | null = isValidCoordinate(
        data.driver?.latitude ?? null,
        data.driver?.longitude ?? null,
      )
        ? [data.driver?.latitude as number, data.driver?.longitude as number]
        : null;

      const pickupPoint: LatLngPoint | null = isValidCoordinate(
        data.pickupLat ?? null,
        data.pickupLng ?? null,
      )
        ? [data.pickupLat as number, data.pickupLng as number]
        : null;

      const dropoffPoint: LatLngPoint | null = isValidCoordinate(
        data.dropoffLat ?? null,
        data.dropoffLng ?? null,
      )
        ? [data.dropoffLat as number, data.dropoffLng as number]
        : null;

      const [driverToPickup, pickupToDropoff] = await Promise.all([
        fetchRoute(driverPoint, pickupPoint),
        fetchRoute(pickupPoint, dropoffPoint),
      ]);

      if (cancelled) return;

      setRoute({
        driverToPickup: Array.isArray(driverToPickup?.coordinates)
          ? driverToPickup.coordinates
          : [],
        pickupToDropoff: Array.isArray(pickupToDropoff?.coordinates)
          ? pickupToDropoff.coordinates
          : [],
        driverToPickupEta: driverToPickup?.durationMinutes ?? null,
        pickupToDropoffEta: pickupToDropoff?.durationMinutes ?? null,
        driverToPickupDistance: driverToPickup?.distanceMiles ?? null,
        pickupToDropoffDistance: pickupToDropoff?.distanceMiles ?? null,
      });
    }

    void loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [
    data?.driver?.latitude,
    data?.driver?.longitude,
    data?.pickupLat,
    data?.pickupLng,
    data?.dropoffLat,
    data?.dropoffLng,
  ]);

  const vehicle = useMemo(() => {
    if (!data?.driver?.vehicle) return 'Vehicle details pending';

    return [
      data.driver.vehicle.colour,
      data.driver.vehicle.make,
      data.driver.vehicle.model,
      data.driver.vehicle.reg || data.driver.vehicle.plateNumber,
    ]
      .filter(Boolean)
      .join(' ');
  }, [data]);

  const tone = statusTone(data?.status);
  const driverPhone = data?.driver?.phone?.trim() || '';

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading tracking...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070c] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-black">Tracking unavailable</h1>

          <p className="mt-3 text-red-100">{error}</p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/50">
            Ref checked: {reference || 'No reference'}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#05070c] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
          No tracking data found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-5 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className={`rounded-3xl border ${tone.border} ${tone.bg} p-6`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                CabHQ Live Tracking
              </div>

              <h1 className="mt-3 text-4xl font-black">{data.reference}</h1>

              {data.company?.name ? (
                <p className="mt-2 text-sm font-semibold text-white/55">
                  {data.company.name}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border ${tone.border} ${tone.bg} px-4 py-2 text-sm font-black ${tone.text}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  {statusLabel(data.status)}
                </div>

                <div className="inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white/70">
                  Refreshes every {REFRESH_SECONDS}s
                </div>

                {refreshing ? (
                  <div className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200">
                    Updating...
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:min-w-[240px]">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                Current update
              </div>
              <div className="mt-2 text-lg font-black">
                {customerStatusMessage(data.status)}
              </div>
              <div className="mt-2 text-sm text-white/50">
                Pickup {formatTimeOnly(data.pickupTime)}
              </div>
            </div>
          </div>
        </section>

        <JourneyProgress status={data.status} />

        <LiveDriverMap data={data} vehicle={vehicle} route={route} now={now} />

        <section className="grid gap-5 md:grid-cols-3">
          <MetricTile
            label="Pickup time"
            value={formatDateTime(data.pickupTime)}
          />
          <MetricTile
            label="Quoted fare"
            value={formatPrice(data.quotedPrice)}
            hint={data.pricingMode || undefined}
          />
          <MetricTile
            label="Journey distance"
            value={formatDistance(route.pickupToDropoffDistance ?? data.distanceMiles)}
            hint={
              route.pickupToDropoffEta != null
                ? `${route.pickupToDropoffEta} mins estimated`
                : data.durationMinutes != null
                  ? `${data.durationMinutes} mins estimated`
                  : undefined
            }
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
          <h2 className="text-xl font-black">Journey</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <JourneyAddress label="Pickup" value={data.pickup} />
            <JourneyAddress label="Dropoff" value={data.dropoff} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
          <h2 className="text-xl font-black">Driver</h2>

          {data.driver ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-2xl font-black">
                  {data.driver.name || 'Driver assigned'}
                </div>

                <div className="mt-2 text-white/60">{vehicle}</div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111f] p-4 text-sm text-white/60">
                  Last GPS update: {formatGpsAge(data.driver.lastLocationAt, now)}
                  <br />
                  <span className="text-xs text-white/35">
                    {formatDateTime(data.driver.lastLocationAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {driverPhone ? (
                  <a
                    href={`tel:${driverPhone}`}
                    className="inline-flex justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                  >
                    Call driver
                  </a>
                ) : null}

                {data.driver.latitude != null && data.driver.longitude != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${data.driver.latitude},${data.driver.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    Open map
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-white/60">
              A driver has not been assigned yet. Tracking will update automatically.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
          <h2 className="text-xl font-black">Timeline</h2>

          {data.timeline?.length ? (
            <div className="mt-5 space-y-3">
              {data.timeline.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-sm font-semibold text-white/85">
                    {event.message}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-white/50">No updates yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function JourneyAddress({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-3 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
