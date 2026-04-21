import Reveal from "./Reveal";

const steps = [
  {
    number: "01",
    title: "Bookings Enter The System",
    description:
      "Jobs are created by office staff, repeat customers or online booking flow without messy manual admin.",
    detail:
      "Capture pickup, dropoff, future booking times and customer details in one clean workflow.",
  },
  {
    number: "02",
    title: "Dispatch Assigns The Best Driver",
    description:
      "Operators can assign manually or use smarter dispatch tools to move faster with fewer mistakes.",
    detail:
      "Use live visibility, driver availability and auto-dispatch logic to keep jobs moving.",
  },
  {
    number: "03",
    title: "Everyone Stays Updated Live",
    description:
      "The office tracks progress, drivers update job statuses and customers get a smoother experience.",
    detail:
      "From booking to drop-off, CABHQ keeps the whole journey visible and under control.",
  },
];

export default function HowItWorks() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            How It Works
          </div>

          <h2 className="mb-4 text-4xl font-black leading-tight md:text-6xl">
            A Clearer Flow From Booking To Drop-Off
          </h2>

          <p className="text-lg leading-8 text-white/70">
            CABHQ is designed to reduce friction across the whole dispatch
            journey so your operation runs faster and looks more professional.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
                  {step.number}
                </div>

                <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/50">
                  Step
                </span>
              </div>

              <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>

              <p className="mb-5 leading-7 text-white/65">{step.description}</p>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-sm leading-7 text-white/45">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}