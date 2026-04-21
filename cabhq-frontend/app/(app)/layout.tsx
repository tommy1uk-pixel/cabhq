// app/(app)/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  short: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', short: 'DB' },
  { label: 'Dispatch', href: '/dispatch', short: 'DI' },
  { label: 'Bookings', href: '/bookings', short: 'BO' },
  { label: 'Clients', href: '/clients', short: 'CL' },
  { label: 'Drivers', href: '/drivers', short: 'DR' },
  { label: 'Vehicles', href: '/vehicles', short: 'VE' },
  { label: 'Reports', href: '/reports', short: 'RE' },
  { label: 'Settings', href: '/settings', short: 'SE' },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(() => {
    return (
      navItems.find((item) =>
        item.href === '/'
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      ) ?? null
    );
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#0b1020] xl:flex xl:flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <Link href="/dispatch" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-base font-bold text-cyan-300 ring-1 ring-cyan-500/20">
                C
              </div>
              <div>
                <div className="text-lg font-semibold text-white">CabHQ</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Operator Suite
                </div>
              </div>
            </Link>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Operations
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                      active
                        ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-500/20'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                        active
                          ? 'bg-cyan-500/20 text-cyan-200'
                          : 'bg-white/[0.05] text-slate-400'
                      }`}
                    >
                      {item.short}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {item.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Live Workspace
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {activeItem?.label || 'CabHQ'}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Operator control panel and live dispatch tools.
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/90 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white xl:hidden"
                >
                  Menu
                </button>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    CabHQ
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {activeItem?.label || 'Operator'}
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  SYSTEM LIVE
                </div>
                <Link
                  href="/dispatch"
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                >
                  Open Dispatch
                </Link>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden">
            <div className="px-4 py-4 md:px-6 md:py-6">{children}</div>
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col border-r border-white/10 bg-[#0b1020] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Link
                href="/dispatch"
                className="flex items-center gap-3"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/20">
                  C
                </div>
                <div>
                  <div className="text-base font-semibold text-white">CabHQ</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Operator Suite
                  </div>
                </div>
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-3 px-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Operations
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                        active
                          ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-500/20'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-200'
                            : 'bg-white/[0.05] text-slate-400'
                        }`}
                      >
                        {item.short}
                      </div>
                      <div className="text-sm font-semibold">{item.label}</div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}