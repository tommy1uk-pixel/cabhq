import Reveal from "./Reveal";

const steps = [
  {
    number: "01",
    title: "Bookings enter the system",
    description:
      "Jobs are created by operators, account customers or passengers through the booking flow.",
  },
  {
    number: "02",
    title: "Dispatch assigns the right driver",
    description:
      "Jobs can be dispatched manually or offered using smarter availability-based workflow.",
  },
  {
    number: "03",
    title: "Everyone stays updated live",
    description:
      "The office sees progress, drivers manage statuses and passengers get cleaner updates.",
  },
];

export default function HowItWorks() {
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
            How It Works
          </div>

          <h2 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
            A clearer flow from booking to drop-off
          </h2>

          <p className="text-lg text-white/70">
            CabHQ is designed to reduce friction across the whole dispatch journey.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.07]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                  {step.number}
                </div>

                <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/50">
                  Step
                </span>
              </div>

              <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>

              <p className="mb-5 text-white/65">{step.description}</p>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-sm text-white/45">
                  {step.number === "01" &&
                    "Operator or customer creates the trip and adds the booking details."}
                  {step.number === "02" &&
                    "The system or dispatcher allocates the job to the best available driver."}
                  {step.number === "03" &&
                    "Job statuses, ETA and progress stay visible across the platform."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}