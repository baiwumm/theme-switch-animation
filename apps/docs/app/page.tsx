import { FaqSection } from '@/components/landing/faq'
import { FeaturesSection } from '@/components/landing/features'
import { Footer } from '@/components/landing/footer'
import { GallerySection } from '@/components/landing/gallery'
import { HeroSection } from '@/components/landing/hero'
import { Navbar } from '@/components/landing/navbar'
import { QuickStartSection } from '@/components/landing/quick-start'

export default function LandingPage() {
  return (
    <div className="relative">
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
