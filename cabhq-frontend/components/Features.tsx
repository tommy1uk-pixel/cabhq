import Reveal from "./Reveal";

const features = [
  {
    title: "Smart Dispatch",
    description: "Manual dispatch, job offers and cleaner allocation workflow.",
    icon: "🚖",
  },
  {
    title: "Live Tracking",
    description: "See drivers, locations and availability in real time.",
    icon: "📍",
  },
  {
    title: "Driver Workflow",
    description: "Offers, accept/reject, statuses and navigation in one app.",
    icon: "📱",
  },
  {
    title: "Passenger Updates",
    description: "Booking confirmation, driver assigned and ETA updates.",
    icon: "🔔",
  },
  {
    title: "Account Work",
    description: "Airport runs, repeat customers and account bookings.",
    icon: "🧾",
  },
  {
    title: "Reporting",
    description: "Operational visibility, activity and performance metrics.",
    icon: "📊",
  },
];

export default function Features() {
  return (
    <Reveal>
      <section id="features" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
            Core Features
          </div>

          <h2 className="mb-3 text-4xl font-bold leading-tight md:text-5xl">
            The tools that power the whole operation
          </h2>

          <p className="text-lg text-white/70">
            Short, clear feature cards with stronger product focus and less filler.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1.5 hover:border-blue-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-2xl transition duration-300 group-hover:scale-105 group-hover:border-cyan-400/30 group-hover:bg-cyan-400/10">
                {feature.icon}
              </div>

              <h3 className="mb-2 text-xl font-semibold transition duration-300 group-hover:text-cyan-200">
                {feature.title}
              </h3>

              <p className="text-white/65">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}