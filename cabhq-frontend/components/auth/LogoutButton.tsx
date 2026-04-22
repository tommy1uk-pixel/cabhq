'use client';

export default function LogoutButton() {
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
      className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Logout
    </button>
  );
}