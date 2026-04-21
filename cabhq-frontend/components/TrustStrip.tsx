import Reveal from "./Reveal";

const audiences = [
  {
    title: "Local Taxi Firms",
    subtitle: "Run day-to-day jobs with faster booking flow and cleaner dispatch control.",
    stat: "Live Dispatch",
  },
  {
    title: "Airport Transfer Operators",
    subtitle: "Handle scheduled work, future bookings and longer-distance journeys with confidence.",
    stat: "Pre-Booked Jobs",
  },
  {
    title: "Growing Fleets",
    subtitle: "Scale from a few vehicles to a larger operation without messy admin slowing you down.",
    stat: "Scale Ready",
  },
  {
    title: "Account & Repeat Work",
    subtitle: "Manage regular customers, repeat journeys and business work more professionally.",
    stat: "Account Ready",
  },
];

export default function TrustStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-6 md:pb-14 md:pt-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-black/20">
          <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/10 p-8 xl:border-b-0 xl:border-r xl:p-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Built For Real Operators
              </p>

              <h2 className="mb-5 text-3xl font-black leading-tight md:text-5xl">
                Designed Around Real-World Taxi Operations
              </h2>

              <p className="max-w-xl text-lg leading-8 text-white/65">
                CABHQ is built for operators who need speed, live visibility and
                stronger business control — not bloated software made for other
                industries.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="text-2xl font-bold text-white">24/7</div>
                  <div className="mt-1 text-sm text-white/50">Booking control</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="text-2xl font-bold text-white">Live</div>
                  <div className="mt-1 text-sm text-white/50">Driver visibility</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:p-8">
              {audiences.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-[#0d1a2d]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-white">
                      {item.title}
                    </p>

                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {item.stat}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-white/55">
                    {item.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}