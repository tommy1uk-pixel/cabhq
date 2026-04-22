'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';

type SignupFormState = {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  plan: PlanType;
  agreeTerms: boolean;
};

const PLAN_META: Record<
  PlanType,
  {
    label: string;
    priceLabel: string;
    summary: string;
    accent: string;
  }
> = {
  STARTER: {
    label: 'Starter',
    priceLabel: '£49/month',
    summary: 'Best for new operators',
    accent: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  OPERATOR: {
    label: 'Operator',
    priceLabel: '£89/month',
    summary: 'Most popular',
    accent: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  },
  PRO: {
    label: 'Pro',
    priceLabel: '£149/month',
    summary: 'For established fleets',
    accent: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    priceLabel: '£249+/month',
    summary: 'For larger groups',
    accent: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
};

const initialForm: SignupFormState = {
  companyName: '',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  plan: 'OPERATOR',
  agreeTerms: false,
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLAN_META[form.plan];

  const validationError = useMemo(() => {
    if (!form.companyName.trim()) return 'Company name is required';
    if (!form.fullName.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!form.password) return 'Password is required';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!form.agreeTerms) return 'You must agree to the terms';
    return '';
  }, [form]);

  function setField<K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Replace this with your real signup API call
      // Example:
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     companyName: form.companyName.trim(),
      //     fullName: form.fullName.trim(),
      //     email: form.email.trim(),
      //     phone: form.phone.trim() || null,
      //     password: form.password,
      //     plan: form.plan,
      //   }),
      // });
      //
      // const data = await res.json();
      // if (!res.ok) throw new Error(data?.message || 'Failed to create account');

      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#03060d] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-white/10 bg-[#07111f] p-10 text-center">
            <div className="mx-auto mb-5 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              Account Created
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Your CabHQ trial is ready
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-white/65">
              We’ve created your account for the {selectedPlan.label} plan. The
              next step is onboarding your company, team and first vehicles.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
              >
                Go to Login
              </Link>

              <Link
                href="/pricing"
                className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03060d] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-8 px-6 py-10 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300">
              Start Your Trial
            </div>

            <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">
              Launch your
              <span className="text-cyan-400"> CabHQ account</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-white/65">
              Create your company, choose your plan and get ready to onboard your
              drivers, vehicles and dispatch team.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <FeatureCard
                title="Fast setup"
                text="Create your company and first admin account in minutes."
              />
              <FeatureCard
                title="Plan-aware onboarding"
                text="Your setup can follow Starter, Operator, Pro or Enterprise."
              />
              <FeatureCard
                title="Built for operators"
                text="Dispatch, drivers, fleet, reports and compliance in one place."
              />
              <FeatureCard
                title="Ready to scale"
                text="Start small and upgrade your plan whenever needed."
              />
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-3xl border border-white/10 bg-[#07111f] p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-3xl font-bold">Create account</h2>
              <p className="mt-2 text-sm text-white/60">
                Choose a plan and create your first admin login.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Company name"
                  input={
                    <input
                      value={form.companyName}
                      onChange={(e) => setField('companyName', e.target.value)}
                      placeholder="Alpha Cars"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Full name"
                  input={
                    <input
                      value={form.fullName}
                      onChange={(e) => setField('fullName', e.target.value)}
                      placeholder="Tommy Brown"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Email"
                  input={
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="you@company.co.uk"
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
                      placeholder="07..."
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Password"
                  input={
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Confirm password"
                  input={
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setField('confirmPassword', e.target.value)
                      }
                      placeholder="Repeat password"
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-white/75">
                  Choose your plan
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

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-white/55">Selected Plan</div>
                    <div className="mt-1 text-xl font-bold text-white">
                      {selectedPlan.label}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-white/55">Monthly Price</div>
                    <div className="mt-1 text-xl font-bold text-cyan-300">
                      {selectedPlan.priceLabel}
                    </div>
                  </div>
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
                  I agree to the terms, privacy policy and trial billing setup for
                  CabHQ.
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
                {submitting ? 'Creating account...' : 'Create trial account'}
              </button>

              <div className="text-center text-sm text-white/50">
                Already have an account?{' '}
                <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-white/60">{text}</div>
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

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';