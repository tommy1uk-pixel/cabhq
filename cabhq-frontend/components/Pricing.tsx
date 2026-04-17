import Reveal from "./Reveal";

const plans = [
  {
    name: "Starter",
    price: "£99",
    period: "/month",
    description: "For smaller operators getting organised.",
    badge: "",
    featured: false,
    features: [
      "Operator dashboard",
      "Booking management",
      "Basic dispatch workflow",
      "Driver records",
      "Email support",
    ],
    cta: "Start with Starter",
  },
  {
    name: "Growth",
    price: "£249",
    period: "/month",
    description: "For busy fleets and airport transfer operators.",
    badge: "Most Popular",
    featured: true,
    features: [
      "Everything in Starter",
      "Smart dispatch logic",
      "Driver app workflow",
      "Live tracking",
      "Passenger notifications",
      "Priority support",
    ],
    cta: "Book Growth Demo",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For multi-company rollout and custom deployments.",
    badge: "",
    featured: false,
    features: [
      "Everything in Growth",
      "Multi-company setup",
      "Custom integrations",
      "Advanced reporting",
      "White-label options",
      "Dedicated onboarding",
    ],
    cta: "Talk to Sales",
  },
];

export default function Pricing() {
  return (
    <Reveal>
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
            Pricing
          </div>

          <h2 className="mb-3 text-4xl font-bold leading-tight md:text-5xl">
            Clear pricing for different stages of growth
          </h2>

          <p className="text-lg text-white/70">
            Simple packages for smaller fleets, scaling operators and custom rollout.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-8 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/20 ${
                plan.featured
                  ? "border-blue-400/40 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
                  <p className="text-white/65">{plan.description}</p>
                </div>

                {plan.badge && (
                  <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-blue-500/25">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mb-8 rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period ? (
                    <span className="pb-1 text-white/50">{plan.period}</span>
                  ) : null}
                </div>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-white/75"
                  >
                    <span className="mt-0.5 text-cyan-300">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#demo"
                className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-semibold transition duration-300 ${
                  plan.featured
                    ? "btn-premium bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-500/30"
                    : "border border-white/15 text-white hover:bg-white/5"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}