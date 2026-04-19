import CompanyWizard from '@/components/super-admin/CompanyWizard';

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Create Company
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Set up a new company inside CabHQ.
        </p>
      </div>

      <CompanyWizard />
    </div>
  );
}