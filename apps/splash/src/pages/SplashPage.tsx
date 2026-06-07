import { useState, useEffect } from 'react';
import type { SplashSlug } from '../lib/slugMap.ts';
import { loadContent } from '../lib/loadContent.ts';
import { SplashNav } from '../components/layout/SplashNav.tsx';
import { SplashFooter } from '../components/layout/SplashFooter.tsx';
import { HeroSection } from '../components/sections/HeroSection.tsx';
import { PainSection } from '../components/sections/PainSection.tsx';
import { FeaturesSection } from '../components/sections/FeaturesSection.tsx';
import { ProofSection } from '../components/sections/ProofSection.tsx';
import { CtaSection } from '../components/sections/CtaSection.tsx';
import { DemoForm } from '../components/ui/DemoForm.tsx';

interface SplashPageProps {
  slug: SplashSlug;
}

export default function SplashPage({ slug }: SplashPageProps) {
  const content = loadContent(slug);
  const [formOpen, setFormOpen] = useState(false);

  // Apply category accent colors as CSS custom properties on the root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', content.brand.accentColor);
    root.style.setProperty('--accent-dark', content.brand.accentColorDark);
    root.style.setProperty('--accent-light', content.brand.accentColorLight);
    root.style.setProperty('--accent-glow', content.brand.accentColorGlow);
    return () => {
      // Reset to defaults when navigating away
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-dark');
      root.style.removeProperty('--accent-light');
      root.style.removeProperty('--accent-glow');
    };
  }, [content.brand]);

  // Update page <title> and meta description
  useEffect(() => {
    document.title = content.meta.title;
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = content.meta.description;
    } else {
      const tag = document.createElement('meta');
      tag.name = 'description';
      tag.content = content.meta.description;
      document.head.appendChild(tag);
    }
  }, [content.meta]);

  // Close form on Escape
  useEffect(() => {
    if (!formOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [formOpen]);

  // Prevent body scroll when form is open
  useEffect(() => {
    document.body.style.overflow = formOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [formOpen]);

  const openForm = () => setFormOpen(true);
  const closeForm = () => setFormOpen(false);

  return (
    <>
      <SplashNav content={content} onCta={openForm} />

      <main id="main-content">
        <HeroSection content={content} onCta={openForm} />
        <PainSection content={content} />
        <FeaturesSection content={content} />
        <ProofSection content={content} />
        <CtaSection content={content} onCta={openForm} />
      </main>

      <SplashFooter content={content} />

      {formOpen && (
        <DemoForm content={content} onClose={closeForm} />
      )}
    </>
  );
}
