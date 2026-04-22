'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    // localStorage
    localStorage.removeItem('cabhq_token');
    localStorage.removeItem('cabhq_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driver');

    // session
    sessionStorage.clear();

    // cookies (important)
    document.cookie =
      'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie =
      'cabhq_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie =
      'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // hard redirect
    router.replace('/login');
    router.refresh();

    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
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