'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Demo', href: '#demo' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/20">
            C
          </div>

          <div className="leading-tight">
            <div className="text-lg font-bold text-white">CabHQ</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Taxi Dispatch Software
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Login
          </Link>

          <Link
            href="#pricing"
            className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400"
          >
            Start Free Trial
          </Link>
        </div>

        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] md:hidden"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#020617] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 grid gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-white"
              >
                Login
              </Link>

              <Link
                href="#pricing"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-black"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}