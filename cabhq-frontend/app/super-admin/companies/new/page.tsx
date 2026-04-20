import Link from 'next/link';
import CompanyWizard from '@/components/super-admin/CompanyWizard';
import LogoutButton from '@/components/auth/LogoutButton';

export default function NewCompanyPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300">
              Super Admin Provisioning
            </div>

            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                Launch Company
              </h1>

              <p className="mt-3 max-w-3xl text-lg text-slate-400">
                Provision a new tenant, create administrator access,
                configure identity settings and prepare the company for
                onboarding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LogoutButton />

            <Link
              href="/super-admin/companies"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Companies
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <InfoCard
          title="Tenant Setup"
          text="Create the company record, platform identity and core settings."
        />

        <InfoCard
          title="Admin Access"
          text="Create the first company administrator login and permissions."
        />

        <InfoCard
          title="Go Live Ready"
          text="Prepare the tenant for dispatch, drivers, vehicles and users."
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <CompanyWizard />
      </section>
    </div>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>

      <p className="mt-3 text-base text-slate-400">{text}</p>
    </div>
  );
}