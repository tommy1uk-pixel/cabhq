'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-semibold text-white">
          CabHQ
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Login
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-200"
          >
            View Pricing
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-white md:hidden"
        >
          Menu
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-800 bg-slate-950 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-white"
            >
              Login
            </Link>

            <Link
              href="/pricing"
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              View Pricing
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}