import { useState, useEffect } from 'react';
import { EditorialNav } from '../components/layout/EditorialNav.tsx';
import { EditorialFooter } from '../components/layout/EditorialFooter.tsx';
import { EditorialHero } from '../components/sections/EditorialHero.tsx';
import { WorkflowFourPart } from '../components/sections/WorkflowFourPart.tsx';
import { ProvidersDirectory } from '../components/sections/ProvidersDirectory.tsx';
import { MarketplaceEditorial } from '../components/sections/MarketplaceEditorial.tsx';
import { CapabilitiesDirectory } from '../components/sections/CapabilitiesDirectory.tsx';
import { PerformanceEvidence } from '../components/sections/PerformanceEvidence.tsx';
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
        {/* 01 Product Introduction */}
        <EditorialHero onRequestAccess={openIntake} />

        {/* 02 What StarterGrid Does */}
        <WorkflowFourPart />

        {/* 03 Sales Channels & Integrations */}
        <ProvidersDirectory />

        {/* 04 The StarterGrid Marketplace */}
        <MarketplaceEditorial />

        {/* 05 Complete Software Capabilities */}
        <CapabilitiesDirectory />

        {/* 06 Performance and Intelligence */}
        <PerformanceEvidence />

        {/* 07 Getting Started */}
        <GettingStartedSection />
      </main>

      {/* 08 Footer */}
      <EditorialFooter />

      {/* Onboarding Intake Dialog */}
      <LeadIntakeModal isOpen={intakeOpen} onClose={closeIntake} />
    </div>
  );
}
