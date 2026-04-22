'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';

type PlanType = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type StatusType = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
type BillingStatusType = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';

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
  createdAt: string;
  updatedAt: string;
  users?: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
};

type FormState = {
  companyName: string;
  code: string;
  slug: string;
  contactName: string;
  email: string;
  phone: string;
  plan: PlanType;
  status: StatusType;
  billingStatus: BillingStatusType;
  timezone: string;
  currency: string;
  driverLimit: string;
  vehicleLimit: string;
  dispatcherSeatLimit: string;
  trialEndsAt: string;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
};

const initialForm: FormState = {
  companyName: '',
  code: '',
  slug: '',
  contactName: '',
  email: '',
  phone: '',
  plan: 'STARTER',
  status: 'PENDING',
  billingStatus: 'TRIAL',
  timezone: 'Europe/London',
  currency: 'GBP',
  driverLimit: '10',
  vehicleLimit: '10',
  dispatcherSeatLimit: '3',
  trialEndsAt: '',
  subscriptionStartsAt: '',
  subscriptionEndsAt: '',
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function mapCompanyToForm(company: ApiCompany): FormState {
  return {
    companyName: company.name ?? '',
    code: company.code ?? '',
    slug: company.slug ?? '',
    contactName: company.contactName ?? '',
    email: company.contactEmail ?? '',
    phone: company.contactPhone ?? '',
    plan: (company.billingPlan as PlanType) || 'STARTER',
    status: (company.status as StatusType) || 'PENDING',
    billingStatus: (company.billingStatus as BillingStatusType) || 'TRIAL',
    timezone: company.timezone ?? 'Europe/London',
    currency: company.currency ?? 'GBP',
    driverLimit: String(company.driverLimit ?? 10),
    vehicleLimit: String(company.vehicleLimit ?? 10),
    dispatcherSeatLimit: String(company.dispatcherSeatLimit ?? 3),
    trialEndsAt: toDateInput(company.trialEndsAt),
    subscriptionStartsAt: toDateInput(company.subscriptionStartsAt),
    subscriptionEndsAt: toDateInput(company.subscriptionEndsAt),
  };
}

export default function EditCompanyPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;

  const [form, setForm] = useState<FormState>(initialForm);
  const [companyNameForTitle, setCompanyNameForTitle] = useState('Edit Company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    async function loadCompany() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_URL}/companies/${companyId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load company (${res.status})`);
        }

        const data = (await res.json()) as ApiCompany;

        if (!active) return;

        setForm(mapCompanyToForm(data));
        setCompanyNameForTitle(data.name || 'Edit Company');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load company');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCompany();

    return () => {
      active = false;
    };
  }, [companyId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveCompany() {
    if (!companyId) return;

    try {
      setSaving(true);
      setSaved(false);
      setError('');

      const payload = {
        name: form.companyName.trim() || null,
        code: form.code.trim() || null,
        slug: form.slug.trim() || null,
        contactName: form.contactName.trim() || null,
        contactEmail: form.email.trim() || null,
        contactPhone: form.phone.trim() || null,
        status: form.status,
        timezone: form.timezone.trim() || 'Europe/London',
        currency: form.currency.trim() || 'GBP',
        driverLimit: form.driverLimit ? Number(form.driverLimit) : null,
        vehicleLimit: form.vehicleLimit ? Number(form.vehicleLimit) : null,
        dispatcherSeatLimit: form.dispatcherSeatLimit
          ? Number(form.dispatcherSeatLimit)
          : null,
        billingPlan: form.plan,
        billingStatus: form.billingStatus,
        trialEndsAt: form.trialEndsAt || null,
        subscriptionStartsAt: form.subscriptionStartsAt || null,
        subscriptionEndsAt: form.subscriptionEndsAt || null,
      };

      const res = await fetch(`${API_URL}/companies/${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(bodyText || `Failed to save company (${res.status})`);
      }

      const updated = (await res.json()) as ApiCompany;
      setForm(mapCompanyToForm(updated));
      setCompanyNameForTitle(updated.name || 'Edit Company');
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#03060d] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1300px] rounded-2xl border border-white/10 bg-[#07111f] p-6 text-white/60">
          Loading company...
        </div>
      </main>
    );
  }

  if (error && !companyId) {
    return (
      <main className="min-h-screen bg-[#03060d] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1300px] rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03060d] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Super Admin
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Edit Company
            </h1>
            <p className="mt-2 text-white/60">
              Update company profile, plan, billing and default settings for {companyNameForTitle}.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/super-admin/companies/${companyId}`}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Company
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-[#07111f] p-8">
          <div className="grid gap-8">
            <div>
              <h2 className="text-2xl font-bold">Core Information</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Company Name"
                  input={
                    <input
                      value={form.companyName}
                      onChange={(e) => setField('companyName', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Company Code"
                  input={
                    <input
                      value={form.code}
                      onChange={(e) => setField('code', e.target.value.toUpperCase())}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Slug"
                  input={
                    <input
                      value={form.slug}
                      onChange={(e) => setField('slug', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Contact Name"
                  input={
                    <input
                      value={form.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Email"
                  input={
                    <input
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Phone"
                  input={
                    <input
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Subscription</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Plan"
                  input={
                    <select
                      value={form.plan}
                      onChange={(e) => setField('plan', e.target.value as PlanType)}
                      className={inputClassName}
                    >
                      <option value="STARTER">Starter</option>
                      <option value="GROWTH">Growth</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  }
                />
                <Field
                  label="Company Status"
                  input={
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value as StatusType)}
                      className={inputClassName}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  }
                />
                <Field
                  label="Billing Status"
                  input={
                    <select
                      value={form.billingStatus}
                      onChange={(e) =>
                        setField('billingStatus', e.target.value as BillingStatusType)
                      }
                      className={inputClassName}
                    >
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAST_DUE">Past Due</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  }
                />
                <Field
                  label="Trial Ends"
                  input={
                    <input
                      type="date"
                      value={form.trialEndsAt}
                      onChange={(e) => setField('trialEndsAt', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Subscription Starts"
                  input={
                    <input
                      type="date"
                      value={form.subscriptionStartsAt}
                      onChange={(e) => setField('subscriptionStartsAt', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Subscription Ends"
                  input={
                    <input
                      type="date"
                      value={form.subscriptionEndsAt}
                      onChange={(e) => setField('subscriptionEndsAt', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Limits & Defaults</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Timezone"
                  input={
                    <input
                      value={form.timezone}
                      onChange={(e) => setField('timezone', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Currency"
                  input={
                    <input
                      value={form.currency}
                      onChange={(e) => setField('currency', e.target.value.toUpperCase())}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Driver Limit"
                  input={
                    <input
                      type="number"
                      min="0"
                      value={form.driverLimit}
                      onChange={(e) => setField('driverLimit', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Vehicle Limit"
                  input={
                    <input
                      type="number"
                      min="0"
                      value={form.vehicleLimit}
                      onChange={(e) => setField('vehicleLimit', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Dispatcher Seat Limit"
                  input={
                    <input
                      type="number"
                      min="0"
                      value={form.dispatcherSeatLimit}
                      onChange={(e) => setField('dispatcherSeatLimit', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveCompany}
                disabled={saving}
                className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              {saved ? <span className="text-sm text-emerald-300">Saved</span> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  input,
}: {
  label: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/75">{label}</div>
      {input}
    </label>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50';