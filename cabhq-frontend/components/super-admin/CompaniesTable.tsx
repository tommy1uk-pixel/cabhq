import Link from 'next/link';
import { Company } from '@/lib/super-admin/types';

export default function CompaniesTable({
  companies,
}: {
  companies: Company[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-right">Open</th>
          </tr>
        </thead>

        <tbody>
          {companies.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                No companies found.
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="border-b border-slate-800">
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{company.name}</div>
                </td>

                <td className="px-4 py-4 text-slate-300">
                  {new Date(company.createdAt).toLocaleString()}
                </td>

                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/super-admin/companies/${company.id}`}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800"
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