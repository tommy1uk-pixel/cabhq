'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/super-admin', label: 'Overview' },
  { href: '/super-admin/companies', label: 'Companies' },
  { href: '/super-admin/billing', label: 'Billing' },
  { href: '/super-admin/analytics', label: 'Analytics' },
  { href: '/super-admin/leads', label: 'Leads CRM' },
  { href: '/super-admin/audit', label: 'Audit Logs' },
  { href: '/super-admin/support', label: 'Support' },
  { href: '/super-admin/api-keys', label: 'API Keys' },
  { href: '/super-admin/feature-flags', label: 'Feature Flags' },
  { href: '/super-admin/platform', label: 'Platform Health' },
  { href: '/super-admin/white-label', label: 'White Label' },
  { href: '/super-admin/partners', label: 'Partners' },
  { href: '/super-admin/payouts', label: 'Payouts' },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <div className="grid min-h-screen xl:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-[#040812]">
          <div className="sticky top-0 p-6">
            <Link href="/super-admin" className="block">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                CabHQ
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-white">
                Super Admin
              </div>
              <div className="mt-2 text-sm text-white/45">
                Platform operations and controls
              </div>
            </Link>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/super-admin' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'bg-cyan-500 text-black'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">
                Platform Mode
              </div>
              <div className="mt-2 text-xs text-white/50">
                Live environment with billing, trials, support and partner tools.
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}