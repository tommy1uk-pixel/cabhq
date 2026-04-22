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
  | 'CANCELLED';

type JobTimelineItem = {
  id: string;
  time: string;
  message: string;
};

type JobDetail = {
  id: string;
  reference: string;
  status: JobStatus;
  customerName: string;
  customerPhone: string;
  pickup: string;
  dropoff: string;
  pickupAt: string;
  quotedPrice: number;
  passengerCount: number;
  notes?: string | null;
  driverName?: string | null;
  vehicle?: string | null;
  accountName?: string | null;
  createdAt: string;
  timeline: JobTimelineItem[];
};

const initialJobs: JobDetail[] = [
  {
    id: '1',
    reference: 'CAB-250421-1001',
    status: 'BOOKED',
    customerName: 'John Smith',
    customerPhone: '07700 900111',
    pickup: 'Heathrow Terminal 3',
    dropoff: 'Paddington Station',
    pickupAt: '2026-04-21T08:30:00',
    quotedPrice: 68,
    passengerCount: 2,
    notes: 'Meet and greet at arrivals.',
    driverName: null,
    vehicle: null,
    accountName: null,
    createdAt: '2026-04-21T08:12:00',
    timeline: [
      {
        id: '1a',
        time: '2026-04-21T08:12:00',
        message: 'Booking created',
      },
    ],
  },
  {
    id: '2',
    reference: 'CAB-250421-1002',
    status: 'EN_ROUTE',
    customerName: 'Sarah Khan',
    customerPhone: '07700 900222',
    pickup: 'Northside Medical Centre',
    dropoff: 'St Thomas Hospital',
    pickupAt: '2026-04-21T10:00:00',
    quotedPrice: 24,
    passengerCount: 1,
    notes: 'Hospital appointment return journey.',
    driverName: 'Imran Patel',
    vehicle: 'LG21 XYZ • Toyota Prius',
    accountName: 'Northside Medical Centre',
    createdAt: '2026-04-21T09:42:00',
    timeline: [
      {
        id: '2a',
        time: '2026-04-21T09:42:00',
        message: 'Booking created',
      },
      {
        id: '2b',
        time: '2026-04-21T09:59:00',
        message: 'Driver assigned: Imran Patel',
      },
      {
        id: '2c',
        time: '2026-04-21T10:07:00',
        message: 'Driver marked EN_ROUTE',
      },
    ],
  },
  {
    id: '3',
    reference: 'CAB-250421-1004',
    status: 'COMPLETED',
    customerName: 'City Stay Hotel',
    customerPhone: '0207 555 0088',
    pickup: 'City Stay Hotel',
    dropoff: 'Birmingham Airport',
    pickupAt: '2026-04-21T18:45:00',
    quotedPrice: 54,
    passengerCount: 3,
    notes: 'Airport transfer with luggage.',
    driverName: 'David Ali',
    vehicle: 'KM19 ABC • Ford Galaxy',
    accountName: 'City Stay Hotel',
    createdAt: '2026-04-21T17:51:00',
    timeline: [
      {
        id: '3a',
        time: '2026-04-21T17:51:00',
        message: 'Booking created',
      },
      {
        id: '3b',
        time: '2026-04-21T18:02:00',
        message: 'Driver assigned: David Ali',
      },
      {
        id: '3c',
        time: '2026-04-21T18:31:00',
        message: 'Driver marked EN_ROUTE',
      },
      {
        id: '3d',
        time: '2026-04-21T18:44:00',
        message: 'Driver arrived at pickup',
      },
      {
        id: '3e',
        time: '2026-04-21T20:02:00',
        message: 'Job completed',
      },
    ],
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return `£${value.toFixed(2)}`;
}

function statusClass(status: JobStatus) {
  if (status === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'CANCELLED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  if (status === 'BOOKED' || status === 'OFFERED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
}

export default function JobDetailsPage() {
  const [jobs] = useState<JobDetail[]>(initialJobs);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialJobs[0]?.id ?? null,
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) =>
      [
        job.reference,
        job.customerName,
        job.customerPhone,
        job.pickup,
        job.dropoff,
        job.driverName ?? '',
        job.accountName ?? '',
        job.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [jobs, search]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) ?? null,
    [jobs, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      live: jobs.filter((job) =>
        ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(job.status),
      ).length,
      completed: jobs.filter((job) => job.status === 'COMPLETED').length,
      booked: jobs.filter((job) => job.status === 'BOOKED').length,
      value: jobs.reduce((sum, job) => sum + job.quotedPrice, 0),
    };
  }, [jobs]);

  return (
    <AdminShell
      title="Job Details"
      subtitle="Operational job view with customer, route, driver, account and timeline detail."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Jobs" value={stats.total} />
          <StatCard label="Live" value={stats.live} />
          <StatCard label="Booked" value={stats.booked} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Value" value={formatCurrency(stats.value)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Jobs</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search and select a booking to inspect full job detail.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {filteredJobs.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No jobs found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const isSelected = selectedId === job.id;

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedId(job.id)}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{job.reference}</h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            job.status,
                          )}`}
                        >
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-white/75">{job.customerName}</p>
                      <p className="mt-2 text-sm text-white/55">
                        {job.pickup} → {job.dropoff}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>{formatDateTime(job.pickupAt)}</span>
                        <span>{job.driverName || 'Unassigned'}</span>
                        <span>{formatCurrency(job.quotedPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Selected Job</h2>
            <p className="mt-1 text-sm text-white/60">
              Full operational breakdown for the selected booking.
            </p>

            {!selectedJob ? (
              <div className="mt-5 rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No job selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedJob.reference}</h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                        selectedJob.status,
                      )}`}
                    >
                      {selectedJob.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Customer
                  </h4>
                  <DetailRow label="Name" value={selectedJob.customerName} />
                  <DetailRow label="Phone" value={selectedJob.customerPhone} />
                  <DetailRow
                    label="Passengers"
                    value={String(selectedJob.passengerCount)}
                  />
                  <DetailRow
                    label="Account"
                    value={selectedJob.accountName || 'Private booking'}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Journey
                  </h4>
                  <DetailRow label="Pickup" value={selectedJob.pickup} />
                  <DetailRow label="Dropoff" value={selectedJob.dropoff} />
                  <DetailRow
                    label="Pickup Time"
                    value={formatDateTime(selectedJob.pickupAt)}
                  />
                  <DetailRow
                    label="Quoted Price"
                    value={formatCurrency(selectedJob.quotedPrice)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Dispatch
                  </h4>
                  <DetailRow
                    label="Driver"
                    value={selectedJob.driverName || 'Unassigned'}
                  />
                  <DetailRow
                    label="Vehicle"
                    value={selectedJob.vehicle || 'No vehicle assigned'}
                  />
                  <DetailRow
                    label="Created"
                    value={formatDateTime(selectedJob.createdAt)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Timeline
                  </h4>

                  <div className="space-y-3">
                    {selectedJob.timeline.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="text-xs text-white/45">
                          {formatDateTime(item.time)}
                        </div>
                        <div className="mt-1 text-sm text-white/80">{item.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedJob.notes ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Notes
                    </h4>
                    <p className="text-sm text-white/75">{selectedJob.notes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}