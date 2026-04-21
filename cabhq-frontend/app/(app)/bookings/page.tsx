'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  status?: string;
};

type Booking = {
  id: string;
  reference: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickup?: string;
  dropoff?: string;
  pickupAt?: string;
  pickupTime?: string;
  status: string;
  quotedPrice?: number | null;
  passengerCount?: number | null;
  notes?: string | null;
  driverId?: string | null;
  driver?: Driver | null;
  createdAt?: string;
};

type BookingTab = 'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

function getDriverName(driver?: Driver | null) {
  if (!driver) return 'Unassigned';
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

function formatPrice(value?: number | null) {
  if (value == null) return '—';
  return `£${value.toFixed(2)}`;
}

function statusTone(status?: string) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (normalized === 'BOOKED' || normalized === 'OFFERED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }

  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function isCompleted(status?: string) {
  return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
    (status || '').toUpperCase(),
  );
}

function isCancelled(status?: string) {
  return ['CANCELLED', 'NO_SHOW'].includes((status || '').toUpperCase());
}

function isLive(status?: string) {
  return !isCompleted(status);
}

function isScheduled(status?: string) {
  return ['BOOKED', 'OFFERED'].includes((status || '').toUpperCase());
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<BookingTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadBookings = useCallback(async () => {
    if (!token) return;

    const response = await fetch(`${API_URL}/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to load bookings (${response.status})`);
    }

    const data = (await response.json()) as Booking[];
    setBookings(Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      try {
        setLoading(true);
        await loadBookings();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token, loadBookings]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      void loadBookings();
    }, 10000);

    return () => clearInterval(interval);
  }, [token, loadBookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    let items = [...bookings];

    if (activeTab === 'LIVE') {
      items = items.filter((booking) => isLive(booking.status));
    } else if (activeTab === 'SCHEDULED') {
      items = items.filter((booking) => isScheduled(booking.status));
    } else if (activeTab === 'COMPLETED') {
      items = items.filter(
        (booking) => (booking.status || '').toUpperCase() === 'COMPLETED',
      );
    } else if (activeTab === 'CANCELLED') {
      items = items.filter((booking) => isCancelled(booking.status));
    }

    if (!q) return items;

    return items.filter((booking) => {
      return [
        booking.reference,
        booking.customerName,
        booking.customerPhone,
        getPickupLabel(booking),
        getDropoffLabel(booking),
        getDriverName(booking.driver),
        booking.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [bookings, activeTab, search]);

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      live: bookings.filter((b) => isLive(b.status)).length,
      scheduled: bookings.filter((b) => isScheduled(b.status)).length,
      completed: bookings.filter(
        (b) => (b.status || '').toUpperCase() === 'COMPLETED',
      ).length,
      cancelled: bookings.filter((b) => isCancelled(b.status)).length,
    };
  }, [bookings]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadBookings();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AdminShell
      title="Bookings"
      subtitle="Search, review and manage all bookings across the business"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Booking Control
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Booking management in one place
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Search bookings, review statuses, track assignment state and
                keep a clean overview of live, scheduled and completed work.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleRefresh()}
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Bookings'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="All Bookings" value={counts.all} hint="Every booking record" tone="slate" />
          <StatCard label="Live" value={counts.live} hint="Open and active jobs" tone="cyan" />
          <StatCard label="Scheduled" value={counts.scheduled} hint="Booked or offered" tone="amber" />
          <StatCard label="Completed" value={counts.completed} hint="Finished jobs" tone="emerald" />
          <StatCard label="Cancelled" value={counts.cancelled} hint="Cancelled or no-show" tone="red" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === 'ALL'}
                label={`All (${counts.all})`}
                onClick={() => setActiveTab('ALL')}
              />
              <TabButton
                active={activeTab === 'LIVE'}
                label={`Live (${counts.live})`}
                onClick={() => setActiveTab('LIVE')}
              />
              <TabButton
                active={activeTab === 'SCHEDULED'}
                label={`Scheduled (${counts.scheduled})`}
                onClick={() => setActiveTab('SCHEDULED')}
              />
              <TabButton
                active={activeTab === 'COMPLETED'}
                label={`Completed (${counts.completed})`}
                onClick={() => setActiveTab('COMPLETED')}
              />
              <TabButton
                active={activeTab === 'CANCELLED'}
                label={`Cancelled (${counts.cancelled})`}
                onClick={() => setActiveTab('CANCELLED')}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ref, customer, phone, route, driver..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 sm:w-[360px]"
              />
            </div>
          </div>

          <div className="hidden grid-cols-[150px_190px_1.8fr_150px_170px_120px] gap-3 border-b border-white/10 px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 xl:grid">
            <div>Reference</div>
            <div>Pickup Time</div>
            <div>Route</div>
            <div>Status</div>
            <div>Driver</div>
            <div>Fare</div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
                No bookings found.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 transition hover:border-white/15 hover:bg-[#0d1a2d]"
                >
                  <div className="grid gap-4 xl:grid-cols-[150px_190px_1.8fr_150px_170px_120px] xl:items-center">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {booking.reference}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {booking.customerName || 'No customer name'}
                      </div>
                    </div>

                    <div className="text-sm text-white/80">
                      {formatDateTime(getPickupTimeLabel(booking))}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">
                        {getPickupLabel(booking)}
                      </div>
                      <div className="truncate text-sm text-white/50">
                        → {getDropoffLabel(booking)}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          booking.status,
                        )}`}
                      >
                        {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-sm text-white/80">
                      {getDriverName(booking.driver)}
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {formatPrice(booking.quotedPrice)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5 pt-4 text-xs text-white/50">
                    <span>Phone: {booking.customerPhone || '—'}</span>
                    <span>Passengers: {booking.passengerCount ?? '—'}</span>
                    <span>Created: {formatDateTime(booking.createdAt)}</span>
                    {booking.notes ? <span>Notes: {booking.notes}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: 'slate' | 'cyan' | 'amber' | 'emerald' | 'red';
}) {
  const toneMap = {
    slate: 'from-slate-500/10 to-transparent border-white/10',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    red: 'from-red-500/10 to-transparent border-red-500/20',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-cyan-500 text-black'
          : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}