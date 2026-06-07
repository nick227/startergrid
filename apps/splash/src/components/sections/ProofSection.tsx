import { useEffect, useRef } from 'react';
import type { SplashContent } from '../../types/content.ts';

interface ProofSectionProps {
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
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export function ProofSection({ content }: ProofSectionProps) {
  const { block4_proof: proof } = content;
  const sectionRef = useRef<HTMLElement>(null);
  useRevealOnScroll(sectionRef);

  return (
    <section className="proof-section section" id="proof" ref={sectionRef} aria-label="Social proof and results">
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="text-center reveal" style={{ maxWidth: '600px', marginInline: 'auto', marginBottom: 'var(--space-12)' }}>
          <span className="section-label on-dark">{proof.sectionLabel}</span>
          <h2 className="t-h2 on-dark">{proof.heading}</h2>
        </div>

        {/* Stats grid */}
        <div className="stat-grid reveal reveal-delay-1">
          {proof.stats.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card__value">
                {stat.value}
                {stat.suffix && <span>{stat.suffix}</span>}
              </div>
              <div className="stat-card__label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        {proof.testimonial && (
          <div className="reveal reveal-delay-2">
            <blockquote className="testimonial-card">
              <p className="testimonial-card__quote">{proof.testimonial.quote}</p>
              <footer>
                <cite style={{ fontStyle: 'normal' }}>
                  <p className="testimonial-card__author">{proof.testimonial.author}</p>
                  <p className="testimonial-card__role">{proof.testimonial.role}</p>
                </cite>
              </footer>
            </blockquote>
          </div>
        )}
      </div>
    </section>
  );
}
