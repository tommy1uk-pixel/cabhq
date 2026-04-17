"use client";

import { useState } from "react";
import Reveal from "./Reveal";

type DemoRequest = {
  fullName: string;
  company: string;
  email: string;
  fleetSize: string;
  message: string;
  submittedAt: string;
};

export default function DemoSection() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    company: "",
    email: "",
    fleetSize: "",
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const newRequest: DemoRequest = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };

    const existing = localStorage.getItem("cabhq_demo_requests");
    const parsed: DemoRequest[] = existing ? JSON.parse(existing) : [];

    localStorage.setItem(
      "cabhq_demo_requests",
      JSON.stringify([newRequest, ...parsed])
    );

    setSubmitted(true);

    setFormData({
      fullName: "",
      company: "",
      email: "",
      fleetSize: "",
      message: "",
    });
  }

  return (
    <Reveal>
      <section id="demo" className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-3xl border border-blue-400/20 bg-white/5 p-8 shadow-xl shadow-black/20">
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-200 shadow-lg shadow-blue-500/10">
              Book a Demo
            </div>

            <h2 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
              See how CabHQ could run your operation
            </h2>

            <p className="mb-8 max-w-xl text-lg text-white/70">
              A cleaner dispatch workflow, stronger live visibility and a more
              modern experience for operators, drivers and passengers.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Best for</p>
                <p className="text-xl font-semibold">Taxi operators</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Use cases</p>
                <p className="text-xl font-semibold">Airport & local work</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Core value</p>
                <p className="text-xl font-semibold">Live dispatch control</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Next step</p>
                <p className="text-xl font-semibold">Request your demo</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Full name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Your name"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Your company"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Fleet size
                    </label>
                    <select
                      name="fleetSize"
                      value={formData.fleetSize}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition focus:border-blue-400/40"
                    >
                      <option value="">Select fleet size</option>
                      <option>1–5 vehicles</option>
                      <option>6–15 vehicles</option>
                      <option>16–40 vehicles</option>
                      <option>40+ vehicles</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    What are you looking for?
                  </label>
                  <textarea
                    rows={5}
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your operation and what you need from CabHQ"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-premium w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/30"
                >
                  Request Demo
                </button>

                <p className="text-sm text-white/45">
                  We’ll use this information to understand your operation and demo requirements.
                </p>
              </form>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-green-400/20 bg-green-400/5 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-400/10 text-3xl text-green-300">
                  ✓
                </div>

                <h3 className="mb-3 text-3xl font-bold">Request received</h3>

                <p className="max-w-md text-white/70">
                  Thanks — your demo request has been captured successfully.
                </p>

                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
                >
                  Submit another request
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </Reveal>
  );
}