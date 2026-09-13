import { FaqSection } from '@/components/landing/faq'
import { FeaturesSection } from '@/components/landing/features'
import { Footer } from '@/components/landing/footer'
import { GallerySection } from '@/components/landing/gallery'
import { HeroSection } from '@/components/landing/hero'
import { Navbar } from '@/components/landing/navbar'
import { QuickStartSection } from '@/components/landing/quick-start'
import LightRays from '@/components/background/light-ray'

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <LightRays className="fixed inset-0 z-0" raysOrigin="top-center" followMouse />
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
