"use client";

import { useState } from "react";
import Reveal from "./Reveal";

const faqs = [
  {
    question: "Who is CABHQ built for?",
    answer:
      "CABHQ is built for taxi firms, private hire operators, airport transfer companies and growing fleets that need better dispatch control and modern systems.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes. Our Starter and Growth plans include a 14-day free trial so you can test CABHQ in a live environment before committing.",
  },
  {
    question: "Can I move from paper systems or old software?",
    answer:
      "Yes. We designed CABHQ to help operators move away from spreadsheets, outdated dispatch tools and manual admin processes.",
  },
  {
    question: "Does CABHQ include driver tracking?",
    answer:
      "Yes. You can monitor live driver positions, availability and booking activity through the dispatch dashboard.",
  },
  {
    question: "Can it manage future bookings and airport jobs?",
    answer:
      "Yes. CABHQ supports scheduled bookings, pre-booked work, airport transfers and repeat account journeys.",
  },
  {
    question: "Is there custom pricing for bigger fleets?",
    answer:
      "Yes. Enterprise plans are tailored for larger operators, multi-site companies and custom rollout requirements.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <Reveal>
      <section
        id="faq"
        className="mx-auto max-w-5xl px-6 py-20 md:py-28"
      >
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            FAQ
          </div>

          <h2 className="mb-4 text-4xl font-black leading-tight md:text-6xl">
            Questions Operators Usually Ask
          </h2>

          <p className="mx-auto max-w-2xl text-lg text-white/70">
            Clear answers before you start your free trial or request a demo.
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
                  <span className="text-lg font-semibold text-white">
                    {faq.question}
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0b1728] text-xl text-white/70">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 px-6 py-5 leading-8 text-white/70">
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