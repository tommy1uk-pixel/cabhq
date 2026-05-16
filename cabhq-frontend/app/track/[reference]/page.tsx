'use client';

import { useEffect, useMemo, useState } from 'react';

type TrackingData = {
  reference: string;
  status: string;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  quotedPrice?: number | null;
  pricingMode?: string | null;
  driver?: {
    name?: string | null;
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    lastLocationAt?: string | null;
    vehicle?: {
      reg?: string | null;
      make?: string | null;
      model?: string | null;
      colour?: string | null;
    } | null;
  } | null;
};

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

function statusLabel(status?: string) {
  return (status || 'UNKNOWN').replace(/_/g, ' ');
}

export default function TrackingPage({
  params,
}: {
  params: { reference: string };
}) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    async function load() {
      try {
        setError('');

        const res = await fetch(
          `${apiUrl}/bookings/track/${encodeURIComponent(params.reference)}`,
          { cache: 'no-store' },
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || 'Tracking not found');
        }

        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tracking failed');
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 10000);

    return () => window.clearInterval(interval);
  }, [apiUrl, params.reference]);

  const vehicle = useMemo(() => {
    if (!data?.driver?.vehicle) return 'Vehicle details pending';

    return [
      data.driver.vehicle.colour,
      data.driver.vehicle.make,
      data.driver.vehicle.model,
      data.driver.vehicle.reg,
    ]
      .filter(Boolean)
      .join(' ');
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070c] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-black">Tracking unavailable</h1>
          <p className="mt-3 text-red-100">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#05070c] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading tracking...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-5 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="rounded-3xl border border-cyan-500/20 bg-[#0b1220] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
            CabHQ Live Tracking
          </div>

          <h1 className="mt-3 text-3xl font-black">{data.reference}</h1>

          <div className="mt-4 inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200">
            {statusLabel(data.status)}
          </div>
        </section>

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
              <div className="text-2xl font-black">{data.driver.name}</div>
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

        {data.driver?.latitude != null && data.driver?.longitude != null ? (
          <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-6">
            <h2 className="text-xl font-black">Live location</h2>
            <a
              href={`https://www.google.com/maps?q=${data.driver.latitude},${data.driver.longitude}`}
              target="_blank"
              className="mt-4 inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200"
            >
              Open driver location
            </a>
          </section>
        ) : null}
      </div>
    </main>
  );
}