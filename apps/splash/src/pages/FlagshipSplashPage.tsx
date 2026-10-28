import { useState, useEffect } from 'react';
import { EditorialNav } from '../components/layout/EditorialNav.tsx';
import { EditorialFooter } from '../components/layout/EditorialFooter.tsx';
import { TopTenHeroOverview } from '../components/sections/TopTenHeroOverview.tsx';
import { ValuePropositionSection } from '../components/sections/ValuePropositionSection.tsx';
import { GettingStartedSection } from '../components/sections/GettingStartedSection.tsx';
import { LeadIntakeModal } from '../components/ui/LeadIntakeModal.tsx';
import { TOP_TEN_VALUE_PROPOSITIONS } from '../data/topTenValueProps.ts';

export default function FlagshipSplashPage() {
  const [intakeOpen, setIntakeOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'DealerGrid — Top 10 Core Value Propositions';
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const descContent = 'DealerGrid: Post your vehicles to 70+ websites, list for free on the DealerGrid Marketplace with zero conquest ads, advertise across Google and Meta, and route inquiries directly to your CRM.';
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
        {/* Top of Page: Lead with Top 10 Core Value Propositions */}
        <div id="top-propositions">
          <TopTenHeroOverview onRequestAccess={openIntake} />
        </div>

        {/* 10 Consistently Structured Sections Containing More Detail & Real Examples */}
        {TOP_TEN_VALUE_PROPOSITIONS.map((vp, index) => {
          const nextProp = TOP_TEN_VALUE_PROPOSITIONS[index + 1];
          return (
            <ValuePropositionSection
              key={vp.number}
              propData={vp}
              isEven={index % 2 === 1}
              nextPropId={nextProp?.id}
              onRequestAccess={openIntake}
            />
          );
        })}

        {/* Rooftop Evaluation & Onboarding Request */}
        <GettingStartedSection />
      </main>

      {/* Footer */}
      <EditorialFooter />

      {/* Dealership Evaluation Modal */}
      <LeadIntakeModal isOpen={intakeOpen} onClose={closeIntake} />
    </div>
  );
}
