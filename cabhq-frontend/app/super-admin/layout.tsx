import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

export default function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/super-admin" className="text-lg font-semibold text-white">
            CabHQ Super Admin
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/super-admin"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white"
            >
              Overview
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}