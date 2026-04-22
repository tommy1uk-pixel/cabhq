'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';

type OnboardingState = {
  companyName: string;
  tradingName: string;
  contactPhone: string;
  address: string;
  plan: PlanType;
  timezone: string;
  currency: string;
  firstDriverName: string;
  firstDriverPhone: string;
  firstVehicleReg: string;
  firstVehicleMake: string;
  firstVehicleModel: string;
  baseFare: string;
  pricePerMile: string;
  waitingPerMinute: string;
};

const initialState: OnboardingState = {
  companyName: 'Alpha Cars',
  tradingName: '',
  contactPhone: '',
  address: '',
  plan: 'OPERATOR',
  timezone: 'Europe/London',
  currency: 'GBP',
  firstDriverName: '',
  firstDriverPhone: '',
  firstVehicleReg: '',
  firstVehicleMake: '',
  firstVehicleModel: '',
  baseFare: '3.50',
  pricePerMile: '1.80',
  waitingPerMinute: '0.25',
};

const steps = [
  'Company',
  'Operations',
  'Driver',
  'Vehicle',
  'Rates',
  'Review',
] as const;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingState>(initialState);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  function setField<K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() {
    if (step < steps.length - 1) setStep((prev) => prev + 1);
  }

  function prevStep() {
    if (step > 0) setStep((prev) => prev - 1);
  }

  function validateCurrentStep() {
    if (step === 0) {
      return form.companyName.trim() && form.contactPhone.trim();
    }
    if (step === 2) {
      return form.firstDriverName.trim() && form.firstDriverPhone.trim();
    }
    if (step === 3) {
      return form.firstVehicleReg.trim();
    }
    return true;
  }

  async function finishSetup() {
    try {
      setSaving(true);

      // Replace with real API call
      // await fetch('/api/onboarding', { method: 'POST', ... })

      await new Promise((resolve) => setTimeout(resolve, 900));
      setComplete(true);
    } finally {
      setSaving(false);
    }
  }

  if (complete) {
    return (
      <main className="min-h-screen bg-[#03060d] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-white/10 bg-[#07111f] p-10 text-center">
            <div className="mx-auto mb-5 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              Setup Complete
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Your CabHQ workspace is ready
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-white/65">
              You can now go to your dashboard, dispatch board and start adding
              live bookings, drivers and vehicles.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
              >
                Go to Dashboard
              </Link>

              <Link
                href="/dispatch"
                className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
              >
                Open Dispatch
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03060d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Onboarding Wizard
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Finish setting up your company
            </h1>
            <p className="mt-3 text-white/60">
              Add your first driver, first vehicle and default rates so CabHQ is
              ready to use.
            </p>
          </div>

          <div className="min-w-[220px]">
            <div className="mb-2 flex items-center justify-between text-sm text-white/55">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-[#07111f] p-4">
            <div className="space-y-2">
              {steps.map((label, index) => {
                const active = step === index;
                const done = index < step;

                return (
                  <div
                    key={label}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                      active
                        ? 'bg-cyan-500 text-black'
                        : done
                        ? 'bg-white/10 text-white'
                        : 'text-white/55'
                    }`}
                  >
                    {index + 1}. {label}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-[#07111f] p-8">
            {step === 0 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="Company details"
                  text="Basic operator information for your workspace."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Company name"
                    input={
                      <input
                        value={form.companyName}
                        onChange={(e) => setField('companyName', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Trading name"
                    input={
                      <input
                        value={form.tradingName}
                        onChange={(e) => setField('tradingName', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Contact phone"
                    input={
                      <input
                        value={form.contactPhone}
                        onChange={(e) => setField('contactPhone', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
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
                </div>

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
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="Operational defaults"
                  text="Set your timezone and currency."
                />

                <div className="grid gap-4 md:grid-cols-2">
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
                        <option value="GBP">GBP (£)</option>
                      </select>
                    }
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                  These settings will be used across bookings, pricing, reports and
                  payroll.
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="First driver"
                  text="Add your first driver record to get started."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Driver name"
                    input={
                      <input
                        value={form.firstDriverName}
                        onChange={(e) => setField('firstDriverName', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Driver phone"
                    input={
                      <input
                        value={form.firstDriverPhone}
                        onChange={(e) =>
                          setField('firstDriverPhone', e.target.value)
                        }
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="First vehicle"
                  text="Add your first vehicle so dispatch is ready."
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="Registration"
                    input={
                      <input
                        value={form.firstVehicleReg}
                        onChange={(e) =>
                          setField('firstVehicleReg', e.target.value.toUpperCase())
                        }
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Make"
                    input={
                      <input
                        value={form.firstVehicleMake}
                        onChange={(e) => setField('firstVehicleMake', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Model"
                    input={
                      <input
                        value={form.firstVehicleModel}
                        onChange={(e) => setField('firstVehicleModel', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="Default rates"
                  text="Set your starting fare card. You can edit this later."
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="Base fare"
                    input={
                      <input
                        value={form.baseFare}
                        onChange={(e) => setField('baseFare', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Price per mile"
                    input={
                      <input
                        value={form.pricePerMile}
                        onChange={(e) => setField('pricePerMile', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                  <Field
                    label="Waiting per minute"
                    input={
                      <input
                        value={form.waitingPerMinute}
                        onChange={(e) =>
                          setField('waitingPerMinute', e.target.value)
                        }
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-5">
                <SectionTitle
                  title="Review setup"
                  text="Check your core setup before finishing."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryCard
                    title="Company"
                    rows={[
                      ['Company', form.companyName],
                      ['Trading Name', form.tradingName || '—'],
                      ['Phone', form.contactPhone],
                      ['Plan', form.plan],
                    ]}
                  />
                  <SummaryCard
                    title="Driver & Vehicle"
                    rows={[
                      ['Driver', form.firstDriverName || '—'],
                      ['Driver Phone', form.firstDriverPhone || '—'],
                      ['Vehicle', form.firstVehicleReg || '—'],
                      [
                        'Make / Model',
                        `${form.firstVehicleMake || '—'} ${form.firstVehicleModel || ''}`.trim(),
                      ],
                    ]}
                  />
                  <SummaryCard
                    title="Rates"
                    rows={[
                      ['Base Fare', `£${form.baseFare}`],
                      ['Per Mile', `£${form.pricePerMile}`],
                      ['Waiting', `£${form.waitingPerMinute}/min`],
                      ['Timezone', form.timezone],
                    ]}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateCurrentStep()}
                  className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishSetup}
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? 'Finishing setup...' : 'Finish setup'}
                </button>
              )}
            </div>
          </section>
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
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mt-2 text-white/60">{text}</p>
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
      <span className="mb-2 block text-sm font-medium text-white/75">{label}</span>
      {input}
    </label>
  );
}

function SummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-lg font-semibold text-white">{title}</div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0"
          >
            <span className="text-sm text-white/50">{label}</span>
            <span className="max-w-[60%] text-right text-sm text-white/85">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';