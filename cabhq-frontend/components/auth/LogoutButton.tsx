'use client';

type LogoutButtonProps = {
  compact?: boolean;
};

export default function LogoutButton({
  compact = false,
}: LogoutButtonProps) {
  function handleLogout() {
    localStorage.removeItem('cabhq_token');
    localStorage.removeItem('cabhq_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driver');
    sessionStorage.clear();

    document.cookie =
      'cabhq_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';

    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      title={compact ? 'Logout' : undefined}
      className={`w-full rounded-2xl border border-slate-700 text-sm font-semibold text-white transition hover:bg-slate-800 ${
        compact ? 'px-3 py-3' : 'px-5 py-3'
      }`}
    >
      {compact ? '⎋' : 'Logout'}
    </button>
  );
}