import { useState, useEffect } from 'react';
import { AppleScaleNav } from '../components/layout/AppleScaleNav.tsx';
import { AppleScaleFooter } from '../components/layout/AppleScaleFooter.tsx';
import { FlagshipHeroSection } from '../components/sections/FlagshipHeroSection.tsx';
import { VisualFeaturesSection } from '../components/sections/VisualFeaturesSection.tsx';
import { DiscoverSection } from '../components/sections/DiscoverSection.tsx';
import { MarketplaceHeroSection } from '../components/sections/MarketplaceHeroSection.tsx';
import { AdvertisingSection } from '../components/sections/AdvertisingSection.tsx';
import { AutomationSection } from '../components/sections/AutomationSection.tsx';
import { InventoryHubSection } from '../components/sections/InventoryHubSection.tsx';
import { SupportingCapabilitiesSection } from '../components/sections/SupportingCapabilitiesSection.tsx';
import { ConversionSection } from '../components/sections/ConversionSection.tsx';
import { LeadIntakeModal } from '../components/ui/LeadIntakeModal.tsx';
import { PricingModal } from '../components/ui/PricingModal.tsx';

export default function FlagshipSplashPage() {
  const [intakeOpen, setIntakeOpen] = useState<boolean>(false);
  const [pricingOpen, setPricingOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'DealerGrid — Automotive Sales & Distribution Platform';
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const descContent = 'DealerGrid: Post your vehicles to 70+ websites from one platform, list for free on the DealerGrid Marketplace with zero conquest ads, advertise across Google and Meta, and route inquiries directly to your CRM.';
    if (metaDesc) {
      metaDesc.content = descContent;
    } else {
      const tag = document.createElement('meta');
      tag.name = 'description';
      tag.content = descContent;
      document.head.appendChild(tag);
    }
  }, []);

  const openPricing = () => setPricingOpen(true);
  const closePricing = () => setPricingOpen(false);

  const handleContactUs = () => {
    const el = document.getElementById('getting-started');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setIntakeOpen(true);
    }
  };

  return (
    <div
      style={{
        background: '#080c14',
        color: '#ffffff',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Navigation (Clean Header: Brand, Marketplace, Pricing, Sign In, Contact Us) */}
      <AppleScaleNav onOpenPricing={openPricing} onContactUs={handleContactUs} />

      <main id="main-content">
        {/* 01 — HERO (Flagship Distribution with Full Width App Screenshot) */}
        <FlagshipHeroSection onContactUs={handleContactUs} onOpenPricing={openPricing} />

        {/* 01.5 — GRAPHICAL TOOL FEATURES OVERVIEW */}
        <VisualFeaturesSection onOpenPricing={openPricing} onContactUs={handleContactUs} />

        {/* 02 — DISCOVER (Compact Overview of All 12 Benefits) */}
        <DiscoverSection />

        {/* 03 — PRODUCT STORY (Dominant Cinematic Visual Moments) */}
        {/* 02 Marketplace: Full-Width Automotive Feature */}
        <MarketplaceHeroSection />

        {/* 03 Advertising: Large, Distinctive Paid Ads Section */}
        <AdvertisingSection />

        {/* 04 Automation: Focused Product Demonstration */}
        <AutomationSection />

        {/* 08 Inventory: Authoritative Lot Control Preview */}
        <InventoryHubSection />

        {/* 04 — SUPPORTING CAPABILITIES (Spacious Editorial Compositions) */}
        {/* 05 DMS Connection • 06 Automotive Experts • 07 Leads & CRM • 09 Team Collaboration • 10 Market Demand • 11 Managed Listings • 12 Industry Veterans */}
        <SupportingCapabilitiesSection />

        {/* 05 — CONVERSION (Instant Self-Serve Signup & Contact Form) */}
        <ConversionSection onOpenPricing={openPricing} />
      </main>

      {/* Footer */}
      <AppleScaleFooter />

      {/* Pricing & Mock Stripe Checkout Modal */}
      <PricingModal isOpen={pricingOpen} onClose={closePricing} />

      {/* Dealership Evaluation Modal */}
      <LeadIntakeModal isOpen={intakeOpen} onClose={() => setIntakeOpen(false)} />
    </div>
  );
}
