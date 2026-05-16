'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  MapContainer,
  Marker,
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

function makeCarIcon(heading?: number | null) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: linear-gradient(135deg, #06b6d4, #0f172a);
        border: 3px solid white;
        box-shadow: 0 12px 30px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading ?? 0}deg);
      ">
        <div style="
          font-size: 24px;
          line-height: 1;
          transform: rotate(${-(heading ?? 0)}deg);
        ">🚕</div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -22],
  });
}

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom() || 15, {
      animate: true,
    });
  }, [latitude, longitude, map]);

  return null;
}

function LiveDriverMap({
  data,
  vehicle,
}: {
  data: TrackingData;
  vehicle: string;
}) {
  const latitude = data.driver?.latitude;
  const longitude = data.driver?.longitude;
  const heading = data.driver?.heading ?? null;

  const carIcon = useMemo(() => makeCarIcon(heading), [heading]);

  if (latitude == null || longitude == null) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
        <h2 className="text-xl font-black">Live map</h2>
        <p className="mt-3 text-white/60">
          Waiting for the driver app to send GPS location.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0b1220]">
      <div className="flex items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-xl font-black">Live map</h2>
          <p className="mt-1 text-sm text-white/50">
            Updates automatically every 10 seconds
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
          GPS Live
        </div>
      </div>

      <div className="h-[360px] w-full overflow-hidden bg-black md:h-[430px]">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap latitude={latitude} longitude={longitude} />

          <Marker position={[latitude, longitude]} icon={carIcon}>
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
        </MapContainer>
      </div>

      <div className="grid gap-3 p-6 text-sm text-white/60 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Current Coordinates
          </div>
          <div className="mt-2 font-bold text-white">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
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

      <div className="px-6 pb-6">
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200"
        >
          Open driver location in Google Maps
        </a>
      </div>
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