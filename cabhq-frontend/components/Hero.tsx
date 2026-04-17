import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-80px] h-[320px] w-[320px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-[-120px] top-[40px] h-[280px] w-[280px] rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[35%] h-[260px] w-[260px] rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <Reveal>
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-12 md:grid-cols-2 md:items-center md:pb-20 md:pt-20">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200">
              Built for real taxi operators
            </div>

            <h1 className="mb-5 max-w-3xl text-5xl font-bold leading-[1.02] md:text-6xl xl:text-7xl">
              Run dispatch,
              <br />
              drivers and live jobs from{" "}
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                one platform
              </span>
            </h1>

            <p className="mb-8 max-w-xl text-lg text-white/70 md:text-xl">
              Live fleet visibility, cleaner driver workflow and a more modern
              booking experience for operators and passengers.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#demo"
                className="btn-premium rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500"
              >
                Book Demo
              </a>

              <a
                href="#platform"
                className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/5"
              >
                See Platform
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold">Live</p>
                <p className="text-xs text-white/55">fleet map</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold">Smart</p>
                <p className="text-xs text-white/55">dispatch flow</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold">Role</p>
                <p className="text-xs text-white/55">based access</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-white/20" />
                <span className="h-3 w-3 rounded-full bg-white/20" />
                <span className="h-3 w-3 rounded-full bg-white/20" />
              </div>
              <span className="text-sm text-white/50">CabHQ Dispatch</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Live Map</p>
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    6 drivers live
                  </span>
                </div>

                <div className="relative h-80 overflow-hidden rounded-xl bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]">
                  <div className="absolute left-[15%] top-[30%] h-[2px] w-[50%] rotate-[20deg] bg-white/10" />
                  <div className="absolute left-[25%] top-[60%] h-[2px] w-[40%] -rotate-[15deg] bg-white/10" />
                  <div className="absolute left-[18%] top-[72%] h-[2px] w-[45%] rotate-[8deg] bg-white/10" />

                  <span className="absolute left-[20%] top-[30%] h-4 w-4 rounded-full bg-blue-400 shadow-[0_0_0_8px_rgba(59,130,246,0.15)]" />
                  <span className="absolute left-[60%] top-[40%] h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_0_8px_rgba(34,211,238,0.15)]" />
                  <span className="absolute left-[40%] top-[70%] h-4 w-4 rounded-full bg-blue-400 shadow-[0_0_0_8px_rgba(59,130,246,0.15)]" />
                  <span className="absolute left-[75%] top-[62%] h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_0_8px_rgba(34,211,238,0.15)]" />

                  <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-[#081220]/90 px-3 py-2 text-xs text-white/70">
                    Driver 12 · 5 mins away
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-[#0b1728] p-3">
                  <p className="font-semibold">CBH-2101</p>
                  <p className="text-xs text-white/60">Heathrow T5</p>
                  <span className="text-xs text-cyan-300">Accepted</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1728] p-3">
                  <p className="font-semibold">CBH-2102</p>
                  <p className="text-xs text-white/60">Gatwick</p>
                  <span className="text-xs text-amber-300">Offered</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1728] p-3">
                  <p className="font-semibold">CBH-2103</p>
                  <p className="text-xs text-white/60">Bournemouth</p>
                  <span className="text-xs text-blue-300">Pending</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1728] p-3">
                  <p className="text-xs text-white/50">Today</p>
                  <p className="text-xl font-bold">36 jobs</p>
                  <p className="text-xs text-white/55">78% auto-dispatch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}