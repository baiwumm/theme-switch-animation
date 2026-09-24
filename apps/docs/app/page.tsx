import LightRays from '@/components/background/light-ray'
import { FaqSection } from '@/components/landing/faq'
import { FeaturesSection } from '@/components/landing/features'
import { Footer } from '@/components/landing/footer'
import { GallerySection } from '@/components/landing/gallery'
import { HeroSection } from '@/components/landing/hero'
import { Navbar } from '@/components/landing/navbar'
import { QuickStartSection } from '@/components/landing/quick-start'

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <LightRays
        className="fixed inset-0 z-0"
        raysOrigin="top-center"
        followMouse
      />
      {/* 彩色光斑：给毛玻璃卡片提供可折射的背景色彩（玻璃质感的前提） */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-24 left-[15%] h-96 w-96 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute bottom-10 -left-16 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-400/10" />
      </div>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <GallerySection />
        <QuickStartSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  )
}
