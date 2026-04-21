import Reveal from "./Reveal";

const metrics = [
  {
    value: "24/7",
    label: "Booking Control",
  },
  {
    value: "Live",
    label: "Driver Tracking",
  },
  {
    value: "Auto",
    label: "Dispatch Ready",
  },
  {
    value: "14 Day",
    label: "Free Trial",
  },
];

export default function MetricsStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-center transition hover:border-cyan-400/30"
              >
                <p className="mb-2 text-3xl font-black text-white">
                  {metric.value}
                </p>

                <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}