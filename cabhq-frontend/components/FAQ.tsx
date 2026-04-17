"use client";

import { useState } from "react";
import Reveal from "./Reveal";

const faqs = [
  {
    question: "Is CabHQ for local taxi firms or larger fleets?",
    answer:
      "CabHQ is designed for both. Smaller operators can use it to modernise dispatch, while larger or growing fleets can use it to scale workflow, live tracking and customer communication.",
  },
  {
    question: "Does CabHQ support driver and passenger apps?",
    answer:
      "Yes. CabHQ is built around a connected operator, driver and passenger model so the whole journey is handled in one system rather than separate tools.",
  },
  {
    question: "Can it handle airport transfers and account work?",
    answer:
      "Yes. CabHQ is well suited to airport transfers, account journeys, scheduled bookings and day-to-day taxi dispatch operations.",
  },
  {
    question: "Can pricing be customised for larger operators?",
    answer:
      "Yes. Enterprise pricing can be tailored around fleet size, rollout scope, white-label requirements and custom features.",
  },
  {
    question: "Will CabHQ support roles and permissions?",
    answer:
      "Yes. The product is being structured around role-based access such as super admin, company admin, dispatcher, driver and account user.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <Reveal>
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
            FAQ
          </div>

          <h2 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
            Common questions before booking a demo
          </h2>

          <p className="mx-auto max-w-2xl text-lg text-white/70">
            Clear answers to the things operators usually want to know before
            moving forward.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/10"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0b1728] text-xl text-white/70">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 px-6 py-5 text-white/70">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}