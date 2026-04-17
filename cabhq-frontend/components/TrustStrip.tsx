import Reveal from "./Reveal";

const audiences = [
  {
    title: "Local Taxi Firms",
    subtitle: "Day-to-day dispatch control",
    stat: "Live jobs",
  },
  {
    title: "Airport Operators",
    subtitle: "Long-distance and scheduled journeys",
    stat: "Future bookings",
  },
  {
    title: "Growing Fleets",
    subtitle: "Cleaner workflow as you scale",
    stat: "Multi-driver",
  },
  {
    title: "Account Work",
    subtitle: "Business and repeat customer journeys",
    stat: "Account ready",
  },
];

export default function TrustStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-4 md:pb-12 md:pt-6">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-black/10">
          <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-white/10 p-8 xl:border-b-0 xl:border-r">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Built For
              </p>

              <h2 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">
                Designed for real-world taxi operations
              </h2>

              <p className="max-w-lg text-white/60">
                CabHQ is aimed at operators who need live visibility, a cleaner
                driver workflow and a more modern customer experience.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              {audiences.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-[#0d1a2d]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-white">
                      {item.title}
                    </p>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                      {item.stat}
                    </span>
                  </div>

                  <p className="text-sm text-white/55">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}