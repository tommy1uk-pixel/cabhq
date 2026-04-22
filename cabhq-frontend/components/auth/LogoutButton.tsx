'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('cabhq_token');
    localStorage.removeItem('cabhq_user');
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driver');

    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Logout
    </button>
  );
}