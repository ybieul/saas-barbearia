"use client";

import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import ThreeStepsSection from "@/components/three-steps-section";
import FeaturesSection from "@/components/features-section";
import ComparisonSection from "@/components/comparison-section";
import TestimonialsSection from "@/components/testimonials-section";
import VideoTestimonialSection from "@/components/video-testimonial-section";
import PricingSection from "@/components/pricing-section";
import FaqSection from "@/components/faq-section";
import Footer from "@/components/footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/60 to-background">
      <Header />
      <HeroSection />
      <div className="mt-4 md:mt-8" />
      <ThreeStepsSection />
      <div className="mt-2 md:mt-6" />
      <FeaturesSection />
      <div className="mt-6 md:mt-10" />
      <ComparisonSection />
      <div className="mt-6 md:mt-10" />
      <TestimonialsSection />
      <div className="mt-6 md:mt-10" />
      <VideoTestimonialSection />
      <div className="mt-8 md:mt-12" />
      <PricingSection />
      <div className="mt-8 md:mt-12" />
      <FaqSection />
      <div className="mt-10 md:mt-16" />
      <Footer />
    </main>
  );
}
