'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import {
  type BookingLite,
  type DriverRecordLite,
  type VehicleRecordLite,
  getDashboardStats,
  isCompleted,
  isLive,
  isScheduled,
} from '@/lib/ops-reporting';

type Booking = BookingLite & {
  customerName?: string | null;
};

type Driver = DriverRecordLite;

type Vehicle = VehicleRecordLite;

const quickLinks = [
  {
    title: 'Open Dispatch',
    text: 'Live board, active jobs, driver movement and assignments.',
    href: '/dispatch',
    tone: 'cyan',
  },
  {
    title: 'Manage Bookings',
    text: 'Scheduled, completed, cancelled and customer search.',
    href: '/bookings',
    tone: 'violet',
  },
  {
    title: 'Driver Control',
    text: 'Availability, compliance, shifts and documents.',
    href: '/drivers',
    tone: 'emerald',
  },
  {
    title: 'Fleet Overview',
    text: 'Vehicles, compliance tracking and assignments.',
    href: '/vehicles',
    tone: 'amber',
  },
];

export default function DashboardPage() {
  const user = getStoredUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const [bookingsData, driversData, vehiclesData] = await Promise.all([
          apiFetch<Booking[]>('/bookings').catch(() => []),
          apiFetch<Driver[]>('/drivers').catch(() => []),
          apiFetch<Vehicle[]>('/vehicles').catch(() => []),
        ]);

        if (!mounted) return;

        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => getDashboardStats(bookings, drivers, vehicles),
    [bookings, drivers, vehicles],
  );

  const liveActivities = useMemo(() => {
    const items: Array<{
      title: string;
      meta: string;
      status: 'Pending' | 'Live' | 'Complete' | 'Alert';
    }> = [];

    const pending = bookings.find((booking) => isScheduled(booking.status));
    if (pending) {
      items.push({
        title: `Booking ${pending.reference} waiting for assignment`,
        meta: pending.customerName
          ? `Customer ${pending.customerName}`
          : 'Awaiting driver allocation',
        status: 'Pending',
      });
    }

    const live = bookings.find((booking) => isLive(booking.status));
    if (live) {
      items.push({
        title: `Booking ${live.reference} is currently live`,
        meta: live.driver?.name || live.driver?.fullName || 'Driver assigned',
        status: 'Live',
      });
    }

    const complete = bookings.find((booking) => isCompleted(booking.status));
    if (complete) {
      items.push({
        title: `Booking ${complete.reference} completed`,
        meta: complete.customerName
          ? `Customer ${complete.customerName}`
          : 'Completed successfully',
        status: 'Complete',
      });
    }

    const inactiveVehicle = vehicles.find(
      (vehicle) => (vehicle.status || '').toUpperCase() === 'OFF_ROAD',
    );
    if (inactiveVehicle) {
      items.push({
        title: `Vehicle ${inactiveVehicle.reg} needs attention`,
        meta: 'Marked off road',
        status: 'Alert',
      });
    }

    return items.slice(0, 4);
  }, [bookings, vehicles]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_30%),linear-gradient(135deg,#07101d_0%,#0a1322_55%,#060d18_100%)]">
        <div className="px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Operations Centre
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Welcome back
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Run dispatch, monitor live operations, track drivers and keep the
                whole business moving from one command view.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Chip>{user?.email || 'Operator'}</Chip>
                <Chip>{user?.role || 'ADMIN'}</Chip>
                <Chip>Company ID: {user?.companyId?.slice(0, 8) || '—'}</Chip>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <HeroStat
                label="Jobs Today"
                value={loading ? '—' : String(stats.jobsToday)}
                hint="Scheduled and active"
              />
              <HeroStat
                label="Drivers Online"
                value={loading ? '—' : String(stats.driversOnline)}
                hint="Available or live"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dispatch"
              className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
            >
              Open Dispatch
            </Link>

            <Link
              href="/bookings"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              View Bookings
            </Link>

            <Link
              href="/reports"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              View Reports
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Jobs Today"
          value={loading ? '—' : String(stats.jobsToday)}
          subtext="Scheduled and active jobs"
          tone="cyan"
        />
        <MetricCard
          label="Pending Jobs"
          value={loading ? '—' : String(stats.pendingJobs)}
          subtext="Waiting for assignment"
          tone="amber"
        />
        <MetricCard
          label="Drivers Online"
          value={loading ? '—' : String(stats.driversOnline)}
          subtext="Currently available or active"
          tone="emerald"
        />
        <MetricCard
          label="Vehicles Active"
          value={loading ? '—' : String(stats.vehiclesActive)}
          subtext="Operational fleet right now"
          tone="violet"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionEyebrow>Live Operations</SectionEyebrow>
              <h2 className="mt-2 text-2xl font-bold text-white">
                What needs attention now
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Current activity across dispatch, compliance and active jobs.
              </p>
            </div>

            <Link
              href="/dispatch"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Go to Dispatch
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <LoadingBlock label="Loading activity..." />
            ) : liveActivities.length === 0 ? (
              <LoadingBlock label="No live activity found." />
            ) : (
              liveActivities.map((item, index) => (
                <ActivityRow
                  key={`${item.title}-${index}`}
                  title={item.title}
                  meta={item.meta}
                  status={item.status}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <SectionEyebrow>Quick Access</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Core operator tools
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Jump straight into the areas used most throughout the day.
            </p>

            <div className="mt-6 grid gap-3">
              {quickLinks.map((item) => (
                <QuickAction
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  text={item.text}
                  tone={item.tone as 'cyan' | 'violet' | 'emerald' | 'amber'}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <SectionEyebrow>Today’s Snapshot</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Performance today
            </h2>

            <div className="mt-6 space-y-4">
              <SnapshotRow
                label="Completed Jobs"
                value={loading ? '—' : String(stats.completedJobs)}
              />
              <SnapshotRow
                label="Cancelled Jobs"
                value={loading ? '—' : String(stats.cancelledJobs)}
              />
              <SnapshotRow
                label="Live Jobs"
                value={loading ? '—' : String(stats.liveJobs)}
              />
              <SnapshotRow
                label="Estimated Revenue"
                value={loading ? '—' : `£${stats.estimatedRevenue.toFixed(2)}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <DashboardPanel
          title="Driver Status"
          subtitle="Live workforce overview"
          items={[
            {
              label: 'Available',
              value: loading ? '—' : String(stats.driversAvailable),
            },
            {
              label: 'Busy',
              value: loading ? '—' : String(stats.driversBusy),
            },
            {
              label: 'Off Duty',
              value: loading ? '—' : String(stats.driversOffDuty),
            },
          ]}
        />

        <DashboardPanel
          title="Booking Mix"
          subtitle="Current job composition"
          items={[
            {
              label: 'Pre-booked',
              value: loading ? '—' : String(stats.pendingJobs),
            },
            {
              label: 'Live',
              value: loading ? '—' : String(stats.liveJobs),
            },
            {
              label: 'Completed',
              value: loading ? '—' : String(stats.completedJobs),
            },
          ]}
        />

        <DashboardPanel
          title="Fleet Status"
          subtitle="Current vehicle overview"
          items={[
            {
              label: 'Active',
              value: loading ? '—' : String(stats.vehiclesActive),
            },
            {
              label: 'Total Drivers',
              value: loading ? '—' : String(stats.totalDrivers),
            },
            {
              label: 'Total Vehicles',
              value: loading ? '—' : String(stats.totalVehicles),
            },
          ]}
        />
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-300">
      {children}
    </span>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">
      {children}
    </div>
  );
}

function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  tone: 'cyan' | 'amber' | 'emerald' | 'violet';
}) {
  const toneMap = {
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20',
  };

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-br ${toneMap[tone]} p-5`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-4xl font-black tracking-tight text-white">
        {value}
      </div>
      <div className="mt-3 text-sm text-slate-400">{subtext}</div>
    </div>
  );
}

function ActivityRow({
  title,
  meta,
  status,
}: {
  title: string;
  meta: string;
  status: 'Pending' | 'Live' | 'Complete' | 'Alert';
}) {
  const styles: Record<string, string> = {
    Pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    Live: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    Complete: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    Alert: 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-base font-semibold text-white">{title}</div>
        <div className="mt-1 text-sm text-slate-400">{meta}</div>
      </div>

      <div
        className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${styles[status]}`}
      >
        {status}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  text,
  tone,
}: {
  href: string;
  title: string;
  text: string;
  tone: 'cyan' | 'violet' | 'emerald' | 'amber';
}) {
  const toneMap = {
    cyan: 'hover:border-cyan-500/40 hover:bg-cyan-500/5',
    violet: 'hover:border-violet-500/40 hover:bg-violet-500/5',
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    amber: 'hover:border-amber-500/40 hover:bg-amber-500/5',
  };

  return (
    <Link
      href={href}
      className={`rounded-2xl border border-white/10 bg-black/20 p-4 transition ${toneMap[tone]}`}
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
    </Link>
  );
}

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function DashboardPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <span className="text-sm text-slate-400">{item.label}</span>
            <span className="text-lg font-semibold text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
      {label}
    </div>
  );
}