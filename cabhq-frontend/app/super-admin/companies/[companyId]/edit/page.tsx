'use client';

import Link from 'next/link';
import { useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';
type StatusType = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

type FormState = {
  companyName: string;
  tradingName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  plan: PlanType;
  status: StatusType;
  timezone: string;
  currency: string;
  region: string;
  dispatchMode: string;
};

const initialForm: FormState = {
  companyName: 'Alpha Cars',
  tradingName: 'Alpha Cars',
  contactName: 'Tommy Brown',
  email: 'ops@alphacars.co.uk',
  phone: '0207 555 1000',
  address: '1 Dispatch House, London',
  plan: 'OPERATOR',
  status: 'ACTIVE',
  timezone: 'Europe/London',
  currency: 'GBP',
  region: 'United Kingdom',
  dispatchMode: 'AUTO',
};

export default function EditCompanyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveCompany() {
    try {
      setSaving(true);
      setSaved(false);

      // real PATCH here

      await new Promise((resolve) => setTimeout(resolve, 800));
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } finally {
      setSaving(false);
    }
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
              Update company profile, plan, status and default settings.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/super-admin/companies/cmp_alpha_001"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Company
            </Link>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#07111f] p-8">
          <div className="grid gap-8">
            <div>
              <h2 className="text-2xl font-bold">Core Information</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Company Name" input={<input value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} className={inputClassName} />} />
                <Field label="Trading Name" input={<input value={form.tradingName} onChange={(e) => setField('tradingName', e.target.value)} className={inputClassName} />} />
                <Field label="Contact Name" input={<input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} className={inputClassName} />} />
                <Field label="Email" input={<input value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClassName} />} />
                <Field label="Phone" input={<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClassName} />} />
              </div>

              <div className="mt-4">
                <Field
                  label="Address"
                  input={
                    <textarea
                      rows={4}
                      value={form.address}
                      onChange={(e) => setField('address', e.target.value)}
                      className={`${inputClassName} resize-none`}
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
                      <option value="OPERATOR">Operator</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  }
                />
                <Field
                  label="Status"
                  input={
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value as StatusType)}
                      className={inputClassName}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="TRIAL">Trial</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  }
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Defaults</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Timezone"
                  input={<input value={form.timezone} onChange={(e) => setField('timezone', e.target.value)} className={inputClassName} />}
                />
                <Field
                  label="Currency"
                  input={<input value={form.currency} onChange={(e) => setField('currency', e.target.value)} className={inputClassName} />}
                />
                <Field
                  label="Region"
                  input={<input value={form.region} onChange={(e) => setField('region', e.target.value)} className={inputClassName} />}
                />
                <Field
                  label="Dispatch Mode"
                  input={
                    <select
                      value={form.dispatchMode}
                      onChange={(e) => setField('dispatchMode', e.target.value)}
                      className={inputClassName}
                    >
                      <option value="AUTO">Auto</option>
                      <option value="MANUAL">Manual</option>
                    </select>
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