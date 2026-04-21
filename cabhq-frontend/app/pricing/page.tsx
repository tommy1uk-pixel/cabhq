import Link from 'next/link';

const plans = [
  {
    name: 'STARTER',
    price: '£49',
    badge: 'Best for new operators',
    description:
      'For small private hire firms moving away from paper diaries, WhatsApp and manual admin.',
    highlight: 'Low-risk entry point',
    border: 'border-emerald-500/30',
    badgeStyle: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    buttonStyle: 'bg-white text-black hover:bg-slate-200',
    features: [
      '1–5 vehicles',
      'Manual dispatch board',
      'Create bookings',
      'Future bookings',
      'Basic booking history',
      'Manual job assignment',
      'Unlimited driver logins',
      'Add/manage drivers',
      'Add/manage vehicles',
      'Basic driver profiles',
      'Basic vehicle records',
      '1 admin login',
      'Company settings',
      'Email support',
    ],
  },
  {
    name: 'OPERATOR',
    price: '£89',
    badge: 'MOST POPULAR',
    description:
      'For active firms that need faster dispatch, live visibility and less wasted admin time.',
    highlight: 'The daily painkiller tier',
    border: 'border-sky-500/40 ring-1 ring-sky-500/30',
    badgeStyle: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    buttonStyle: 'bg-sky-500 text-black hover:bg-sky-400',
    featured: true,
    features: [
      'Everything in Starter',
      'Auto dispatch v1',
      'Closest driver suggestions',
      'Driver availability filtering',
      'Faster assignment flow',
      'Live driver tracking map',
      'Real-time status board',
      'Today’s activity overview',
      'Up to 5 admin users',
      'Role-based staff access',
      'Priority support',
      'Improved vehicle management',
      'Driver performance basics',
      'Job completion metrics',
    ],
  },
  {
    name: 'PRO',
    price: '£149',
    badge: 'For established fleets',
    description:
      'For operators needing compliance, advanced dispatch logic and serious control over performance.',
    highlight: 'Compliance + reporting + control',
    border: 'border-violet-500/30',
    badgeStyle: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    buttonStyle: 'bg-violet-500 text-white hover:bg-violet-400',
    features: [
      'Everything in Operator',
      'Driver licence expiry alerts',
      'DBS expiry tracking',
      'Badge expiry reminders',
      'Vehicle insurance alerts',
      'MOT expiry reminders',
      'Plate / council expiry reminders',
      'Preferred driver rules',
      'Zone / area logic',
      'Smart dispatch rules',
      'Priority booking logic',
      'Driver performance reports',
      'Booking trends',
      'Revenue / job summaries',
      'Unlimited admin users',
      'Priority onboarding / migration help',
    ],
  },
  {
    name: 'ENTERPRISE',
    price: '£249+',
    badge: 'For larger groups',
    description:
      'For multi-site operators, networks and specialist transport firms needing bespoke rollout and support.',
    highlight: 'Priced on business impact',
    border: 'border-amber-500/30',
    badgeStyle: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    buttonStyle: 'bg-amber-400 text-black hover:bg-amber-300',
    features: [
      'Everything in Pro',
      'Multiple companies / depots',
      'Central owner controls',
      'Group reporting',
      'API access',
      'Custom workflows',
      'Bespoke setup',
      'Dedicated account support',
      'Staff training',
      'Priority roadmap requests',
      'White-label options later',
    ],
  },
];

const addOns = [
  {
    title: 'Passenger Booking App',
    price: '£49–£99/month',
  },
  {
    title: 'Website Booking Widget',
    price: '£29/month',
  },
  {
    title: 'SMS Credits',
    price: 'Usage based',
  },
  {
    title: 'Data Migration',
    price: 'One-time fee',
  },
  {
    title: 'Extra Training',
    price: 'One-time fee',
  },
];

const compareRows = [
  ['Vehicles', '1–5', '5–20', '20+', 'Unlimited'],
  ['Admin users', '1', 'Up to 5', 'Unlimited', 'Unlimited'],
  ['Manual dispatch', '✓', '✓', '✓', '✓'],
  ['Auto dispatch', '—', '✓', '✓', '✓'],
  ['Live driver tracking', '—', '✓', '✓', '✓'],
  ['Compliance alerts', '—', '—', '✓', '✓'],
  ['Advanced dispatch rules', '—', '—', '✓', '✓'],
  ['Group / multi-site control', '—', '—', '—', '✓'],
  ['API access', '—', '—', '—', '✓'],
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-slate-950 py-24 text-white sm:py-28"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_25%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-300">
            Founding Operator Offer • First 20 companies get Operator for £49/month for 12 months
          </div>

          <h2 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Simple pricing that fits
            <span className="block text-sky-400">real operators</span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">
            Start with the tools you need today. Upgrade when your operation needs
            more speed, visibility, compliance and control.
          </p>
        </div>

        <div className="mt-16 grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-3xl border bg-slate-900/80 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur ${plan.border}`}
            >
              {plan.featured ? (
                <div className="absolute -top-3 right-6 rounded-full bg-sky-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-black">
                  Most Popular
                </div>
              ) : null}

              <div
                className={`inline-flex w-fit rounded-full border px-4 py-1.5 text-sm font-semibold ${plan.badgeStyle}`}
              >
                {plan.badge}
              </div>

              <h3 className="mt-6 text-3xl font-semibold tracking-tight">
                {plan.name}
              </h3>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-semibold">{plan.price}</span>
                <span className="pb-2 text-base text-slate-400">/month</span>
              </div>

              <p className="mt-5 min-h-[88px] text-base leading-7 text-slate-400">
                {plan.description}
              </p>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-300">
                {plan.highlight}
              </div>

              <ul className="mt-8 space-y-4 text-base text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link
                  href="/super-admin/companies/new"
                  className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold transition ${plan.buttonStyle}`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="border-b border-slate-800 px-8 py-6">
            <h3 className="text-2xl font-semibold tracking-tight">
              Compare plans quickly
            </h3>
            <p className="mt-2 text-base text-slate-400">
              The right plan depends on fleet size, compliance needs and how much
              dispatch efficiency you want to unlock.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-950/70">
                <tr>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Features
                  </th>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wide text-emerald-300">
                    Starter
                  </th>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wide text-sky-300">
                    Operator
                  </th>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wide text-violet-300">
                    Pro
                  </th>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wide text-amber-300">
                    Enterprise
                  </th>
                </tr>
              </thead>

              <tbody>
                {compareRows.map((row, index) => (
                  <tr
                    key={row[0]}
                    className={
                      index % 2 === 0
                        ? 'border-t border-slate-800'
                        : 'border-t border-slate-800 bg-slate-950/30'
                    }
                  >
                    <td className="px-6 py-5 text-sm font-medium text-slate-300">
                      {row[0]}
                    </td>
                    <td className="px-6 py-5 text-sm text-white">{row[1]}</td>
                    <td className="px-6 py-5 text-sm text-white">{row[2]}</td>
                    <td className="px-6 py-5 text-sm text-white">{row[3]}</td>
                    <td className="px-6 py-5 text-sm text-white">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight">
                Optional add-ons
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
                Add revenue-generating products and onboarding services as the
                business grows.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Talk to us about add-ons
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {addOns.map((addon) => (
              <div
                key={addon.title}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
              >
                <div className="text-lg font-semibold">{addon.title}</div>
                <div className="mt-3 text-base text-slate-400">
                  {addon.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h3 className="text-4xl font-semibold tracking-tight">
            Start with the right plan, not the biggest one
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Starter helps small firms modernise. Operator removes daily dispatch
            pain. Pro adds compliance and control. Enterprise is for groups, depots
            and bespoke operations.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/super-admin/companies/new"
              className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-black"
            >
              Start setup
            </Link>

            <Link
              href="/login"
              className="rounded-2xl border border-slate-700 px-6 py-4 text-base font-semibold text-white hover:bg-slate-800"
            >
              Book demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}