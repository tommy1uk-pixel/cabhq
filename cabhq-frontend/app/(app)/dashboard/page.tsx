'use client';

import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import { getStoredUser } from '@/lib/auth';

const quickLinks = [
  {
    title: 'Dispatch',
    text: 'Live board, active jobs, map and assignments.',
    href: '/dispatch',
    tone: 'cyan',
  },
  {
    title: 'Bookings',
    text: 'Scheduled, completed, cancelled and search.',
    href: '/bookings',
    tone: 'violet',
  },
  {
    title: 'Drivers',
    text: 'Availability, compliance, shifts and documents.',
    href: '/drivers',
    tone: 'emerald',
  },
  {
    title: 'Vehicles',
    text: 'Fleet records, compliance and assignments.',
    href: '/vehicles',
    tone: 'amber',
  },
];

export default function DashboardPage() {
  const user = getStoredUser();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0e1628] to-[#08101d]">
        <div className="flex flex-col gap-8 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-8">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              CabHQ Operator Dashboard
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Welcome back
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Run dispatch, monitor drivers, manage fleet records and keep the
              operation moving from one control panel.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Chip>{user?.email || 'Operator'}</Chip>
              <Chip>{user?.role || 'ADMIN'}</Chip>
              <Chip>
                Company ID: {user?.companyId?.slice(0, 8) || '—'}
              </Chip>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dispatch"
              className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Open Dispatch
            </Link>

            <Link
              href="/bookings"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              View Bookings
            </Link>

            <LogoutButton />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Jobs Today"
          value="24"
          subtext="Scheduled and active jobs"
        />
        <MetricCard
          label="Pending Jobs"
          value="5"
          subtext="Waiting for assignment"
        />
        <MetricCard
          label="Drivers Online"
          value="12"
          subtext="Currently available or active"
        />
        <MetricCard
          label="Vehicles Active"
          value="9"
          subtext="Operational fleet right now"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Operations</h2>
              <p className="mt-2 text-sm text-slate-400">
                What needs attention right now across dispatch.
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
            <ActivityRow
              title="Airport transfer waiting for assignment"
              meta="Booking CAB-1043 • Pickup in 18 minutes"
              status="Pending"
            />
            <ActivityRow
              title="Driver en route to hospital return"
              meta="Booking CAB-1044 • Driver 12"
              status="Live"
            />
            <ActivityRow
              title="School run completed successfully"
              meta="Booking CAB-1039 • Completed 7 mins ago"
              status="Complete"
            />
            <ActivityRow
              title="Vehicle compliance reminder due"
              meta="Vehicle LG21 XYZ • MOT in 3 days"
              status="Alert"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-bold text-white">Quick Access</h2>
            <p className="mt-2 text-sm text-slate-400">
              Jump into the core operator tools.
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
            <h2 className="text-2xl font-bold text-white">Today’s Snapshot</h2>

            <div className="mt-6 space-y-4">
              <SnapshotRow label="Completed Jobs" value="18" />
              <SnapshotRow label="Cancelled Jobs" value="2" />
              <SnapshotRow label="Average Wait Time" value="6 min" />
              <SnapshotRow label="Estimated Revenue" value="£486" />
            </div>
          </div>
        </div>
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

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-4xl font-bold tracking-tight text-white">
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