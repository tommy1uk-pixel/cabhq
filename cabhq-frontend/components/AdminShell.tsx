'use client';

import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Bookings', href: '/bookings' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Vehicles', href: '/vehicles' },
  { label: 'Customers', href: '/customers' },
  { label: 'Accounts', href: '/accounts' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Payments', href: '/payments' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];

export default function AdminShell({
  title,
  subtitle,
  children,
  actions,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#060b16] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060b16]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/20">
                  C
                </div>

                <div className="leading-tight">
                  <div className="text-lg font-semibold text-white">CabHQ</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Operator Platform
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {actions}
              <LogoutButton />
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">
              CabHQ
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm text-white/60">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}