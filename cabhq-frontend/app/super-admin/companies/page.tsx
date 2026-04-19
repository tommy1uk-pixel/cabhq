import Link from 'next/link';
import { fetchCompanies } from '@/lib/super-admin/api';
import CompaniesTable from '@/components/super-admin/CompaniesTable';

export default async function SuperAdminCompaniesPage() {
  const companies = await fetchCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Companies
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage all companies across CabHQ.
          </p>
        </div>

        <Link
          href="/super-admin/companies/new"
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Add company
        </Link>
      </div>

      <CompaniesTable companies={companies} />
    </div>
  );
}