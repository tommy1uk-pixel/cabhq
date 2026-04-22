'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';

type CheckoutFormState = {
  plan: PlanType;
  companyName: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  agreeTerms: boolean;
};

const PLAN_META: Record<
  PlanType,
  {
    label: string;
    monthlyPrice: number;
    priceLabel: string;
    setupFee: number;
    summary: string;
    accent: string;
  }
> = {
  STARTER: {
    label: 'Starter',
    monthlyPrice: 49,
    priceLabel: '£49/month',
    setupFee: 0,
    summary: 'Best for new operators',
    accent: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  OPERATOR: {
    label: 'Operator',
    monthlyPrice: 89,
    priceLabel: '£89/month',
    setupFee: 0,
    summary: 'Most popular',
    accent: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  },
  PRO: {
    label: 'Pro',
    monthlyPrice: 149,
    priceLabel: '£149/month',
    setupFee: 0,
    summary: 'For established fleets',
    accent: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    monthlyPrice: 249,
    priceLabel: '£249+/month',
    setupFee: 0,
    summary: 'For larger groups',
    accent: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
};

const initialForm: CheckoutFormState = {
  plan: 'OPERATOR',
  companyName: '',
  billingName: '',
  billingEmail: '',
  billingAddress: '',
  cardName: '',
  cardNumber: '',
  expiry: '',
  cvc: '',
  agreeTerms: false,
};

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CheckoutPage() {
  const [form, setForm] = useState<CheckoutFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLAN_META[form.plan];

  const totals = useMemo(() => {
    const subtotal = selectedPlan.monthlyPrice;
    const setupFee = selectedPlan.setupFee;
    const vat = (subtotal + setupFee) * 0.2;
    const dueToday = subtotal + setupFee + vat;

    return {
      subtotal,
      setupFee,
      vat,
      dueToday,
    };
  }, [selectedPlan]);

  function setField<K extends keyof CheckoutFormState>(
    key: K,
    value: CheckoutFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validate() {
    if (!form.companyName.trim()) return 'Company name is required';
    if (!form.billingName.trim()) return 'Billing name is required';
    if (!form.billingEmail.trim()) return 'Billing email is required';
    if (!form.cardName.trim()) return 'Cardholder name is required';
    if (!form.cardNumber.trim()) return 'Card number is required';
    if (!form.expiry.trim()) return 'Expiry date is required';
    if (!form.cvc.trim()) return 'CVC is required';
    if (!form.agreeTerms) return 'You must agree to the billing terms';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Replace with real Stripe / backend subscription activation call
      // Example:
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     companyName: form.companyName,
      //     billingName: form.billingName,
      //     billingEmail: form.billingEmail,
      //     billingAddress: form.billingAddress,
      //     plan: form.plan,
      //   }),
      // });
      // const data = await res.json();
      // if (!res.ok) throw new Error(data?.message || 'Checkout failed');

      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#03060d] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-white/10 bg-[#07111f] p-10 text-center">
            <div className="mx-auto mb-5 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              Subscription Active
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Your plan is now live
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-white/65">
              Your {selectedPlan.label} subscription has been activated. You can
              now continue onboarding or go straight into the dashboard.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/onboarding"
                className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
              >
                Continue Onboarding
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03060d] text-white">
      <div className="mx-auto max-w-[1450px] px-6 py-12">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
            Subscription Checkout
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Activate your CabHQ plan
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Complete billing setup and move from trial to live subscription.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
          <section className="rounded-3xl border border-white/10 bg-[#07111f] p-8">
            <h2 className="text-2xl font-bold">Billing details</h2>
            <p className="mt-2 text-sm text-white/60">
              Enter your company and payment information.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <div className="mb-3 text-sm font-medium text-white/75">
                  Choose plan
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(Object.keys(PLAN_META) as PlanType[]).map((plan) => {
                    const meta = PLAN_META[plan];
                    const selected = form.plan === plan;

                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setField('plan', plan)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          selected
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-white/10 bg-black/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-lg font-semibold text-white">
                            {meta.label}
                          </div>
                          <div
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.accent}`}
                          >
                            {meta.priceLabel}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white/60">
                          {meta.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  label="Billing contact"
                  input={
                    <input
                      value={form.billingName}
                      onChange={(e) => setField('billingName', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Billing email"
                  input={
                    <input
                      type="email"
                      value={form.billingEmail}
                      onChange={(e) => setField('billingEmail', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Billing address"
                  input={
                    <input
                      value={form.billingAddress}
                      onChange={(e) => setField('billingAddress', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                  Card details
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Cardholder name"
                    input={
                      <input
                        value={form.cardName}
                        onChange={(e) => setField('cardName', e.target.value)}
                        className={inputClassName}
                        placeholder="Tommy Brown"
                      />
                    }
                  />
                  <Field
                    label="Card number"
                    input={
                      <input
                        value={form.cardNumber}
                        onChange={(e) => setField('cardNumber', e.target.value)}
                        className={inputClassName}
                        placeholder="4242 4242 4242 4242"
                      />
                    }
                  />
                  <Field
                    label="Expiry"
                    input={
                      <input
                        value={form.expiry}
                        onChange={(e) => setField('expiry', e.target.value)}
                        className={inputClassName}
                        placeholder="MM/YY"
                      />
                    }
                  />
                  <Field
                    label="CVC"
                    input={
                      <input
                        value={form.cvc}
                        onChange={(e) => setField('cvc', e.target.value)}
                        className={inputClassName}
                        placeholder="123"
                      />
                    }
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) => setField('agreeTerms', e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I agree to recurring monthly billing, VAT where applicable and
                  CabHQ subscription terms.
                </span>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-4 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Activating subscription...' : 'Activate subscription'}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white/55">Selected Plan</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {selectedPlan.label}
                  </div>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedPlan.accent}`}
                >
                  {selectedPlan.priceLabel}
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                <PriceRow label="Monthly plan" value={formatCurrency(totals.subtotal)} />
                <PriceRow label="Setup fee" value={formatCurrency(totals.setupFee)} />
                <PriceRow label="VAT" value={formatCurrency(totals.vat)} />
                <PriceRow
                  label="Due today"
                  value={formatCurrency(totals.dueToday)}
                  strong
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <h3 className="text-xl font-bold">What happens next</h3>

              <div className="mt-5 space-y-3">
                {[
                  'Subscription activates immediately',
                  'You continue into onboarding',
                  'Add your first driver and vehicle',
                  'Set your rates and company defaults',
                  'Start using dispatch and dashboard',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-white/75">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
              <h3 className="text-xl font-bold">Need help?</h3>
              <p className="mt-3 text-sm text-white/60">
                For Enterprise setup, migration or invoiced billing, speak to sales.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/contact"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                >
                  Contact Sales
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                >
                  Back to Pricing
                </Link>
              </div>
            </section>
          </aside>
        </div>
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
      <span className="mb-2 block text-sm font-medium text-white/75">{label}</span>
      {input}
    </label>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'text-base font-semibold text-white' : 'text-sm text-white/60'}>
        {label}
      </span>
      <span className={strong ? 'text-lg font-bold text-white' : 'text-sm text-white/85'}>
        {value}
      </span>
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';