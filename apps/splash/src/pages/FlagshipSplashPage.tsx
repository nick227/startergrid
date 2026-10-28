import { useState, useEffect } from 'react';
import { EditorialNav } from '../components/layout/EditorialNav.tsx';
import { EditorialFooter } from '../components/layout/EditorialFooter.tsx';
import { EditorialHero } from '../components/sections/EditorialHero.tsx';
import { WorkflowThreeStep } from '../components/sections/WorkflowThreeStep.tsx';
import { TwoProductsSection } from '../components/sections/TwoProductsSection.tsx';
import { SupportedChannelsCompact } from '../components/sections/SupportedChannelsCompact.tsx';
import { WhyChooseSection } from '../components/sections/WhyChooseSection.tsx';
import { GettingStartedSection } from '../components/sections/GettingStartedSection.tsx';
import { LeadIntakeModal } from '../components/ui/LeadIntakeModal.tsx';

export default function FlagshipSplashPage() {
  const [intakeOpen, setIntakeOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'StarterGrid — One Platform for Online Automotive Sales';
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const descContent = 'StarterGrid is dealership software for managing vehicles, connecting online sales channels, publishing inventory, receiving inquiries, and measuring performance.';
    if (metaDesc) {
      metaDesc.content = descContent;
    } else {
      const tag = document.createElement('meta');
      tag.name = 'description';
      tag.content = descContent;
      document.head.appendChild(tag);
    }
  }, []);

  const openIntake = () => setIntakeOpen(true);
  const closeIntake = () => setIntakeOpen(false);

  return (
    <div style={{ background: '#090d16', color: '#ffffff', minHeight: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 00 Navigation */}
      <EditorialNav onRequestAccess={openIntake} />

      <main id="main-content">
        {/* 01 Hero & Product Preview */}
        <EditorialHero onRequestAccess={openIntake} />

        {/* 02 How It Works in 3 Clear Steps */}
        <WorkflowThreeStep />

        {/* 03 The Two Products: Operator Portal & Zero-Conquest Marketplace */}
        <TwoProductsSection />

        {/* 04 Supported Sales Channels & Advertising Providers */}
        <SupportedChannelsCompact />

        {/* 05 Why Dealerships Choose StarterGrid */}
        <WhyChooseSection />

        {/* 06 Fast Rooftop Evaluation Request */}
        <GettingStartedSection />
      </main>

      {/* 07 Clean Editorial Footer */}
      <EditorialFooter />

      {/* Dealership Evaluation Modal */}
      <LeadIntakeModal isOpen={intakeOpen} onClose={closeIntake} />
    </div>
  );
}
