import Reveal from "./Reveal";

export default function ProductShowcase() {
  return (
    <Reveal>
      <section
        id="platform"
        className="mx-auto max-w-7xl px-6 py-20 md:py-28"
      >
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            Platform Overview
          </div>

          <h2 className="mb-4 text-4xl font-black leading-tight md:text-6xl">
            Built Around The Actual Dispatch Workflow
          </h2>

          <p className="text-lg leading-8 text-white/70">
            The office controls the operation, drivers manage jobs on mobile
            and customers stay informed from booking to drop-off.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT SIDE */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Operator Dashboard</h3>
                <p className="mt-1 text-sm text-white/55">
                  Live jobs, fleet visibility and faster dispatch control
                </p>
              </div>

              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                Dispatcher
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">
                    Live fleet map
                  </p>

                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    14 on duty
                  </span>
                </div>

                <div className="relative h-80 overflow-hidden rounded-2xl bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:22px_22px]">
                  <div className="absolute left-[12%] top-[20%] h-[2px] w-[56%] rotate-[16deg] bg-white/10" />
                  <div className="absolute left-[24%] top-[52%] h-[2px] w-[50%] -rotate-[12deg] bg-white/10" />
                  <div className="absolute left-[18%] top-[72%] h-[2px] w-[42%] rotate-[8deg] bg-white/10" />

                  <span className="absolute left-[18%] top-[26%] h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_0_8px_rgba(34,211,238,0.15)]" />
                  <span className="absolute left-[60%] top-[30%] h-4 w-4 rounded-full bg-blue-400 shadow-[0_0_0_8px_rgba(59,130,246,0.15)]" />
                  <span className="absolute left-[34%] top-[58%] h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_0_8px_rgba(34,211,238,0.15)]" />
                  <span className="absolute left-[76%] top-[64%] h-4 w-4 rounded-full bg-blue-400 shadow-[0_0_0_8px_rgba(59,130,246,0.15)]" />

                  <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-[#081220]/90 px-3 py-2 text-xs text-white/70">
                    Driver 14 · 6 mins away
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/80">
                      Active jobs
                    </p>
                    <span className="text-xs text-white/45">Live now</span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">CAB-2041</span>
                        <span className="text-xs text-emerald-300">Accepted</span>
                      </div>
                      <p className="text-sm text-white/60">
                        Heathrow T5 · Blandford
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">CAB-2042</span>
                        <span className="text-xs text-amber-300">Offered</span>
                      </div>
                      <p className="text-sm text-white/60">Gatwick · Poole</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">CAB-2043</span>
                        <span className="text-xs text-cyan-300">Pending</span>
                      </div>
                      <p className="text-sm text-white/60">
                        Bournemouth · Dorchester
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <p className="text-sm text-white/50">Operational snapshot</p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-2xl font-bold">42</p>
                      <p className="text-xs text-white/55">Jobs today</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-2xl font-bold">78%</p>
                      <p className="text-xs text-white/55">Auto-dispatch</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Driver App</h3>
                  <p className="mt-1 text-sm text-white/55">
                    Job offers, statuses and shift workflow
                  </p>
                </div>

                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Mobile
                </span>
              </div>

              <div className="mx-auto max-w-[280px] rounded-[30px] border border-white/10 bg-[#0b1728] p-4 shadow-2xl shadow-black/20">
                <div className="mx-auto mb-4 h-5 w-28 rounded-b-2xl bg-white/10" />

                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">New Job Offer</p>
                    <p className="mt-1 font-semibold">Blandford → Heathrow T5</p>
                    <p className="mt-1 text-sm text-white/60">Pickup 04:15</p>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <p className="text-sm text-cyan-300">Status</p>
                    <p className="mt-1 font-semibold">En Route to Pickup</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Jobs Today</p>
                    <p className="mt-1 font-semibold">4 assigned</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Customer Experience</h3>
                  <p className="mt-1 text-sm text-white/55">
                    Booking confirmations, ETA updates and driver visibility
                  </p>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Customer
                </span>
              </div>

              <div className="mx-auto max-w-[280px] rounded-[30px] border border-white/10 bg-[#0b1728] p-4 shadow-2xl shadow-black/20">
                <div className="mx-auto mb-4 h-5 w-28 rounded-b-2xl bg-white/10" />

                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Booking Confirmed</p>
                    <p className="mt-1 font-semibold">Airport Transfer</p>
                    <p className="mt-1 text-sm text-white/60">
                      Heathrow Terminal 5
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <p className="text-sm text-emerald-300">Driver ETA</p>
                    <p className="mt-1 font-semibold">12 minutes away</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Vehicle</p>
                    <p className="mt-1 font-semibold">Silver Estate · AB12 CDE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}