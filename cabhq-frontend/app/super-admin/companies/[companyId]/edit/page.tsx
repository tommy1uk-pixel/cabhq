'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';
import SuperAdminDetailRow from '@/components/super-admin/SuperAdminDetailRow';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

/* =====================================================
   TYPES
===================================================== */

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
  code: string;
  slug: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
  currency: string;
  driverLimit: number;
  vehicleLimit: number;
  dispatcherSeatLimit: number;
  billingPlan: string;
  billingStatus: string;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
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

/* =====================================================
   HELPERS
===================================================== */

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

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function deriveUsageHealth(company: ApiCompany): UsageHealth {
  const total =
    (company.driverLimit ?? 0) +
    (company.vehicleLimit ?? 0) +
    (company.dispatcherSeatLimit ?? 0);

  if (total >= 100) return 'HIGH';
  if (total >= 40) return 'GOOD';
  return 'LIMITED';
}

function mapCompany(company: ApiCompany): CompanyDetail {
  return {
    id: company.id,
    companyName: company.name || 'Untitled Company',
    code: company.code,
    slug: company.slug,
    status:
      company.billingStatus === 'TRIAL'
        ? 'TRIAL'
        : ((company.status?.toUpperCase() as CompanyStatus) || 'PENDING'),
    plan: company.billingPlan || 'STARTER',
    createdAt: company.createdAt,
    renewalDate: company.subscriptionEndsAt,
    paymentStatus: company.billingStatus || 'TRIAL',

    monthlyRevenue: 0,
    unpaidInvoices: 0,
    bookingsMonth: 0,
    apiCalls: 0,
    smsUsed: 0,
    emailsSent: 0,
    storageGb: 0,

    drivers: company.driverLimit ?? 0,
    vehicles: company.vehicleLimit ?? 0,
    activeUsers:
      company.users?.filter((u) => u.status === 'ACTIVE').length ?? 0,

    usageHealth: deriveUsageHealth(company),

    ownerName: company.contactName?.trim() || 'No contact assigned',
    ownerEmail: company.contactEmail?.trim() || 'No email',
    ownerPhone: company.contactPhone?.trim() || 'No phone',

    salesRep: 'Unassigned',
    lastContactAt: company.updatedAt,
    internalNotes: company.internalNotes || '',

    timezone: company.timezone,
    currency: company.currency,
    dispatcherSeatLimit: company.dispatcherSeatLimit ?? 0,
    trialEndsAt: company.trialEndsAt,
    subscriptionStartsAt: company.subscriptionStartsAt,

    users: company.users ?? [],
  };
}

/* =====================================================
   STYLES
===================================================== */

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-cyan-500/50';

const buttonPrimary =
  'rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50';

const buttonDanger =
  'rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50';

const buttonSuccess =
  'rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50';

const buttonOutline =
  'rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50';

/* =====================================================
   PAGE
===================================================== */

export default function SuperAdminCompanyDetailPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    password: '',
    role: 'ADMIN',
  });

  const [creatingUser, setCreatingUser] = useState(false);
  const [userBusyId, setUserBusyId] = useState<string | null>(null);

  const [quickBusy, setQuickBusy] = useState<string | null>(null);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  /* =====================================================
     DATA
  ===================================================== */

  async function loadCompany() {
    if (!companyId) return;

    const res = await fetch(`${API_URL}/companies/${companyId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to load company (${res.status})`);
    }

    const data = (await res.json()) as ApiCompany;

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

        await loadCompany();
      } catch (err) {
        if (!active) return;

        setPageError(
          err instanceof Error ? err.message : 'Failed to load company',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [companyId]);

  function notifySuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 1800);
  }

  function notifyError(message: string) {
    setError(message);
    setTimeout(() => setError(''), 2500);
  }

  /* =====================================================
     NOTES
  ===================================================== */

  async function saveNotes() {
    if (!companyId) return;

    try {
      setNotesSaving(true);

      const res = await fetch(`${API_URL}/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalNotes: notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to save notes');

      await loadCompany();
      notifySuccess('Notes saved');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to save notes',
      );
    } finally {
      setNotesSaving(false);
    }
  }

  /* =====================================================
     USERS
  ===================================================== */

  async function createUser() {
    if (!companyId) return;

    if (!newUser.email.trim()) {
      return notifyError('Email required');
    }

    if (newUser.password.length < 8) {
      return notifyError('Password must be at least 8 characters');
    }

    try {
      setCreatingUser(true);

      const res = await fetch(
        `${API_URL}/companies/${companyId}/users`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        },
      );

      if (!res.ok) throw new Error('Failed to create user');

      setNewUser({
        email: '',
        password: '',
        role: 'ADMIN',
      });

      await loadCompany();
      notifySuccess('User created');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to create user',
      );
    } finally {
      setCreatingUser(false);
    }
  }

  async function updateUserStatus(
    userId: string,
    status: UserStatus,
  ) {
    if (!companyId) return;

    try {
      setUserBusyId(userId);

      const res = await fetch(
        `${API_URL}/companies/${companyId}/users/${userId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );

      if (!res.ok) throw new Error('Failed to update user');

      await loadCompany();
      notifySuccess('User updated');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to update user',
      );
    } finally {
      setUserBusyId(null);
    }
  }

  async function resetPassword(
    userId: string,
    email: string,
  ) {
    if (!companyId) return;

    const password = window.prompt(
      `Enter new password for ${email}`,
    );

    if (!password) return;

    try {
      setUserBusyId(userId);

      const res = await fetch(
        `${API_URL}/companies/${companyId}/users/${userId}/password`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        },
      );

      if (!res.ok) throw new Error('Failed to reset password');

      notifySuccess('Password reset');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed password reset',
      );
    } finally {
      setUserBusyId(null);
    }
  }

  /* =====================================================
     QUICK ACTIONS
  ===================================================== */

  async function patchCompanyStatus(
    status: 'ACTIVE' | 'PENDING' | 'SUSPENDED',
  ) {
    if (!companyId) return;

    try {
      setQuickBusy(status);

      const res = await fetch(
        `${API_URL}/companies/${companyId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );

      if (!res.ok) throw new Error('Failed status update');

      await loadCompany();
      notifySuccess('Company updated');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed status update',
      );
    } finally {
      setQuickBusy(null);
    }
  }

  async function extendTrial() {
    if (!companyId) return;

    const value = window.prompt(
      'New trial end date',
      toDateInput(company?.trialEndsAt) || addDays(14),
    );

    if (!value) return;

    try {
      setQuickBusy('trial');

      const res = await fetch(
        `${API_URL}/companies/${companyId}/extend-trial`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: value }),
        },
      );

      if (!res.ok) throw new Error('Failed to extend trial');

      await loadCompany();
      notifySuccess('Trial extended');
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed trial update',
      );
    } finally {
      setQuickBusy(null);
    }
  }

  /* =====================================================
     MEMO
  ===================================================== */

  const monthlyPlanPrice = useMemo(() => {
    if (!company) return 0;

    if (company.plan === 'STARTER') return 49;
    if (company.plan === 'GROWTH') return 89;
    if (company.plan === 'PRO') return 149;

    return 249;
  }, [company]);

  /* =====================================================
     RENDER
  ===================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] p-6 text-white">
        Loading company...
      </main>
    );
  }

  if (!company || pageError) {
    return (
      <main className="min-h-screen bg-[#05070c] p-6 text-red-300">
        {pageError || 'Company not found'}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Company Detail"
          title={company.companyName}
          description={`Company ID: ${company.id} · Created ${formatDate(
            company.createdAt,
          )}`}
          actions={
            <>
              <Link href="/super-admin/companies" className={buttonOutline}>
                Back
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/edit`}
                className={buttonPrimary}
              >
                Edit Company
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/billing`}
                className={buttonOutline}
              >
                Billing
              </Link>
            </>
          }
        />

        {(success || error) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {success || error}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SuperAdminStatCard label="Drivers" value={company.drivers} />
          <SuperAdminStatCard label="Vehicles" value={company.vehicles} />
          <SuperAdminStatCard
            label="Users"
            value={company.activeUsers}
          />
          <SuperAdminStatCard
            label="Plan"
            value={company.plan}
          />
          <SuperAdminStatCard
            label="Monthly"
            value={formatCurrency(monthlyPlanPrice)}
          />
          <SuperAdminStatCard
            label="Usage"
            value={company.usageHealth}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT */}
          <section className="space-y-6">
            <SuperAdminPanel title="Company Information">
              <div className="space-y-3">
                <SuperAdminDetailRow
                  label="Company"
                  value={company.companyName}
                />
                <SuperAdminDetailRow
                  label="Code"
                  value={company.code}
                />
                <SuperAdminDetailRow
                  label="Slug"
                  value={company.slug}
                />
                <SuperAdminDetailRow
                  label="Owner"
                  value={company.ownerName}
                />
                <SuperAdminDetailRow
                  label="Email"
                  value={company.ownerEmail}
                />
                <SuperAdminDetailRow
                  label="Phone"
                  value={company.ownerPhone}
                />
                <SuperAdminDetailRow
                  label="Timezone"
                  value={company.timezone}
                />
                <SuperAdminDetailRow
                  label="Currency"
                  value={company.currency}
                />
                <SuperAdminDetailRow
                  label="Trial Ends"
                  value={formatDate(company.trialEndsAt)}
                />
                <SuperAdminDetailRow
                  label="Renewal"
                  value={formatDate(company.renewalDate)}
                />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="User Management">
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <input
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      email: e.target.value,
                    }))
                  }
                  className={inputClass}
                />

                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className={inputClass}
                >
                  <option>ADMIN</option>
                  <option>OPERATOR</option>
                  <option>DRIVER</option>
                  <option>SUPER_ADMIN</option>
                </select>

                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((p) => ({
                      ...p,
                      password: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <button
                onClick={createUser}
                disabled={creatingUser}
                className={buttonPrimary}
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>

              <div className="mt-6 space-y-3">
                {company.users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="font-semibold">{user.email}</div>

                    <div className="mt-1 text-xs text-white/50">
                      {user.role} · {user.status} · Created{' '}
                      {formatDateTime(user.createdAt)}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() =>
                            updateUserStatus(
                              user.id,
                              'SUSPENDED',
                            )
                          }
                          disabled={userBusyId === user.id}
                          className={buttonDanger}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateUserStatus(
                              user.id,
                              'ACTIVE',
                            )
                          }
                          disabled={userBusyId === user.id}
                          className={buttonSuccess}
                        >
                          Activate
                        </button>
                      )}

                      <button
                        onClick={() =>
                          resetPassword(
                            user.id,
                            user.email,
                          )
                        }
                        disabled={userBusyId === user.id}
                        className={buttonOutline}
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Internal Notes">
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />

              <div className="mt-4">
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className={buttonPrimary}
                >
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </SuperAdminPanel>
          </section>

          {/* RIGHT */}
          <section className="space-y-6">
            <SuperAdminPanel title="Quick Actions">
              <div className="grid gap-3">
                <button
                  onClick={extendTrial}
                  disabled={quickBusy === 'trial'}
                  className={buttonPrimary}
                >
                  Extend Trial
                </button>

                <button
                  onClick={() =>
                    patchCompanyStatus('ACTIVE')
                  }
                  disabled={quickBusy === 'ACTIVE'}
                  className={buttonSuccess}
                >
                  Mark Active
                </button>

                <button
                  onClick={() =>
                    patchCompanyStatus('PENDING')
                  }
                  disabled={quickBusy === 'PENDING'}
                  className={buttonOutline}
                >
                  Mark Pending
                </button>

                <button
                  onClick={() =>
                    patchCompanyStatus('SUSPENDED')
                  }
                  disabled={quickBusy === 'SUSPENDED'}
                  className={buttonDanger}
                >
                  Suspend Company
                </button>
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Usage">
              <div className="space-y-3">
                <SuperAdminDetailRow
                  label="Driver Limit"
                  value={company.drivers.toString()}
                />
                <SuperAdminDetailRow
                  label="Vehicle Limit"
                  value={company.vehicles.toString()}
                />
                <SuperAdminDetailRow
                  label="Dispatcher Seats"
                  value={company.dispatcherSeatLimit.toString()}
                />
                <SuperAdminDetailRow
                  label="API Calls"
                  value={company.apiCalls.toString()}
                />
                <SuperAdminDetailRow
                  label="SMS Used"
                  value={company.smsUsed.toString()}
                />
                <SuperAdminDetailRow
                  label="Emails Sent"
                  value={company.emailsSent.toString()}
                />
                <SuperAdminDetailRow
                  label="Storage"
                  value={`${company.storageGb} GB`}
                />
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}