"use client";

import { useMemo, useState } from "react";
import Reveal from "./Reveal";

export default function DemoSection() {
  const [formData, setFormData] = useState({
    fullName: "",
    company: "",
    email: "",
    fleetSize: "",
    phone: "",
    message: "",
  });

  const successUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://cabhq.co.uk/";
    return `${window.location.origin}/?demo=success#demo`;
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <Reveal>
      <section id="demo" className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-8 shadow-xl shadow-black/20">
            <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              Book a Demo
            </div>

            <h2 className="mb-4 text-4xl font-black leading-tight md:text-5xl">
              See How CABHQ Fits Your Operation
            </h2>

            <p className="mb-8 max-w-xl text-lg text-white/70">
              Tell us about your business and we’ll show you how CABHQ can help
              you dispatch faster, reduce admin and scale with more control.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Ideal for</p>
                <p className="text-xl font-semibold">Taxi & private hire firms</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Fleet sizes</p>
                <p className="text-xl font-semibold">From 1 car to multi-site</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Main outcome</p>
                <p className="text-xl font-semibold">Faster dispatch & better control</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                <p className="mb-2 text-sm text-white/50">Next step</p>
                <p className="text-xl font-semibold">Request your walkthrough</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20">
            <form
              action="https://formsubmit.co/cabhq1@outlook.com"
              method="POST"
              className="space-y-5"
            >
              <input type="hidden" name="_subject" value="New CABHQ demo request" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_next" value={successUrl} />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_replyto" value={formData.email} />

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
                    className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
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
                    className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
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
                    className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Your phone number"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                  />
                </div>
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
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                >
                  <option value="">Select fleet size</option>
                  <option>1–5 vehicles</option>
                  <option>6–15 vehicles</option>
                  <option>16–40 vehicles</option>
                  <option>40+ vehicles</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  What do you need help with?
                </label>
                <textarea
                  rows={5}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your operation, current setup and what you want to improve"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-400"
              >
                Request Demo
              </button>

              <p className="text-sm text-white/45">
                We’ll use this information to understand your business and tailor
                the demo to your operation.
              </p>
            </form>
          </div>
        </div>
      </section>
    </Reveal>
  );
}