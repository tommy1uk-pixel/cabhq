import Reveal from "./Reveal";

const plans = [
  {
    name: "STARTER",
    price: "£49",
    period: "/month",
    description:
      "For small private hire firms moving away from paper diaries, WhatsApp and manual admin.",
    badge: "Low-risk entry point",
    featured: false,
    cta: "Choose STARTER",
    features: [
      "1–5 vehicles",
      "Manual dispatch board",
      "Create bookings",
      "Future bookings",
      "Basic booking history",
      "Manual job assignment",
      "Unlimited driver logins",
      "Add/manage drivers",
      "Add/manage vehicles",
      "1 admin login",
      "Company settings",
      "Email support",
    ],
  },
  {
    name: "OPERATOR",
    price: "£89",
    period: "/month",
    description:
      "For active firms that need faster dispatch, live visibility and less wasted admin time.",
    badge: "Most Popular",
    featured: true,
    cta: "Choose OPERATOR",
    features: [
      "Everything in Starter",
      "Auto dispatch v1",
      "Closest driver suggestions",
      "Driver availability filtering",
      "Faster assignment flow",
      "Live driver tracking map",
      "Real-time status board",
      "Today's activity overview",
      "Up to 5 admin users",
      "Role-based staff access",
      "Priority support",
    ],
  },
  {
    name: "PRO",
    price: "£149",
    period: "/month",
    description:
      "For operators needing compliance, advanced dispatch logic and serious control.",
    badge: "Best Value",
    featured: false,
    cta: "Choose PRO",
    features: [
      "Everything in Operator",
      "Driver licence expiry alerts",
      "DBS expiry tracking",
      "Badge expiry reminders",
      "Vehicle insurance alerts",
      "MOT expiry reminders",
      "Zone / area logic",
      "Smart dispatch rules",
      "Priority booking logic",
      "Revenue reports",
      "Unlimited admin users",
    ],
  },
  {
    name: "ENTERPRISE",
    price: "£249+",
    period: "/month",
    description:
      "For multi-site operators, networks and specialist transport firms.",
    badge: "Custom rollout",
    featured: false,
    cta: "Talk To Sales",
    features: [
      "Everything in Pro",
      "Multiple companies / depots",
      "Central owner controls",
      "Group reporting",
      "API access",
      "Custom workflows",
      "Dedicated support",
      "Training included",
      "Priority roadmap",
      "White-label options",
    ],
  },
];

export default function Pricing() {
  return (
    <Reveal>
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-sm text-cyan-300">
            Pricing
          </div>

          <h2 className="text-4xl font-bold md:text-5xl">
            Plans Built For Every Stage
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-white/70">
            Start lean, scale fast, and run your whole taxi company from one system.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 ${
                plan.featured
                  ? "border-cyan-400 bg-cyan-500/10 shadow-2xl shadow-cyan-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  {plan.badge}
                </span>
              </div>

              <div className="mb-4 flex items-end gap-2">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="pb-2 text-white/50">{plan.period}</span>
              </div>

              <p className="mb-6 min-h-[90px] text-white/70">
                {plan.description}
              </p>

              <ul className="mb-8 space-y-3 text-sm text-white/80">
                {plan.features.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#demo"
                className={`block w-full rounded-2xl px-5 py-4 text-center font-semibold transition ${
                  plan.featured
                    ? "bg-cyan-500 text-black hover:bg-cyan-400"
                    : plan.name === "ENTERPRISE"
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "bg-white text-black hover:bg-slate-200"
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