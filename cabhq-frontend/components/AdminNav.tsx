'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dispatch' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/driver', label: 'Driver App' },
  { href: '/vehicles', label: 'Vehicles' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <aside className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 lg:w-[260px]">
      <div className="mb-6 px-2">
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          CabHQ
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Admin</h2>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? 'bg-cyan-600 text-white'
                  : 'bg-[#0b1728] text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}