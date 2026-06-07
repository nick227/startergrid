import { useEffect, useRef } from 'react';
import type { SplashContent } from '../../types/content.ts';

interface CtaSectionProps {
  content: SplashContent;
  onCta: () => void;
}

function useRevealOnScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export function CtaSection({ content, onCta }: CtaSectionProps) {
  const { block5_cta: cta } = content;
  const sectionRef = useRef<HTMLElement>(null);
  useRevealOnScroll(sectionRef);

  return (
    <section className="cta-section section" id="cta" ref={sectionRef} aria-label="Call to action">
      <div className="container">
        <div className="cta-box reveal">
          <h2 className="cta-box__headline">{cta.heading}</h2>
          <p className="cta-box__sub">{cta.subheading}</p>
          <div className="cta-box__actions">
            <button
              id="cta-section-btn"
              className="btn btn-primary btn-lg"
              onClick={onCta}
              type="button"
            >
              {cta.ctaLabel}
            </button>
          </div>
          {cta.urgencyNote && (
            <p className="cta-box__urgency">{cta.urgencyNote}</p>
          )}
        </div>
      </div>
    </section>
  );
}
