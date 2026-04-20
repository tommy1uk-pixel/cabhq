import Link from 'next/link';
import { Company } from '@/lib/super-admin/types';
import CompanyStatusBadge from './CompanyStatusBadge';

export default function CompaniesTable({
  companies,
}: {
  companies: Company[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <table className="min-w-full">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold">Company</th>
            <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold">Created</th>
            <th className="px-6 py-4 text-right text-sm font-semibold">Open</th>
          </tr>
        </thead>

        <tbody>
          {companies.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-base text-slate-400">
                No companies found.
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="border-b border-slate-800">
                <td className="px-6 py-5">
                  <div className="text-lg font-semibold text-white">{company.name}</div>
                  {company.code || company.slug ? (
                    <div className="mt-1 text-sm text-slate-400">
                      {company.code || '—'} {company.slug ? `• ${company.slug}` : ''}
                    </div>
                  ) : null}
                </td>

                <td className="px-6 py-5">
                  <CompanyStatusBadge status={company.status} />
                </td>

                <td className="px-6 py-5 text-base text-slate-300">
                  {company.createdAt
                    ? new Date(company.createdAt).toLocaleString()
                    : '—'}
                </td>

                <td className="px-6 py-5 text-right">
                  <Link
                    href={`/super-admin/companies/${company.id}`}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}