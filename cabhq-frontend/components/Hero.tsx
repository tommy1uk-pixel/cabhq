import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#020617] py-24 text-white md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* LEFT */}
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-300">
              Built for Taxi & Private Hire Operators
            </div>

            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight md:text-7xl">
              Run Your Entire Taxi Company
              <span className="block text-cyan-400">From One Platform</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Replace paper diaries, WhatsApp bookings and messy admin with
              live dispatch, driver tracking, bookings, fleet control and
              revenue tools built for serious operators.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/pricing"
                className="rounded-2xl bg-cyan-500 px-7 py-4 text-base font-semibold text-black transition hover:bg-cyan-400"
              >
                View Pricing
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Start Free Trial
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-5 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="mt-1 text-slate-400">Bookings</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">Live</div>
                <div className="mt-1 text-slate-400">Dispatch</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">Scale</div>
                <div className="mt-1 text-slate-400">Ready</div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-[#07111f] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Dispatch Board</h3>

                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  LIVE
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Bookings</div>
                  <div className="mt-2 text-2xl font-bold">38</div>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Drivers</div>
                  <div className="mt-2 text-2xl font-bold">14</div>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Revenue</div>
                  <div className="mt-2 text-2xl font-bold">£2,480</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  "CAB-2041 • Airport Run • Assigned",
                  "CAB-2042 • Hotel Pickup • Waiting",
                  "CAB-2043 • School Run • En Route",
                  "CAB-2044 • Station Job • Completed",
                ].map((job) => (
                  <div
                    key={job}
                    className="rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-sm"
                  >
                    {job}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}