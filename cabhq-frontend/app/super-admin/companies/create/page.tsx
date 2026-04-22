'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';

type PlanType = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type StatusType = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
type BillingStatusType = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';

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
  trialDays: string;
  billingStart: string;
  billingEnd: string;

  timezone: string;
  currency: string;

  driverLimit: string;
  vehicleLimit: string;
  dispatcherSeatLimit: string;

  createAdminUser: boolean;
  adminPassword: string;
  createSampleDrivers: boolean;
  createSampleVehicles: boolean;
  createDefaultRates: boolean;
};

const initialForm: FormState = {
  companyName: '',
  code: '',
  slug: '',
  contactName: '',
  email: '',
  phone: '',

  plan: 'GROWTH',
  status: 'PENDING',
  billingStatus: 'TRIAL',
  trialDays: '14',
  billingStart: '',
  billingEnd: '',

  timezone: 'Europe/London',
  currency: 'GBP',

  driverLimit: '10',
  vehicleLimit: '10',
  dispatcherSeatLimit: '3',

  createAdminUser: true,
  adminPassword: '',
  createSampleDrivers: true,
  createSampleVehicles: true,
  createDefaultRates: true,
};

const planMeta: Record<PlanType, { label: string; price: string }> = {
  STARTER: { label: 'Starter', price: '£49/mo' },
  GROWTH: { label: 'Growth', price: '£89/mo' },
  PRO: { label: 'Pro', price: '£149/mo' },
  ENTERPRISE: { label: 'Enterprise', price: '£249+/mo' },
};

function addDaysToToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function CreateCompanyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [createdName, setCreatedName] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    return {
      modules:
        Number(form.createAdminUser) +
        Number(form.createSampleDrivers) +
        Number(form.createSampleVehicles) +
        Number(form.createDefaultRates),
      plan: planMeta[form.plan],
    };
  }, [form]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validate() {
    if (!form.companyName.trim()) return 'Company name is required';
    if (!form.contactName.trim()) return 'Contact name is required';
    if (!form.email.trim()) return 'Email is required';

    if (form.createAdminUser && !form.adminPassword.trim()) {
      return 'Admin password is required when creating an admin user';
    }

    if (form.createAdminUser && form.adminPassword.trim().length < 8) {
      return 'Admin password must be at least 8 characters';
    }

    return '';
  }

  async function createCompany() {
    const msg = validate();

    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const trialEndsAt =
        form.billingStatus === 'TRIAL'
          ? addDaysToToday(Number(form.trialDays || '14'))
          : null;

      const payload = {
        name: form.companyName.trim(),
        code: form.code.trim() || null,
        slug: form.slug.trim() || null,
        status: form.status,
        contactName: form.contactName.trim() || null,
        contactEmail: form.email.trim() || null,
        contactPhone: form.phone.trim() || null,
        timezone: form.timezone,
        currency: form.currency,
        driverLimit: Number(form.driverLimit || '10'),
        vehicleLimit: Number(form.vehicleLimit || '10'),
        dispatcherSeatLimit: Number(form.dispatcherSeatLimit || '3'),
        billingPlan: form.plan,
        billingStatus: form.billingStatus,
        trialEndsAt,
        subscriptionStartsAt: form.billingStart || null,
        subscriptionEndsAt: form.billingEnd || null,
        adminEmail: form.createAdminUser ? form.email.trim() : null,
        adminPassword: form.createAdminUser ? form.adminPassword.trim() : null,
      };

      const res = await fetch(`${API_URL}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(bodyText || `Failed to create company (${res.status})`);
      }

      const created = await res.json();

      setCreatedId(created.id);
      setCreatedName(created.name || form.companyName);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#03060d] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-white/10 bg-[#07111f] p-10 text-center">
            <div className="mx-auto mb-5 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              Company Created
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              {createdName}
            </h1>

            <p className="mt-4 text-white/60">
              Company ID: {createdId}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/super-admin/companies"
                className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
              >
                View Companies
              </Link>

              <Link
                href={`/super-admin/companies/${createdId}`}
                className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
              >
                Open Company
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03060d] text-white">
      <div className="mx-auto max-w-[1500px] px-6 py-12">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
            Super Admin
          </div>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Create Company
          </h1>

          <p className="mt-3 text-white/60">
            Create a new taxi operator account with billing plan and starter setup.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border border-white/10 bg-[#07111f] p-8">
            <div className="space-y-8">
              <div>
                <SectionTitle
                  title="Company Information"
                  text="Primary account and contact details."
                />

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
                <SectionTitle
                  title="Subscription Setup"
                  text="Plan, status and billing."
                />

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
                    label="Trial Days"
                    input={
                      <input
                        value={form.trialDays}
                        onChange={(e) => setField('trialDays', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Billing Start"
                    input={
                      <input
                        type="date"
                        value={form.billingStart}
                        onChange={(e) => setField('billingStart', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Billing End"
                    input={
                      <input
                        type="date"
                        value={form.billingEnd}
                        onChange={(e) => setField('billingEnd', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>

              <div>
                <SectionTitle
                  title="System Defaults"
                  text="Operational limits and defaults for new company."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Timezone"
                    input={
                      <select
                        value={form.timezone}
                        onChange={(e) => setField('timezone', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    }
                  />

                  <Field
                    label="Currency"
                    input={
                      <select
                        value={form.currency}
                        onChange={(e) => setField('currency', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="GBP">GBP</option>
                      </select>
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
                        onChange={(e) =>
                          setField('dispatcherSeatLimit', e.target.value)
                        }
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>

              <div>
                <SectionTitle
                  title="Starter Data"
                  text="Optional setup content."
                />

                <div className="mt-5 grid gap-3">
                  <Toggle
                    label="Create admin user"
                    checked={form.createAdminUser}
                    onChange={(v) => setField('createAdminUser', v)}
                  />

                  {form.createAdminUser ? (
                    <Field
                      label="Admin Password"
                      input={
                        <input
                          type="password"
                          value={form.adminPassword}
                          onChange={(e) => setField('adminPassword', e.target.value)}
                          className={inputClassName}
                        />
                      }
                    />
                  ) : null}

                  <Toggle
                    label="Create sample drivers"
                    checked={form.createSampleDrivers}
                    onChange={(v) => setField('createSampleDrivers', v)}
                  />
                  <Toggle
                    label="Create sample vehicles"
                    checked={form.createSampleVehicles}
                    onChange={(v) => setField('createSampleVehicles', v)}
                  />
                  <Toggle
                    label="Create default rates"
                    checked={form.createDefaultRates}
                    onChange={(v) => setField('createDefaultRates', v)}
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                onClick={createCompany}
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-500 px-5 py-4 font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving ? 'Creating Company...' : 'Create Company'}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <h3 className="text-xl font-bold">Summary</h3>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Plan" value={summary.plan.label} />
                <SummaryRow label="Price" value={summary.plan.price} />
                <SummaryRow label="Company Status" value={form.status} />
                <SummaryRow label="Billing Status" value={form.billingStatus} />
                <SummaryRow label="Trial Days" value={form.trialDays} />
                <SummaryRow label="Starter Items" value={String(summary.modules)} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <h3 className="text-xl font-bold">Use Cases</h3>

              <div className="mt-4 space-y-3 text-sm text-white/65">
                <p>• Sales demo accounts</p>
                <p>• Instant operator onboarding</p>
                <p>• Competitor migration setup</p>
                <p>• Trial creation</p>
                <p>• Manual support provisioning</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <Link
                href="/super-admin/companies"
                className="block rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Companies
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-white/60">{text}</p>
    </div>
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
        checked
          ? 'border-cyan-500/30 bg-cyan-500/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <span>{label}</span>
      <span>{checked ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-b-0">
      <span className="text-sm text-white/55">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50';