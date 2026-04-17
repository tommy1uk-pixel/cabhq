import Reveal from "./Reveal";

const metrics = [
  {
    value: "Live",
    label: "driver locations",
  },
  {
    value: "Smart",
    label: "dispatch workflow",
  },
  {
    value: "Role",
    label: "based access",
  },
  {
    value: "Scale",
    label: "ready platform",
  },
];

export default function MetricsStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-6 md:py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[#0b1728] p-5 text-center"
              >
                <p className="mb-2 text-3xl font-bold">{metric.value}</p>
                <p className="text-sm text-white/55">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}