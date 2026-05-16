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

function statusLabel(status?: string | null) {
  return (status || 'UNKNOWN').replace(/_/g, ' ');
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

function makeCarIcon(heading?: number | null) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: linear-gradient(135deg, #06b6d4, #0f172a);
        border: 3px solid white;
        box-shadow: 0 14px 34px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading ?? 0}deg);
      ">
        <div style="
          font-size: 25px;
          line-height: 1;
          transform: rotate(${-(heading ?? 0)}deg);
        ">🚕</div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

function makePinIcon(label: string, colour: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 999px;
        background: ${colour};
        border: 3px solid white;
        box-shadow: 0 12px 28px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 21px;
      ">
        ${label}
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
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
      padding: [45, 45],
      animate: true,
      maxZoom: 15,
    });
  }, [points, map]);

  return null;
}

function LiveDriverMap({
  data,
  vehicle,
}: {
  data: TrackingData;
  vehicle: string;
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
    return [driverPoint, pickupPoint, dropoffPoint].filter(Boolean) as LatLngPoint[];
  }, [driverPoint, pickupPoint, dropoffPoint]);

  const routePoints = useMemo(() => {
    return [driverPoint, pickupPoint, dropoffPoint].filter(Boolean) as LatLngPoint[];
  }, [driverPoint, pickupPoint, dropoffPoint]);

  const carIcon = useMemo(
    () => makeCarIcon(data.driver?.heading ?? null),
    [data.driver?.heading],
  );

  const pickupIcon = useMemo(() => makePinIcon('📍', '#0891b2'), []);
  const dropoffIcon = useMemo(() => makePinIcon('🏁', '#059669'), []);

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
    <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0b1220]">
      <div className="flex items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-xl font-black">Live journey map</h2>
          <p className="mt-1 text-sm text-white/50">
            Driver, pickup and dropoff shown live
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
          GPS Live
        </div>
      </div>

      <div className="h-[390px] w-full overflow-hidden bg-black md:h-[460px]">
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

          {routePoints.length >= 2 ? (
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#06b6d4',
                weight: 5,
                opacity: 0.85,
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
                  Last update: {formatDateTime(data.driver?.lastLocationAt)}
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

      <div className="grid gap-3 p-6 text-sm text-white/60 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Driver
          </div>
          <div className="mt-2 font-bold text-white">
            {driverPoint
              ? `${driverPoint[0].toFixed(5)}, ${driverPoint[1].toFixed(5)}`
              : 'Waiting for GPS'}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Pickup Pin
          </div>
          <div className="mt-2 font-bold text-white">
            {pickupPoint ? 'Available' : 'No coordinates'}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Last GPS Update
          </div>
          <div className="mt-2 font-bold text-white">
            {formatDateTime(data.driver?.lastLocationAt)}
          </div>
        </div>
      </div>

      {driverPoint ? (
        <div className="px-6 pb-6">
          <a
            href={`https://www.google.com/maps?q=${driverPoint[0]},${driverPoint[1]}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200"
          >
            Open driver location in Google Maps
          </a>
        </div>
      ) : null}
    </section>
  );
}

export default function TrackingPage() {
  const params = useParams();
  const reference = getTrackingReference(params?.reference);

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTracking = useCallback(async () => {
    if (!reference) {
      setError('Missing booking reference');
      setLoading(false);
      return;
    }

    try {
      setError('');

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
    }
  }, [reference]);

  useEffect(() => {
    void loadTracking();

    const interval = window.setInterval(() => {
      void loadTracking();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadTracking]);

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
    <main className="min-h-screen bg-[#05070c] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-3xl border border-cyan-500/20 bg-[#0b1220] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
            CabHQ Live Tracking
          </div>

          <h1 className="mt-3 text-3xl font-black">{data.reference}</h1>

          {data.company?.name ? (
            <p className="mt-2 text-sm font-semibold text-white/50">
              {data.company.name}
            </p>
          ) : null}

          <div className="mt-4 inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200">
            {statusLabel(data.status)}
          </div>
        </section>

        <LiveDriverMap data={data} vehicle={vehicle} />

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
          <h2 className="text-xl font-black">Journey</h2>

          <div className="mt-5 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                Pickup
              </div>
              <div className="mt-1 text-lg font-bold">{data.pickup}</div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                Dropoff
              </div>
              <div className="mt-1 text-lg font-bold">{data.dropoff}</div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                Pickup time
              </div>
              <div className="mt-1 text-lg font-bold">
                {formatDateTime(data.pickupTime)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
          <h2 className="text-xl font-black">Driver</h2>

          {data.driver ? (
            <div className="mt-5 space-y-3">
              <div className="text-2xl font-black">
                {data.driver.name || 'Driver assigned'}
              </div>

              <div className="text-white/60">{vehicle}</div>

              {data.driver.phone ? (
                <a
                  href={`tel:${data.driver.phone}`}
                  className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
                >
                  Call driver
                </a>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                Last GPS update: {formatDateTime(data.driver.lastLocationAt)}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-white/60">
              A driver has not been assigned yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}