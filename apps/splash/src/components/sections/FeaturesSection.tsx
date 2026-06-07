import { useEffect, useRef } from 'react';
import type { SplashContent } from '../../types/content.ts';

interface FeaturesSectionProps {
  content: SplashContent;
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
      { threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export function FeaturesSection({ content }: FeaturesSectionProps) {
  const { block3_features: feat } = content;
  const sectionRef = useRef<HTMLElement>(null);
  useRevealOnScroll(sectionRef);

  return (
    <section className="features-section section" id="features" ref={sectionRef} aria-label="Platform features">
      <div className="container">
        <div className="text-center reveal" style={{ maxWidth: '640px', marginInline: 'auto' }}>
          <span className="section-label">{feat.sectionLabel}</span>
          <h2 className="t-h2 mb-4">{feat.heading}</h2>
          <p className="t-lead mb-12">{feat.subheading}</p>
        </div>

        <div className="grid-3">
          {feat.features.map((feature, i) => (
            <article
              key={i}
              className={`feature-card reveal reveal-delay-${Math.min(i + 1, 4)}`}
            >
              <div className="feature-card__icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__body">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
