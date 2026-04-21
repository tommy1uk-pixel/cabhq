'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type DriverJobStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ON_JOB'
  | 'COMPLETED';

type DriverJob = {
  id: string;
  reference: string;
  customerName: string;
  pickup: string;
  dropoff: string;
  pickupAt: string;
  fare: number;
  status: DriverJobStatus;
};

type DriverShift = {
  online: boolean;
  onShift: boolean;
  startedAt?: string | null;
  todayJobs: number;
  completedJobs: number;
  earnings: number;
};

const initialShift: DriverShift = {
  online: true,
  onShift: true,
  startedAt: '2026-04-21T07:00:00',
  todayJobs: 6,
  completedJobs: 3,
  earnings: 118.5,
};

const initialJobs: DriverJob[] = [
  {
    id: '1',
    reference: 'CAB-250421-1002',
    customerName: 'Sarah Khan',
    pickup: 'Northside Medical Centre',
    dropoff: 'St Thomas Hospital',
    pickupAt: '2026-04-21T10:00:00',
    fare: 24,
    status: 'ACCEPTED',
  },
  {
    id: '2',
    reference: 'CAB-250421-1004',
    customerName: 'City Stay Hotel',
    pickup: 'City Stay Hotel',
    dropoff: 'Birmingham Airport',
    pickupAt: '2026-04-21T18:45:00',
    fare: 54,
    status: 'EN_ROUTE',
  },
  {
    id: '3',
    reference: 'CAB-250421-1005',
    customerName: 'Lucy Brown',
    pickup: 'King Street',
    dropoff: 'Victoria Coach Station',
    pickupAt: '2026-04-21T07:10:00',
    fare: 16.5,
    status: 'COMPLETED',
  },
];

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: DriverJobStatus) {
  if (status === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'OFFERED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
}

export default function DriverAppPage() {
  const [shift, setShift] = useState(initialShift);
  const [jobs, setJobs] = useState(initialJobs);

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status !== 'COMPLETED'),
    [jobs],
  );

  function toggleOnline() {
    setShift((prev) => ({
      ...prev,
      online: !prev.online,
    }));
  }

  function toggleShift() {
    setShift((prev) => ({
      ...prev,
      onShift: !prev.onShift,
      startedAt: prev.onShift ? null : new Date().toISOString(),
    }));
  }

  function updateJobStatus(id: string, status: DriverJobStatus) {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, status } : job)),
    );
  }

  return (
    <AdminShell
      title="Driver App"
      subtitle="Driver mobile workflow, shift status, offered jobs, live trips and earnings view."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Online" value={shift.online ? 'Yes' : 'No'} />
          <StatCard label="On Shift" value={shift.onShift ? 'Yes' : 'No'} />
          <StatCard label="Today Jobs" value={shift.todayJobs} />
          <StatCard label="Completed" value={shift.completedJobs} />
          <StatCard label="Earnings" value={formatCurrency(shift.earnings)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Driver Status</h2>
            <p className="mt-1 text-sm text-white/60">
              Quick controls for online presence and shift state.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <DetailRow label="Online" value={shift.online ? 'Yes' : 'No'} />
                <DetailRow label="On Shift" value={shift.onShift ? 'Yes' : 'No'} />
                <DetailRow
                  label="Shift Started"
                  value={formatDateTime(shift.startedAt)}
                />
              </div>

              <div className="grid gap-3">
                <button
                  onClick={toggleOnline}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500"
                >
                  {shift.online ? 'Go Offline' : 'Go Online'}
                </button>

                <button
                  onClick={toggleShift}
                  className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white hover:bg-white/10"
                >
                  {shift.onShift ? 'End Shift' : 'Start Shift'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Driver Jobs</h2>
                <p className="mt-1 text-sm text-white/60">
                  Job offers, live work and completed jobs for the driver app.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-2 text-sm text-white/70">
                Active jobs: <span className="font-semibold text-white">{activeJobs.length}</span>
              </div>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {job.reference}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            job.status,
                          )}`}
                        >
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white">
                        {job.customerName}
                      </p>

                      <p className="mt-2 text-sm text-white/75">
                        {job.pickup} → {job.dropoff}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>Pickup: {formatDateTime(job.pickupAt)}</span>
                        <span>Fare: {formatCurrency(job.fare)}</span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      {job.status === 'OFFERED' ? (
                        <>
                          <button
                            onClick={() => updateJobStatus(job.id, 'ACCEPTED')}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                          >
                            Accept
                          </button>
                          <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                            Reject
                          </button>
                        </>
                      ) : null}

                      {job.status === 'ACCEPTED' ? (
                        <button
                          onClick={() => updateJobStatus(job.id, 'EN_ROUTE')}
                          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                        >
                          Start En Route
                        </button>
                      ) : null}

                      {job.status === 'EN_ROUTE' ? (
                        <button
                          onClick={() => updateJobStatus(job.id, 'ARRIVED')}
                          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                        >
                          Mark Arrived
                        </button>
                      ) : null}

                      {job.status === 'ARRIVED' ? (
                        <button
                          onClick={() => updateJobStatus(job.id, 'ON_JOB')}
                          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                        >
                          Start Job
                        </button>
                      ) : null}

                      {job.status === 'ON_JOB' ? (
                        <button
                          onClick={() => updateJobStatus(job.id, 'COMPLETED')}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                          Complete Job
                        </button>
                      ) : null}

                      <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10">
                        Navigate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      <span className="text-right text-sm text-white/85">{value}</span>
    </div>
  );
}