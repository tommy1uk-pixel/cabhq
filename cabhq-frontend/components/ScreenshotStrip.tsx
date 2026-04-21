import Reveal from "./Reveal";

const panels = [
  {
    title: "Dispatch Board",
    subtitle: "Live office control",
    accent: "text-blue-300",
    rows: ["CBH-2101 • Heathrow", "CBH-2102 • Gatwick", "CBH-2103 • Local Job"],
  },
  {
    title: "Driver App",
    subtitle: "Mobile workflow",
    accent: "text-cyan-300",
    rows: ["New Offer", "Accepted", "En Route"],
  },
  {
    title: "Passenger App",
    subtitle: "Customer updates",
    accent: "text-emerald-300",
    rows: ["Booked", "Driver Assigned", "ETA 12 mins"],
  },
  {
    title: "Reports",
    subtitle: "Business visibility",
    accent: "text-amber-300",
    rows: ["42 Jobs Today", "£6,480 Revenue", "78% Auto Dispatch"],
  },
];

export default function ScreenshotStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-sm text-cyan-200">
            Inside CabHQ
          </div>

          <h2 className="mb-4 text-4xl font-bold md:text-5xl">
            Every part of the operation in one platform
          </h2>

          <p className="text-lg text-white/70">
            Operators, drivers, passengers and management all work from the same
            live system.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {panels.map((panel) => (
            <div
              key={panel.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-cyan-400/30"
            >
              <div className="mb-4">
                <p className={`text-sm font-semibold ${panel.accent}`}>
                  {panel.title}
                </p>
                <p className="mt-1 text-sm text-white/50">
                  {panel.subtitle}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <div className="mb-4 flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/60"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/60"></span>
                </div>

                <div className="space-y-3">
                  {panel.rows.map((row) => (
                    <div
                      key={row}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80"
                    >
                      {row}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}