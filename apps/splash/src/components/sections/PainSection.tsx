import { useEffect, useRef } from 'react';
import type { SplashContent } from '../../types/content.ts';

interface PainSectionProps {
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

export function PainSection({ content }: PainSectionProps) {
  const { block2_pain: pain } = content;
  const sectionRef = useRef<HTMLElement>(null);
  useRevealOnScroll(sectionRef);

  return (
    <section className="pain-section section" id="pain" ref={sectionRef} aria-label="Problem statement">
      <div className="container">
        <div className="reveal">
          <span className="section-label">{pain.sectionLabel}</span>
          <h2 className="t-h2 mb-5 on-dark">{pain.heading}</h2>
          {pain.subheading && (
            <p className="t-lead mb-12 on-dark" style={{ maxWidth: '560px' }}>
              {pain.subheading}
            </p>
          )}
        </div>

        <div className="grid-3">
          {pain.painPoints.map((point, i) => (
            <article
              key={i}
              className={`pain-card reveal reveal-delay-${Math.min(i + 1, 4)}`}
            >
              <div className="pain-card__icon" aria-hidden="true">
                {point.icon}
              </div>
              <h3 className="pain-card__title">{point.title}</h3>
              <p className="pain-card__body">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
