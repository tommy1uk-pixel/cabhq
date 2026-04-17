import Reveal from "./Reveal";

const panels = [
  {
    title: "Dispatch",
    subtitle: "Live job board",
    content: ["CBH-2101", "CBH-2102", "CBH-2103"],
    accent: "text-blue-300",
  },
  {
    title: "Driver App",
    subtitle: "Mobile workflow",
    content: ["Offer received", "Accepted", "En route"],
    accent: "text-cyan-300",
  },
  {
    title: "Passenger",
    subtitle: "Booking updates",
    content: ["Confirmed", "Driver assigned", "ETA 12 mins"],
    accent: "text-emerald-300",
  },
  {
    title: "Reporting",
    subtitle: "Operational metrics",
    content: ["42 jobs today", "78% auto-dispatch", "12 on duty"],
    accent: "text-amber-300",
  },
];

export default function ScreenshotStrip() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mb-8 max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
            Product Proof
          </div>

          <h2 className="mb-3 text-4xl font-bold leading-tight md:text-5xl">
            A clearer picture of the CabHQ product
          </h2>

          <p className="text-lg text-white/70">
            Quick visual panels that make the platform feel more real and easier
            to understand at a glance.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {panels.map((panel) => (
            <div
              key={panel.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.07]"
            >
              <div className="mb-4">
                <p className={`text-sm font-semibold ${panel.accent}`}>
                  {panel.title}
                </p>
                <p className="mt-1 text-sm text-white/50">{panel.subtitle}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <div className="mb-4 flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20"></span>
                </div>

                <div className="space-y-3">
                  {panel.content.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/75"
                    >
                      {item}
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