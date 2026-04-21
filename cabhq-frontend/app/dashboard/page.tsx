'use client';

import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import { getStoredUser } from '@/lib/auth';

export default function DashboardPage() {
  const user = getStoredUser();

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm font-semibold text-sky-300">
                Operator Dashboard
              </div>

              <h1 className="mt-5 text-5xl font-semibold tracking-tight">
                Welcome back
              </h1>

              <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-400">
                Manage bookings, drivers, vehicles and dispatch operations from one place.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
                <span className="rounded-full border border-slate-700 px-4 py-2">
                  {user?.email || 'Operator'}
                </span>
                <span className="rounded-full border border-slate-700 px-4 py-2">
                  {user?.role || 'ADMIN'}
                </span>
                <span className="rounded-full border border-slate-700 px-4 py-2">
                  Company ID: {user?.companyId?.slice(0, 8) || '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dispatch"
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200"
              >
                Open Dispatch
              </Link>

              <Link
                href="/drivers"
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Drivers
              </Link>

              <LogoutButton />
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Live Operations
                </h2>
                <p className="mt-2 text-base text-slate-400">
                  Quick view of what needs attention right now.
                </p>
              </div>

              <Link
                href="/dispatch"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Go to Dispatch
              </Link>
            </div>

            <div className="mt-8 space-y-4">
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
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Quick Actions
              </h2>
              <p className="mt-2 text-base text-slate-400">
                Jump straight into the most used areas.
              </p>

              <div className="mt-8 grid gap-4">
                <QuickAction
                  href="/dispatch"
                  title="Dispatch Board"
                  text="Assign jobs and monitor active trips."
                />
                <QuickAction
                  href="/drivers"
                  title="Drivers"
                  text="Manage driver profiles and availability."
                />
                <QuickAction
                  href="/vehicles"
                  title="Vehicles"
                  text="Review fleet records and active vehicles."
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Today’s Snapshot
              </h2>

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
    </div>
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
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-5xl font-semibold tracking-tight">{value}</div>
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
    Live: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    Complete: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    Alert: 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-lg font-semibold text-white">{title}</div>
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
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700 hover:bg-slate-950"
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-400">{text}</div>
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
    <div className="flex items-center justify-between border-b border-slate-800 pb-4 last:border-b-0 last:pb-0">
      <div className="text-base text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}