'use client';

import Link from 'next/link';

type Plan = {
  name: string;
  price: string;
  subtitle: string;
  badge?: string;
  accent: string;
  button: string;
  buttonText: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: 'STARTER',
    price: '£49',
    subtitle: 'Best for new operators moving away from paper diaries.',
    badge: 'Best for new operators',
    accent: 'border-cyan-500/20',
    button: 'bg-white text-black hover:bg-slate-200',
    buttonText: 'Choose Starter',
    features: [
      '1–5 vehicles',
      'Manual dispatch board',
      'Create bookings',
      'Future bookings',
      'Manual job assignment',
      'Add/manage drivers',
      'Add/manage vehicles',
      '1 admin login',
      'Email support',
    ],
  },
  {
    name: 'OPERATOR',
    price: '£89',
    subtitle: 'For active firms that need faster dispatch and live visibility.',
    badge: 'MOST POPULAR',
    accent: 'border-cyan-500/40',
    button: 'bg-cyan-500 text-black hover:bg-cyan-400',
    buttonText: 'Choose Operator',
    features: [
      'Everything in Starter',
      'Auto dispatch v1',
      'Closest driver suggestions',
      'Live driver map',
      'Realtime status board',
      'Up to 5 admin users',
      'Role-based staff access',
      'Priority support',
      'Driver performance basics',
    ],
  },
  {
    name: 'PRO',
    price: '£149',
    subtitle: 'For established fleets needing compliance + reporting.',
    badge: 'For established fleets',
    accent: 'border-violet-500/30',
    button: 'bg-violet-500 text-white hover:bg-violet-400',
    buttonText: 'Choose Pro',
    features: [
      'Everything in Operator',
      'Licence expiry alerts',
      'DBS tracking',
      'Badge reminders',
      'MOT reminders',
      'Zone logic',
      'Smart dispatch rules',
      'Revenue reports',
      'Unlimited admin users',
    ],
  },
  {
    name: 'ENTERPRISE',
    price: '£249+',
    subtitle: 'For larger groups, networks and multi-site operators.',
    badge: 'For larger groups',
    accent: 'border-amber-500/30',
    button: 'bg-amber-400 text-black hover:bg-amber-300',
    buttonText: 'Contact Sales',
    features: [
      'Everything in Pro',
      'Multiple companies / depots',
      'Central owner controls',
      'API access',
      'Custom workflows',
      'Dedicated account support',
      'Staff training',
      'White-label options',
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#03060d] text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-16">
        {/* HERO */}
        <section className="text-center">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300">
            CabHQ Pricing
          </div>

          <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">
            Built for UK Taxi &
            <span className="text-cyan-400"> Private Hire Operators</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/65">
            Replace paper diaries, outdated dispatch systems and expensive legacy
            platforms. Launch faster, grow cleaner and scale with CabHQ.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
            >
              Start Free Trial
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
            >
              Book Demo
            </Link>
          </div>
        </section>

        {/* PRICING */}
        <section className="mt-16 grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border bg-[#07111f] p-7 ${plan.accent}`}
            >
              {plan.badge ? (
                <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                  {plan.badge}
                </div>
              ) : null}

              <h2 className="text-3xl font-bold">{plan.name}</h2>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="pb-1 text-white/60">/month</span>
              </div>

              <p className="mt-5 min-h-[72px] text-sm leading-7 text-white/65">
                {plan.subtitle}
              </p>

              <div className="mt-6 space-y-3">
                {plan.features.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-white/85">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                className={`mt-8 w-full rounded-2xl px-4 py-4 font-semibold transition ${plan.button}`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </section>

        {/* COMPARISON */}
        <section className="mt-20 rounded-3xl border border-white/10 bg-[#07111f] p-8">
          <h3 className="text-3xl font-bold">Plan Comparison</h3>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-sm text-white/50">
                  <th className="pb-4">Feature</th>
                  <th className="pb-4">Starter</th>
                  <th className="pb-4">Operator</th>
                  <th className="pb-4">Pro</th>
                  <th className="pb-4">Enterprise</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {[
                  ['Manual Dispatch', '✓', '✓', '✓', '✓'],
                  ['Auto Dispatch', '-', '✓', '✓', '✓'],
                  ['Live Driver Map', '-', '✓', '✓', '✓'],
                  ['Compliance Alerts', '-', '-', '✓', '✓'],
                  ['Reporting Suite', '-', '-', '✓', '✓'],
                  ['Multi Company', '-', '-', '-', '✓'],
                  ['API Access', '-', '-', '-', '✓'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-white/5">
                    {row.map((cell, i) => (
                      <td key={i} className="py-4 text-white/80">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20 grid gap-6 md:grid-cols-2">
          {[
            [
              'Can I cancel anytime?',
              'Yes. All monthly plans can be changed or cancelled.',
            ],
            [
              'Can you migrate from iCabbi?',
              'Yes. We can help move your operation over smoothly.',
            ],
            [
              'Is training included?',
              'Enterprise includes dedicated onboarding and staff training.',
            ],
            [
              'Do you support multiple depots?',
              'Yes. Enterprise plans are built for multi-site operators.',
            ],
          ].map(([q, a]) => (
            <div
              key={q}
              className="rounded-3xl border border-white/10 bg-[#07111f] p-6"
            >
              <h4 className="text-xl font-bold">{q}</h4>
              <p className="mt-3 text-white/65">{a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-20 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-10 text-center">
          <h3 className="text-4xl font-bold">Ready to modernise your operation?</h3>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Join operators replacing outdated dispatch software with CabHQ.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
            >
              Start Free Trial
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
            >
              Speak to Sales
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}