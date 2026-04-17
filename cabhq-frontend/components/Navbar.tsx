'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CabHQ Logo"
              width={44}
              height={44}
              className="rounded-xl"
              priority
            />
            <span className="text-xl font-bold text-white">CABHQ</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#platform" className="transition hover:text-white">
              Platform
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#demo" className="transition hover:text-white">
              Demo
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-white/80 hover:text-white md:block"
            >
              Login
            </Link>

            <a
              href="#demo"
              className="hidden rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 md:inline-flex"
            >
              Book Demo
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-1.5">
                <span className="h-0.5 w-5 bg-white" />
                <span className="h-0.5 w-5 bg-white" />
                <span className="h-0.5 w-5 bg-white" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div onClick={closeMenu} className="absolute inset-0 bg-black/60" />

          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm border-l border-white/10 bg-[#07111f] p-6">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-lg font-bold text-white">CABHQ</span>

              <button
                type="button"
                onClick={closeMenu}
                className="text-xl text-white"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="space-y-4">
              <a
                href="#platform"
                onClick={closeMenu}
                className="block text-white/80 hover:text-white"
              >
                Platform
              </a>
              <a
                href="#features"
                onClick={closeMenu}
                className="block text-white/80 hover:text-white"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={closeMenu}
                className="block text-white/80 hover:text-white"
              >
                Pricing
              </a>
              <a
                href="#demo"
                onClick={closeMenu}
                className="block text-white/80 hover:text-white"
              >
                Demo
              </a>
              <Link
                href="/login"
                onClick={closeMenu}
                className="block text-white/80 hover:text-white"
              >
                Login
              </Link>
            </nav>

            <a
              href="#demo"
              onClick={closeMenu}
              className="mt-6 block w-full rounded-xl bg-blue-600 py-3 text-center font-semibold text-white"
            >
              Book Demo
            </a>
          </div>
        </div>
      )}
    </>
  );
}