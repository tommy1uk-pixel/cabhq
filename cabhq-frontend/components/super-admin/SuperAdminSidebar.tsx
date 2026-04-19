import Link from 'next/link';

export default function SuperAdminSidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 p-4 text-white">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
          CabHQ
        </div>
        <div className="mt-2 text-xl font-semibold">Admin Centre</div>
      </div>

      <nav className="space-y-2">
        <Link
          href="/super-admin"
          className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
        >
          Overview
        </Link>

        <Link
          href="/super-admin/companies"
          className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
        >
          Companies
        </Link>
      </nav>
    </aside>
  );
}