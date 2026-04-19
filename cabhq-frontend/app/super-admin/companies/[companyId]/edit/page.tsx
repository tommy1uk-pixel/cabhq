import { fetchCompany } from '@/lib/super-admin/api';
import EditCompanyForm from '@/components/super-admin/EditCompanyForm';

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await fetchCompany(companyId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Edit company
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Update the company record.
        </p>
      </div>

      <EditCompanyForm company={company} />
    </div>
  );
}