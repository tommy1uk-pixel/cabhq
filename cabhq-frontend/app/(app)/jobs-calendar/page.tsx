'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type JobStatus =
  | 'BOOKED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ON_JOB'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'NO_DRIVER';

type CalendarJob = {
  id: string;
  reference: string;
  customerName?: string | null;
  pickup?: string | null;
  pickupAddress?: string | null;
  dropoff?: string | null;
  dropoffAddress?: string | null;
  pickupAt?: string | null;
  pickupTime?: string | null;
  status: JobStatus;
  driverName?: string | null;
  driver?: {
    name?: string | null;
  } | null;
  quotedPrice?: number | null;
  calculatedFare?: number | null;
  fare?: number | null;
  price?: number | null;
  pricing?: {
    quotedPrice?: number | null;
    calculatedFare?: number | null;
  } | null;
  notes?: string | null;
};

const initialJobs: CalendarJob[] = [
  {
    id: '1',
    reference: 'CAB-250421-1001',
    customerName: 'John Smith',
    pickup: 'Heathrow Terminal 3',
    dropoff: 'Paddington Station',
    pickupAt: '2026-04-21T08:30:00',
    status: 'BOOKED',
    driverName: null,
    quotedPrice: 68,
  },
  {
    id: '2',
    reference: 'CAB-250421-1002',
    customerName: 'Sarah Khan',
    pickup: 'Northside Medical Centre',
    dropoff: 'St Thomas Hospital',
    pickupAt: '2026-04-21T10:00:00',
    status: 'ACCEPTED',
    driverName: 'Imran Patel',
    quotedPrice: 24,
  },
  {
    id: '3',
    reference: 'CAB-250421-1003',
    customerName: 'Greenfield School',
    pickup: 'Greenfield School',
    dropoff: 'Hillcrest Estate',
    pickupAt: '2026-04-21T15:15:00',
    status: 'BOOKED',
    driverName: null,
    quotedPrice: 18,
  },
  {
    id: '4',
    reference: 'CAB-250421-1004',
    customerName: 'City Stay Hotel',
    pickup: 'City Stay Hotel',
    dropoff: 'Birmingham Airport',
    pickupAt: '2026-04-21T18:45:00',
    status: 'EN_ROUTE',
    driverName: 'David Ali',
    quotedPrice: 54,
  },
  {
    id: '5',
    reference: 'CAB-250421-1005',
    customerName: 'Lucy Brown',
    pickup: 'King Street',
    dropoff: 'Victoria Coach Station',
    pickupAt: '2026-04-22T07:10:00',
    status: 'COMPLETED',
    driverName: 'M Aslam',
    quotedPrice: 16.5,
  },
];

function getBookingPrice(job: CalendarJob | null | undefined) {
  return (
    job?.quotedPrice ??
    job?.pricing?.quotedPrice ??
    job?.calculatedFare ??
    job?.pricing?.calculatedFare ??
    job?.fare ??
    job?.price ??
    null
  );
}

function getPickup(job: CalendarJob) {
  return job.pickupAddress || job.pickup || '—';
}

function getDropoff(job: CalendarJob) {
  return job.dropoffAddress || job.dropoff || '—';
}

function getPickupAt(job: CalendarJob) {
  return job.pickupAt || job.pickupTime || '';
}

function getDriverName(job: CalendarJob) {
  return job.driverName || job.driver?.name || null;
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return `£${Number(value).toFixed(2)}`;
}

function formatDateHeading(date: string) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return 'Invalid date';
  }

  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(value?: string | null) {
  if (!value) return '—';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: JobStatus) {
  if (status === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'CANCELLED' || status === 'NO_SHOW') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (status === 'BOOKED' || status === 'OFFERED' || status === 'NO_DRIVER') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
}

export default function JobsCalendarPage() {
  const [jobs] = useState<CalendarJob[]>(initialJobs);
  const [selectedDate, setSelectedDate] = useState('2026-04-21');
  const [search, setSearch] = useState('');

  const groupedJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const pickupAt = getPickupAt(job);
      const matchesDate = pickupAt.slice(0, 10) === selectedDate;
      const q = search.trim().toLowerCase();

      if (!matchesDate) return false;
      if (!q) return true;

      return [
        job.reference,
        job.customerName ?? '',
        getPickup(job),
        getDropoff(job),
        getDriverName(job) ?? '',
        job.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    return filtered.sort(
      (a, b) =>
        new Date(getPickupAt(a)).getTime() - new Date(getPickupAt(b)).getTime(),
    );
  }, [jobs, search, selectedDate]);

  const stats = useMemo(() => {
    const dayJobs = jobs.filter(
      (job) => getPickupAt(job).slice(0, 10) === selectedDate,
    );

    return {
      total: dayJobs.length,
      live: dayJobs.filter((job) =>
        ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(job.status),
      ).length,
      booked: dayJobs.filter((job) => job.status === 'BOOKED').length,
      revenue: dayJobs.reduce(
        (sum, job) => sum + Number(getBookingPrice(job) ?? 0),
        0,
      ),
    };
  }, [jobs, selectedDate]);

  return (
    <AdminShell
      title="Jobs Calendar"
      subtitle="Daily dispatch planning, scheduled work, driver allocation and timeline visibility."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Jobs" value={stats.total} />
          <StatCard label="Live" value={stats.live} />
          <StatCard label="Booked" value={stats.booked} />
          <StatCard label="Day Revenue" value={formatCurrency(stats.revenue)} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Daily Planner</h2>
              <p className="mt-1 text-sm text-white/60">
                View all jobs by date in dispatch order.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="text-sm text-cyan-200">
              {formatDateHeading(selectedDate)}
            </div>
          </div>

          {groupedJobs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/60">
              No jobs found for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {groupedJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-black/30 px-3 py-1 text-sm font-semibold text-white">
                          {formatTime(getPickupAt(job))}
                        </span>

                        <span className="text-lg font-bold text-white">
                          {job.reference}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            job.status,
                          )}`}
                        >
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-white">
                        {job.customerName || 'No customer name'}
                      </p>

                      <p className="mt-2 text-sm text-white/75">
                        {getPickup(job)} → {getDropoff(job)}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>
                          Driver: {getDriverName(job) || 'Unassigned'}
                        </span>
                        <span>
                          Fare: {formatCurrency(getBookingPrice(job))}
                        </span>
                      </div>

                      {job.notes ? (
                        <p className="mt-3 text-sm text-white/55">
                          {job.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                        Open Job
                      </button>

                      <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10">
                        Reassign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}