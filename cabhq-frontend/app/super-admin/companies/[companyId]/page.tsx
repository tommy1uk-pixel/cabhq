'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';
import SuperAdminDetailRow from '@/components/super-admin/SuperAdminDetailRow';

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'PENDING';
type PlanType = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE' | string;
type PaymentStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | string;
type UsageHealth = 'GOOD' | 'HIGH' | 'LIMITED';
type UserRole = 'ADMIN' | 'OPERATOR' | 'DRIVER' | 'SUPER_ADMIN';
type UserStatus = 'ACTIVE' | 'SUSPENDED';

type ApiCompanyUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type ApiCompany = {
  id: string;
  name: string;
  code?: string | null;
  slug?: string | null;
  status: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  timezone?: string | null;
  currency?: string | null;
  driverLimit: number;
  vehicleLimit: number;
  dispatcherSeatLimit: number;
  billingPlan: string;
  billingStatus: string;
  trialEndsAt?: string | null;
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  users?: ApiCompanyUser[];
};

type CompanyDetail = {
  id: string;
  companyName: string;
  code: string;
  slug: string;
  status: CompanyStatus;
  plan: PlanType;
  createdAt: string;
  renewalDate: string | null;
  paymentStatus: PaymentStatus;
  drivers: number;
  vehicles: number;
  activeUsers: number;
  usageHealth: UsageHealth;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  timezone: string;
  currency: string;
  dispatcherSeatLimit: number;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  users: ApiCompanyUser[];
  internalNotes: string;
};

type NewUserForm = {
  email: string;
  password: string;
  role: UserRole;
};

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-cyan-500/50';

const btnPrimary =
  'rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50';

const btnOutline =
  'rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50';

const btnDanger =
  'rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50';

const btnSuccess =
  'rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50';

function formatCurrency(v: number) {
  return `£${v.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
}

function formatDateTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB');
}

function deriveUsageHealth(company: ApiCompany): UsageHealth {
  const total =
    company.driverLimit +
    company.vehicleLimit +
    company.dispatcherSeatLimit;

  if (total >= 100) return 'HIGH';
  if (total >= 40) return 'GOOD';
  return 'LIMITED';
}

function mapCompany(c: ApiCompany): CompanyDetail {
  return {
    id: c.id,
    companyName: c.name,
    code: c.code || '—',
    slug: c.slug || '—',
    status:
      c.billingStatus === 'TRIAL'
        ? 'TRIAL'
        : ((c.status as CompanyStatus) || 'PENDING'),
    plan: c.billingPlan,
    createdAt: c.createdAt,
    renewalDate: c.subscriptionEndsAt ?? null,
    paymentStatus: c.billingStatus,
    drivers: c.driverLimit,
    vehicles: c.vehicleLimit,
    activeUsers:
      c.users?.filter((u) => u.status === 'ACTIVE').length ?? 0,
    usageHealth: deriveUsageHealth(c),
    ownerName: c.contactName || 'No contact assigned',
    ownerEmail: c.contactEmail || 'No email',
    ownerPhone: c.contactPhone || 'No phone',
    timezone: c.timezone || 'Europe/London',
    currency: c.currency || 'GBP',
    dispatcherSeatLimit: c.dispatcherSeatLimit,
    trialEndsAt: c.trialEndsAt ?? null,
    subscriptionStartsAt: c.subscriptionStartsAt ?? null,
    users: c.users ?? [],
    internalNotes: c.internalNotes || '',
  };
}

export default function SuperAdminCompanyDetailPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');

  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    password: '',
    role: 'ADMIN',
  });

  const [busy, setBusy] = useState<string | null>(null);

  async function loadCompany() {
    if (!companyId) return;

    const data = await apiFetch<ApiCompany>(`/companies/${companyId}`);
    const mapped = mapCompany(data);

    setCompany(mapped);
    setNotes(mapped.internalNotes);
  }

  useEffect(() => {
    if (!companyId) return;

    async function run() {
      try {
        setLoading(true);
        setError('');
        await loadCompany();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [companyId]);

  function toast(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 1500);
  }

  async function saveNotes() {
    try {
      setBusy('notes');

      await apiFetch(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ internalNotes: notes }),
      });

      await loadCompany();
      toast('Notes saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function createUser() {
    try {
      setBusy('create-user');

      await apiFetch(`/companies/${companyId}/users`, {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      setNewUser({
        email: '',
        password: '',
        role: 'ADMIN',
      });

      await loadCompany();
      toast('User created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function updateUserStatus(
    userId: string,
    status: UserStatus,
  ) {
    try {
      setBusy(userId);

      await apiFetch(
        `/companies/${companyId}/users/${userId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      );

      await loadCompany();
      toast('User updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const monthly = useMemo(() => {
    if (!company) return 0;
    if (company.plan === 'STARTER') return 49;
    if (company.plan === 'GROWTH') return 89;
    if (company.plan === 'PRO') return 149;
    return 249;
  }, [company]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] p-6 text-white">
        Loading company...
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[#05070c] p-6 text-red-300">
        {error || 'Company not found'}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Company Detail"
          title={company.companyName}
          description={`Company ID: ${company.id}`}
          actions={
            <>
              <Link
                href="/super-admin/companies"
                className={btnOutline}
              >
                Back
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/edit`}
                className={btnPrimary}
              >
                Edit
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/billing`}
                className={btnOutline}
              >
                Billing
              </Link>
            </>
          }
        />

        {(success || error) && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm">
            {success || error}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SuperAdminStatCard label="Drivers" value={company.drivers} />
          <SuperAdminStatCard label="Vehicles" value={company.vehicles} />
          <SuperAdminStatCard label="Users" value={company.activeUsers} />
          <SuperAdminStatCard label="Plan" value={company.plan} />
          <SuperAdminStatCard label="Monthly" value={formatCurrency(monthly)} />
          <SuperAdminStatCard label="Usage" value={company.usageHealth} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <SuperAdminPanel title="Company Information">
              <div className="space-y-3">
                <SuperAdminDetailRow label="Name" value={company.companyName} />
                <SuperAdminDetailRow label="Code" value={company.code} />
                <SuperAdminDetailRow label="Slug" value={company.slug} />
                <SuperAdminDetailRow label="Owner" value={company.ownerName} />
                <SuperAdminDetailRow label="Email" value={company.ownerEmail} />
                <SuperAdminDetailRow label="Phone" value={company.ownerPhone} />
                <SuperAdminDetailRow label="Timezone" value={company.timezone} />
                <SuperAdminDetailRow label="Currency" value={company.currency} />
                <SuperAdminDetailRow label="Trial Ends" value={formatDate(company.trialEndsAt)} />
                <SuperAdminDetailRow label="Renewal" value={formatDate(company.renewalDate)} />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="User Management">
              <div className="mb-4 grid gap-4 md:grid-cols-3">
                <input
                  className={inputClass}
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      email: e.target.value,
                    }))
                  }
                />

                <select
                  className={inputClass}
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      role: e.target.value as UserRole,
                    }))
                  }
                >
                  <option>ADMIN</option>
                  <option>OPERATOR</option>
                  <option>DRIVER</option>
                  <option>SUPER_ADMIN</option>
                </select>

                <input
                  type="password"
                  className={inputClass}
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      password: e.target.value,
                    }))
                  }
                />
              </div>

              <button
                onClick={createUser}
                disabled={busy === 'create-user'}
                className={btnPrimary}
              >
                Create User
              </button>

              <div className="mt-6 space-y-3">
                {company.users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="font-semibold">{user.email}</div>
                    <div className="mt-1 text-xs text-white/50">
                      {user.role} · {user.status} · {formatDateTime(user.createdAt)}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() =>
                            updateUserStatus(user.id, 'SUSPENDED')
                          }
                          className={btnDanger}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateUserStatus(user.id, 'ACTIVE')
                          }
                          className={btnSuccess}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Internal Notes">
              <textarea
                rows={8}
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="mt-4">
                <button
                  onClick={saveNotes}
                  disabled={busy === 'notes'}
                  className={btnPrimary}
                >
                  Save Notes
                </button>
              </div>
            </SuperAdminPanel>
          </section>

          <section className="space-y-6">
            <SuperAdminPanel title="Usage">
              <div className="space-y-3">
                <SuperAdminDetailRow
                  label="Driver Limit"
                  value={String(company.drivers)}
                />
                <SuperAdminDetailRow
                  label="Vehicle Limit"
                  value={String(company.vehicles)}
                />
                <SuperAdminDetailRow
                  label="Dispatcher Seats"
                  value={String(company.dispatcherSeatLimit)}
                />
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}