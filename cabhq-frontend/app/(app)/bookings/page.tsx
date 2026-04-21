'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  }

  if (normalized === 'BOOKED' || normalized === 'OFFERED') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  }

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25';
  }

  return 'bg-slate-500/15 text-slate-300 border-slate-500/25';
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
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              CabHQ
            </div>
            <h1 className="mt-1 text-2xl font-bold">Bookings</h1>
            <p className="mt-1 text-sm text-slate-400">
              Search, review and manage all bookings across dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleRefresh()}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d1120] p-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

            <div className="w-full xl:w-[360px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ref, customer, phone, route, driver..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="hidden grid-cols-[130px_180px_1.8fr_140px_150px_110px] gap-3 border-b border-white/10 px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 xl:grid">
            <div>Reference</div>
            <div>Pickup Time</div>
            <div>Route</div>
            <div>Status</div>
            <div>Driver</div>
            <div>Fare</div>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                No bookings found.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <div className="grid gap-3 xl:grid-cols-[130px_180px_1.8fr_140px_150px_110px] xl:items-center">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {booking.reference}
                      </div>
                      <div className="text-xs text-slate-500">
                        {booking.customerName || 'No customer name'}
                      </div>
                    </div>

                    <div className="text-sm text-slate-300">
                      {formatDateTime(getPickupTimeLabel(booking))}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">
                        {getPickupLabel(booking)}
                      </div>
                      <div className="truncate text-sm text-slate-400">
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

                    <div className="text-sm text-slate-300">
                      {getDriverName(booking.driver)}
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {formatPrice(booking.quotedPrice)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
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
    </main>
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
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}