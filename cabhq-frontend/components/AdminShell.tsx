'use client';

import { ReactNode } from 'react';
import AdminNav from './AdminNav';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AdminShell({
  title,
  subtitle,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1800px] px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <AdminNav />

          <section className="min-w-0">
            <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                CabHQ Control
              </p>
              <h1 className="mt-2 text-4xl font-bold">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-white/55">{subtitle}</p>
              ) : null}
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}