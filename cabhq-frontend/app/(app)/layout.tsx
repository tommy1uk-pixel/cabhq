'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <div className="flex min-h-screen">
        <aside
          className={`hidden shrink-0 border-r border-white/10 bg-[#040816] xl:flex xl:flex-col transition-all duration-200 ${
            collapsed ? 'w-[92px]' : 'w-[260px]'
          }`}
        >
          <div className="border-b border-white/10 px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className={collapsed ? 'w-full' : ''}>
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">
                  {collapsed ? 'CHQ' : 'Operations'}
                </div>

                <div className={`mt-3 font-bold text-white ${collapsed ? 'text-xl' : 'text-2xl'}`}>
                  CabHQ
                </div>

                {!collapsed ? (
                  <p className="mt-2 text-sm text-white/45">Operator platform</p>
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
          </div>

          <nav className="flex-1 space-y-2 px-3 py-5">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center rounded-2xl transition ${
                    collapsed
                      ? 'justify-center px-2 py-3'
                      : 'gap-4 px-4 py-4'
                  } ${
                    active
                      ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-400/20'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'
                    }`}
                  >
                    {item.short}
                  </span>

                  {!collapsed ? (
                    <span className="truncate text-base font-semibold">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
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
              <div className="mt-1 text-lg font-bold">Operations</div>
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