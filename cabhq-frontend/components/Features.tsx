import Link from "next/link";

const features = [
  {
    title: "Smart Dispatch",
    text: "Assign jobs instantly or auto-dispatch the best available driver in seconds.",
  },
  {
    title: "Live Driver Tracking",
    text: "See available, busy and offline drivers on a real-time map.",
  },
  {
    title: "Fast Booking Flow",
    text: "Create bookings quickly, schedule future jobs and manage changes easily.",
  },
  {
    title: "Fleet Compliance",
    text: "Track MOT, insurance, licences, DBS and important expiry dates.",
  },
  {
    title: "Business Reporting",
    text: "Monitor bookings, revenue, driver activity and growth performance.",
  },
  {
    title: "Multi Staff Access",
    text: "Add dispatchers, office staff and managers with controlled permissions.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="bg-[#020617] py-24 text-white border-y border-white/5"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            Features
          </div>

          <h2 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
            Everything Needed To Run Smarter
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            CABHQ is built around real taxi operations — dispatch faster, reduce
            admin, stay compliant and scale confidently.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >
              <div className="mb-5 h-12 w-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 text-xl font-bold">
                ✓
              </div>

              <h3 className="text-2xl font-semibold">{feature.title}</h3>

              <p className="mt-4 leading-7 text-slate-400">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link
            href="/pricing"
            className="rounded-2xl bg-cyan-500 px-7 py-4 font-semibold text-black transition hover:bg-cyan-400"
          >
            View Pricing
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 font-semibold text-white transition hover:bg-white/10"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}