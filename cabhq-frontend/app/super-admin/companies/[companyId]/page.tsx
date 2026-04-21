import { fetchCompany } from '@/lib/super-admin/api';
import Link from 'next/link';
import CompanyStatusBadge from '@/components/super-admin/CompanyStatusBadge';
import CompanyStatusActions from '@/components/super-admin/CompanyStatusActions';
import CreateCompanyUserForm from '@/components/super-admin/CreateCompanyUserForm';
import CompanyUserStatusBadge from '@/components/super-admin/CompanyUserStatusBadge';
import CompanyUserActions from '@/components/super-admin/CompanyUserActions';
import CompanyBillingBadge from '@/components/super-admin/CompanyBillingBadge';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await fetchCompany(companyId);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-block rounded-full border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-300">
              Company ID: {company.id.slice(0, 8)}
            </div>

            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white">
              {company.name}
            </h1>

            <p className="mt-3 text-base text-slate-400">
              Created{' '}
              {company.createdAt
                ? new Date(company.createdAt).toLocaleString()
                : '—'}
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <CompanyStatusBadge status={company.status} />
              <CompanyBillingBadge status={company.billingStatus} />
            </div>

            <CompanyStatusActions
              companyId={company.id}
              status={company.status}
            />

            <div className="flex flex-wrap gap-3">
              <LogoutButton />

              <Link
                href="/super-admin/companies"
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Back to companies
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/edit`}
                className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950"
              >
                Edit company
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
          <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-400">
            Company Details
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card label="Name" value={company.name} />
            <Card label="Code" value={company.code || '—'} />
            <Card label="Slug" value={company.slug || '—'} />
            <Card label="Status" value={company.status || '—'} />
            <Card label="Contact Name" value={company.contactName || '—'} />
            <Card label="Contact Email" value={company.contactEmail || '—'} />
            <Card label="Contact Phone" value={company.contactPhone || '—'} />
            <Card label="Timezone" value={company.timezone || '—'} />
            <Card label="Currency" value={company.currency || '—'} />
            <Card label="Driver Limit" value={String(company.driverLimit ?? 0)} />
            <Card label="Vehicle Limit" value={String(company.vehicleLimit ?? 0)} />
            <Card
              label="Dispatcher Seats"
              value={String(company.dispatcherSeatLimit ?? 0)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
          <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-400">
            Billing
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card label="Billing Plan" value={company.billingPlan || 'STARTER'} />
            <Card label="Billing Status" value={company.billingStatus || 'TRIAL'} />
            <Card
              label="Trial Ends"
              value={company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : '—'}
            />
            <Card
              label="Subscription Starts"
              value={
                company.subscriptionStartsAt
                  ? new Date(company.subscriptionStartsAt).toLocaleDateString()
                  : '—'
              }
            />
            <Card
              label="Subscription Ends"
              value={
                company.subscriptionEndsAt
                  ? new Date(company.subscriptionEndsAt).toLocaleDateString()
                  : '—'
              }
            />
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
        <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-400">
          Company Users
        </h2>

        <div className="mt-8 space-y-5">
          {company.users && company.users.length > 0 ? (
            company.users.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-white">
                      {user.email}
                    </div>

                    <div className="text-sm text-slate-400">{user.role}</div>

                    <CompanyUserStatusBadge status={user.status} />
                  </div>

                  <div className="w-full max-w-xl">
                    <CompanyUserActions
                      companyId={company.id}
                      userId={user.id}
                      status={user.status}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-base text-slate-400">
              No users yet.
            </div>
          )}
        </div>
      </section>

      <CreateCompanyUserForm companyId={company.id} />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}