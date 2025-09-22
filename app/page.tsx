"use client";

import Header from "@/components/landing-page/header";
import HeroSection from "@/components/landing-page/hero-section";
import ThreeStepsSection from "@/components/landing-page/three-steps-section";
import FeaturesSection from "@/components/landing-page/features-section";
import ComparisonSection from "@/components/landing-page/comparison-section";
import TestimonialsSection from "@/components/landing-page/testimonials-section";
import VideoTestimonialSection from "@/components/landing-page/video-testimonial-section";
import PricingSection from "@/components/landing-page/pricing-section";
import FaqSection from "@/components/landing-page/faq-section";
import Footer from "@/components/landing-page/footer";
import BusinessGrowthSection from "@/components/landing-page/business-growth-section";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/60 to-background">
      <Header />
      <HeroSection />
      <div className="mt-4 md:mt-8" />
      <ThreeStepsSection />
      <div className="mt-2 md:mt-6" />
      <BusinessGrowthSection />
      <div className="mt-8 md:mt-12" />
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
