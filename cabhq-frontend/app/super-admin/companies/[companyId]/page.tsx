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
  monthlyRevenue: number;
  unpaidInvoices: number;
  drivers: number;
  vehicles: number;
  activeUsers: number;
  bookingsMonth: number;
  apiCalls: number;
  smsUsed: number;
  emailsSent: number;
  storageGb: number;
  usageHealth: UsageHealth;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  salesRep: string;
  lastContactAt: string | null;
  internalNotes: string;
  timezone: string;
  currency: string;
  dispatcherSeatLimit: number;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  users: ApiCompanyUser[];
};

type NewUserForm = {
  email: string;
  password: string;
  role: UserRole;
};

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function addDaysToToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusClass(status: CompanyStatus) {
  if (status === 'ACTIVE') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'TRIAL') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (status === 'PENDING') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function planClass(plan: PlanType) {
  if (plan === 'STARTER') return 'border-white/10 bg-white/5 text-white/75';
  if (plan === 'GROWTH') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (plan === 'PRO') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  if (plan === 'ENTERPRISE') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

function paymentClass(status: PaymentStatus) {
  if (status === 'ACTIVE') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'TRIAL') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (status === 'PAST_DUE') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

function usageClass(health: UsageHealth) {
  if (health === 'GOOD') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (health === 'HIGH') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function userStatusClass(status: string) {
  return status === 'ACTIVE'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/30 bg-red-500/10 text-red-300';
}

function userRoleClass(role: string) {
  if (role === 'ADMIN') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (role === 'OPERATOR') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  if (role === 'DRIVER') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

function deriveUsageHealth(apiCompany: ApiCompany): UsageHealth {
  const capacityTotal =
    (apiCompany.driverLimit ?? 0) +
    (apiCompany.vehicleLimit ?? 0) +
    (apiCompany.dispatcherSeatLimit ?? 0);

  if (capacityTotal >= 100) return 'HIGH';
  if (capacityTotal >= 40) return 'GOOD';
  return 'LIMITED';
}

function mapCompany(apiCompany: ApiCompany): CompanyDetail {
  const status =
    apiCompany.billingStatus === 'TRIAL'
      ? 'TRIAL'
      : ((apiCompany.status?.toUpperCase?.() as CompanyStatus) || 'PENDING');

  return {
    id: apiCompany.id,
    companyName: apiCompany.name || 'Untitled Company',
    code: apiCompany.code || '—',
    slug: apiCompany.slug || '—',
    status,
    plan: apiCompany.billingPlan || 'STARTER',
    createdAt: apiCompany.createdAt,
    renewalDate: apiCompany.subscriptionEndsAt ?? null,
    paymentStatus: apiCompany.billingStatus || 'TRIAL',
    monthlyRevenue: 0,
    unpaidInvoices: 0,
    drivers: apiCompany.driverLimit ?? 0,
    vehicles: apiCompany.vehicleLimit ?? 0,
    activeUsers: apiCompany.users?.filter((u) => u.status === 'ACTIVE').length ?? 0,
    bookingsMonth: 0,
    apiCalls: 0,
    smsUsed: 0,
    emailsSent: 0,
    storageGb: 0,
    usageHealth: deriveUsageHealth(apiCompany),
    ownerName: apiCompany.contactName?.trim() || 'No contact assigned',
    ownerEmail: apiCompany.contactEmail?.trim() || 'No email',
    ownerPhone: apiCompany.contactPhone?.trim() || 'No phone',
    salesRep: 'Unassigned',
    lastContactAt: apiCompany.updatedAt,
    internalNotes: apiCompany.internalNotes || '',
    timezone: apiCompany.timezone || 'Europe/London',
    currency: apiCompany.currency || 'GBP',
    dispatcherSeatLimit: apiCompany.dispatcherSeatLimit ?? 0,
    trialEndsAt: apiCompany.trialEndsAt ?? null,
    subscriptionStartsAt: apiCompany.subscriptionStartsAt ?? null,
    users: apiCompany.users ?? [],
  };
}

export default function SuperAdminCompanyDetailPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    password: '',
    role: 'ADMIN',
  });

  const [userActionError, setUserActionError] = useState('');
  const [userActionSuccess, setUserActionSuccess] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);

  const [quickActionError, setQuickActionError] = useState('');
  const [quickActionSuccess, setQuickActionSuccess] = useState('');
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);

  async function loadCompany() {
    if (!companyId) return;

    const data = await apiFetch<ApiCompany>(`/companies/${companyId}`);
    const mapped = mapCompany(data);

    setCompany(mapped);
    setNotes(mapped.internalNotes);
  }

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    async function run() {
      try {
        setLoading(true);
        setPageError('');

        const data = await apiFetch<ApiCompany>(`/companies/${companyId}`);

        if (!active) return;

        const mapped = mapCompany(data);
        setCompany(mapped);
        setNotes(mapped.internalNotes);
      } catch (err) {
        if (!active) return;
        setPageError(err instanceof Error ? err.message : 'Failed to load company');
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [companyId]);

  const billingTotal = useMemo(() => {
    if (!company) return 0;

    return company.plan === 'STARTER'
      ? 49
      : company.plan === 'GROWTH'
        ? 89
        : company.plan === 'PRO'
          ? 149
          : 249;
  }, [company]);

  async function saveNotes() {
    if (!companyId) return;

    try {
      setSaved(false);
      setQuickActionError('');
      setQuickActionSuccess('');
      setQuickActionLoading('save-notes');

      await apiFetch<ApiCompany>(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          internalNotes: notes,
        }),
      });

      await loadCompany();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (err) {
      setQuickActionError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setQuickActionLoading(null);
    }
  }

  async function createCompanyUser() {
    if (!companyId) return;

    if (!newUser.email.trim()) {
      setUserActionError('User email is required');
      return;
    }

    if (!newUser.password.trim() || newUser.password.trim().length < 8) {
      setUserActionError('Password must be at least 8 characters');
      return;
    }

    try {
      setCreatingUser(true);
      setUserActionError('');
      setUserActionSuccess('');

      await apiFetch(`/companies/${companyId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: newUser.email.trim(),
          password: newUser.password.trim(),
          role: newUser.role,
        }),
      });

      await loadCompany();

      setNewUser({
        email: '',
        password: '',
        role: 'ADMIN',
      });

      setUserActionSuccess('User created');
      setTimeout(() => setUserActionSuccess(''), 1500);
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  }

  async function updateUserStatus(userId: string, status: UserStatus) {
    if (!companyId) return;

    try {
      setStatusUpdatingUserId(userId);
      setUserActionError('');
      setUserActionSuccess('');

      await apiFetch(`/companies/${companyId}/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      await loadCompany();
      setUserActionSuccess(`User marked ${status.toLowerCase()}`);
      setTimeout(() => setUserActionSuccess(''), 1500);
    } catch (err) {
      setUserActionError(
        err instanceof Error ? err.message : 'Failed to update user status',
      );
    } finally {
      setStatusUpdatingUserId(null);
    }
  }

  async function resetUserPassword(userId: string, email: string) {
    if (!companyId) return;

    const password = window.prompt(`Enter a new password for ${email}`);
    if (!password) return;

    try {
      setPasswordResetUserId(userId);
      setUserActionError('');
      setUserActionSuccess('');

      await apiFetch(`/companies/${companyId}/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });

      setUserActionSuccess('Password reset');
      setTimeout(() => setUserActionSuccess(''), 1500);
    } catch (err) {
      setUserActionError(
        err instanceof Error ? err.message : 'Failed to reset password',
      );
    } finally {
      setPasswordResetUserId(null);
    }
  }

  async function patchCompanyStatus(nextStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    if (!companyId) return;

    try {
      setQuickActionLoading(`status-${nextStatus}`);
      setQuickActionError('');
      setQuickActionSuccess('');

      await apiFetch(`/companies/${companyId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      await loadCompany();
      setQuickActionSuccess(`Company marked ${nextStatus.toLowerCase()}`);
      setTimeout(() => setQuickActionSuccess(''), 1500);
    } catch (err) {
      setQuickActionError(
        err instanceof Error ? err.message : 'Failed to update company status',
      );
    } finally {
      setQuickActionLoading(null);
    }
  }

  async function extendTrial() {
    if (!companyId) return;

    const currentDate = toDateInput(company?.trialEndsAt);
    const trialInput = window.prompt(
      'Enter new trial end date (YYYY-MM-DD)',
      currentDate || addDaysToToday(14),
    );

    if (!trialInput) return;

    try {
      setQuickActionLoading('extend-trial');
      setQuickActionError('');
      setQuickActionSuccess('');

      await apiFetch(`/companies/${companyId}/extend-trial`, {
        method: 'POST',
        body: JSON.stringify({ trialEndsAt: trialInput }),
      });

      await loadCompany();
      setQuickActionSuccess('Trial extended');
      setTimeout(() => setQuickActionSuccess(''), 1500);
    } catch (err) {
      setQuickActionError(err instanceof Error ? err.message : 'Failed to extend trial');
    } finally {
      setQuickActionLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
          Loading company...
        </div>
      </main>
    );
  }

  if (pageError || !company) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {pageError || 'Company not found'}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Company Detail"
          title={company.companyName}
          description={`Company ID: ${company.id} · Created ${formatDate(company.createdAt)}`}
          actions={
            <>
              <Link
                href="/super-admin/companies"
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Companies
              </Link>
              <Link
                href={`/super-admin/companies/${company.id}/edit`}
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Edit Company
              </Link>
              <Link
                href={`/super-admin/companies/${company.id}/billing`}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                Open Billing
              </Link>
            </>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(company.status)}`}>
            {company.status}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planClass(company.plan)}`}>
            {company.plan}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentClass(company.paymentStatus)}`}>
            {company.paymentStatus}
          </span>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SuperAdminStatCard label="Drivers" value={company.drivers} />
          <SuperAdminStatCard label="Vehicles" value={company.vehicles} />
          <SuperAdminStatCard label="Bookings Month" value={company.bookingsMonth} />
          <SuperAdminStatCard label="Revenue Month" value={formatCurrency(company.monthlyRevenue)} />
          <SuperAdminStatCard label="Unpaid Invoices" value={company.unpaidInvoices} />
          <SuperAdminStatCard label="Active Users" value={company.activeUsers} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <SuperAdminPanel title="Company & Billing">
              <div className="space-y-3">
                <SuperAdminDetailRow label="Company Name" value={company.companyName} />
                <SuperAdminDetailRow label="Code" value={company.code} />
                <SuperAdminDetailRow label="Slug" value={company.slug} />
                <SuperAdminDetailRow label="Owner" value={company.ownerName} />
                <SuperAdminDetailRow label="Owner Email" value={company.ownerEmail} />
                <SuperAdminDetailRow label="Owner Phone" value={company.ownerPhone} />
                <SuperAdminDetailRow label="Current Plan" value={company.plan} />
                <SuperAdminDetailRow label="Plan Amount" value={formatCurrency(billingTotal)} />
                <SuperAdminDetailRow label="Billing Status" value={company.paymentStatus} />
                <SuperAdminDetailRow label="Trial Ends" value={formatDate(company.trialEndsAt)} />
                <SuperAdminDetailRow label="Subscription Starts" value={formatDate(company.subscriptionStartsAt)} />
                <SuperAdminDetailRow label="Renewal Date" value={formatDate(company.renewalDate)} />
                <SuperAdminDetailRow label="Timezone" value={company.timezone} />
                <SuperAdminDetailRow label="Currency" value={company.currency} />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="User Management">
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-4 text-lg font-semibold text-white">Create User</div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      value={newUser.email}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="user@company.com"
                      className={inputClassName}
                    />

                    <select
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          role: e.target.value as UserRole,
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="DRIVER">DRIVER</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>

                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Temporary password"
                      className={inputClassName}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={createCompanyUser}
                      disabled={creatingUser}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                      {creatingUser ? 'Creating...' : 'Create User'}
                    </button>

                    {userActionSuccess ? (
                      <span className="text-sm text-emerald-300">{userActionSuccess}</span>
                    ) : null}

                    {userActionError ? (
                      <span className="text-sm text-red-300">{userActionError}</span>
                    ) : null}
                  </div>
                </div>

                {company.users.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/55">
                    No users found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {company.users.map((user) => (
                      <div key={user.id} className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-white">{user.email}</div>
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${userRoleClass(user.role)}`}>
                                {user.role}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${userStatusClass(user.status)}`}>
                                {user.status}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-white/45">
                              Created {formatDateTime(user.createdAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {user.status === 'ACTIVE' ? (
                              <button
                                onClick={() => updateUserStatus(user.id, 'SUSPENDED')}
                                disabled={statusUpdatingUserId === user.id}
                                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                              >
                                {statusUpdatingUserId === user.id ? 'Updating...' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                                disabled={statusUpdatingUserId === user.id}
                                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                {statusUpdatingUserId === user.id ? 'Updating...' : 'Activate'}
                              </button>
                            )}

                            <button
                              onClick={() => resetUserPassword(user.id, user.email)}
                              disabled={passwordResetUserId === user.id}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                            >
                              {passwordResetUserId === user.id ? 'Resetting...' : 'Reset Password'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Usage">
              <div className="mb-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${usageClass(company.usageHealth)}`}>
                  {company.usageHealth} USAGE HEALTH
                </span>
              </div>
              <div className="space-y-3">
                <SuperAdminDetailRow label="Driver Limit" value={company.drivers.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Vehicle Limit" value={company.vehicles.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Dispatcher Seats" value={company.dispatcherSeatLimit.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="API Calls" value={company.apiCalls.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="SMS Used" value={company.smsUsed.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Emails Sent" value={company.emailsSent.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Storage" value={`${company.storageGb.toFixed(1)} GB`} />
                <SuperAdminDetailRow label="Last Contact" value={formatDateTime(company.lastContactAt)} />
                <SuperAdminDetailRow label="Sales Rep" value={company.salesRep} />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Internal CRM Notes">
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveNotes}
                  disabled={quickActionLoading === 'save-notes'}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {quickActionLoading === 'save-notes' ? 'Saving...' : 'Save Notes'}
                </button>
                {saved ? <span className="text-sm text-emerald-300">Saved</span> : null}
              </div>
            </SuperAdminPanel>
          </section>

          <section className="space-y-6">
            <SuperAdminPanel title="Quick Actions">
              <div className="grid gap-3">
                <button className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
                  Login as Company Admin
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                >
                  Open Company Dashboard
                </Link>

                <button
                  onClick={extendTrial}
                  disabled={quickActionLoading === 'extend-trial'}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {quickActionLoading === 'extend-trial' ? 'Updating...' : 'Extend Trial'}
                </button>

                <button
                  onClick={() => patchCompanyStatus('ACTIVE')}
                  disabled={quickActionLoading === 'status-ACTIVE'}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {quickActionLoading === 'status-ACTIVE' ? 'Updating...' : 'Mark Active'}
                </button>

                <button
                  onClick={() => patchCompanyStatus('PENDING')}
                  disabled={quickActionLoading === 'status-PENDING'}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {quickActionLoading === 'status-PENDING' ? 'Updating...' : 'Mark Pending'}
                </button>

                <button
                  onClick={() => patchCompanyStatus('SUSPENDED')}
                  disabled={quickActionLoading === 'status-SUSPENDED'}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {quickActionLoading === 'status-SUSPENDED' ? 'Updating...' : 'Disable Company'}
                </button>
              </div>

              {quickActionSuccess ? (
                <div className="mt-4 text-sm text-emerald-300">{quickActionSuccess}</div>
              ) : null}

              {quickActionError ? (
                <div className="mt-4 text-sm text-red-300">{quickActionError}</div>
              ) : null}
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-cyan-500/50';