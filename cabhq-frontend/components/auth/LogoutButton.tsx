'use client';

import { useRouter } from 'next/navigation';
import { clearStoredAuth } from '@/lib/auth';

export default function LogoutButton() {
  const router = useRouter();

  function onLogout() {
    clearStoredAuth();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Logout
    </button>
  );
}