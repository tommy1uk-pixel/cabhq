import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import ProductShowcase from "@/components/ProductShowcase";
import ScreenshotStrip from "@/components/ScreenshotStrip";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import MetricsStrip from "@/components/MetricsStrip";
import DemoSection from "@/components/DemoSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <Navbar />
      <Hero />
      <TrustStrip />
      <ProductShowcase />
      <ScreenshotStrip />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <MetricsStrip />
      <DemoSection />
      <Footer />
    </main>
  );
}