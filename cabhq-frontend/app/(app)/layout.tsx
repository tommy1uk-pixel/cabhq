'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import LogoutButton from '@/components/auth/LogoutButton';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', short: 'DB' },
  { label: 'Dispatch', href: '/dispatch', short: 'DI' },
  { label: 'Bookings', href: '/bookings', short: 'BO' },
  { label: 'Customers', href: '/customers', short: 'CU' },
  { label: 'Accounts', href: '/accounts', short: 'AC' },
  { label: 'Invoices', href: '/invoices', short: 'IN' },
  { label: 'Payments', href: '/payments', short: 'PA' },
  { label: 'Drivers', href: '/drivers', short: 'DR' },
  { label: 'Vehicles', href: '/vehicles', short: 'VE' },
  { label: 'Reports', href: '/reports', short: 'RE' },
  { label: 'Rates', href: '/rates', short: 'RA' },
  { label: 'Settings', href: '/settings', short: 'SE' },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem('cabhq_sidebar_collapsed')
        : null;

    setCollapsed(saved === 'true');
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cabhq_sidebar_collapsed', String(next));
      return next;
    });
  }

  const currentSection = useMemo(() => {
    const activeItem = navItems.find(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
    );

    return activeItem?.label || 'Operations';
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <div className="flex min-h-screen">
        <aside
          className={`hidden shrink-0 border-r border-white/10 bg-[#030712] xl:flex xl:flex-col transition-all duration-300 ${
            collapsed ? 'w-[96px]' : 'w-[278px]'
          }`}
        >
          <div className="border-b border-white/10 px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">
                  {collapsed ? 'CHQ' : 'CabHQ OS'}
                </div>

                <div className={`mt-3 font-bold tracking-tight ${collapsed ? 'text-xl' : 'text-2xl'}`}>
                  CabHQ
                </div>

                {!collapsed ? (
                  <p className="mt-2 text-sm text-white/45">
                    Dispatch, fleet and back office
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '»' : '«'}
              </button>
            </div>

            {!collapsed ? (
              <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/8 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/75">
                  Live workspace
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {currentSection}
                </div>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center rounded-2xl transition-all duration-200 ${
                      collapsed
                        ? 'justify-center px-2 py-3'
                        : 'gap-4 px-3 py-3.5'
                    } ${
                      active
                        ? 'bg-cyan-500/12 text-white ring-1 ring-cyan-400/20'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active ? (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400" />
                    ) : null}

                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold tracking-wide transition ${
                        active
                          ? 'bg-cyan-500/18 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                          : 'bg-white/5 text-white/65 group-hover:bg-white/10 group-hover:text-white'
                      }`}
                    >
                      {item.short}
                    </span>

                    {!collapsed ? (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">
                          {item.label}
                        </div>
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            {!collapsed ? (
              <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Session
                </div>
                <div className="mt-1 text-sm font-semibold text-white/85">
                  Operator Console
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <LogoutButton compact={collapsed} />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#050814]/90 px-4 py-4 backdrop-blur sm:px-6 xl:hidden">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">
                CabHQ
              </div>
              <div className="mt-1 text-lg font-bold">{currentSection}</div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {navItems.slice(0, 5).map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                      active
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white/5 text-white/70'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}