import { useEffect, useRef } from 'react';
import type { SplashContent } from '../../types/content.ts';
import { TrustBar } from '../ui/TrustBar.tsx';

interface HeroSectionProps {
  content: SplashContent;
  onCta: () => void;
}

/**
 * Abstract SVG visual — orbital data-flow diagram representing
 * the platform connecting a source (DMS/inventory) to many channels.
 * Fully category-agnostic; accent color drives the ring and node colors.
 */
function HeroVisual() {
  return (
    <svg
      viewBox="0 0 520 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', height: '420px', opacity: 0.85 }}
    >
      {/* Outer orbital ring */}
      <ellipse cx="260" cy="210" rx="220" ry="170" stroke="var(--accent)" strokeWidth="1" strokeDasharray="6 10" opacity="0.25">
        <animateTransform attributeName="transform" type="rotate" from="0 260 210" to="360 260 210" dur="60s" repeatCount="indefinite" />
      </ellipse>

      {/* Middle ring */}
      <ellipse cx="260" cy="210" rx="145" ry="110" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 8" opacity="0.18">
        <animateTransform attributeName="transform" type="rotate" from="0 260 210" to="-360 260 210" dur="40s" repeatCount="indefinite" />
      </ellipse>

      {/* Center hub */}
      <circle cx="260" cy="210" r="42" fill="var(--navy-900)" stroke="var(--accent)" strokeWidth="1.5" opacity="0.9" />
      <circle cx="260" cy="210" r="32" fill="var(--accent)" opacity="0.12" />
      <text x="260" y="207" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.9">YOUR</text>
      <text x="260" y="222" textAnchor="middle" fill="white" fontSize="10" fontWeight="500" fontFamily="Inter, sans-serif" opacity="0.55">SOURCE</text>

      {/* Satellite nodes — channel icons */}
      {/* Node 1 — top */}
      <circle cx="260" cy="50" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="260" y="56" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">🌐</text>

      {/* Node 2 — top-right */}
      <circle cx="445" cy="100" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="445" y="106" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">📊</text>

      {/* Node 3 — right */}
      <circle cx="470" cy="210" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="470" y="216" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">📱</text>

      {/* Node 4 — bottom-right */}
      <circle cx="420" cy="330" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="420" y="336" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">🔔</text>

      {/* Node 5 — bottom */}
      <circle cx="260" cy="370" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="260" y="376" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">📡</text>

      {/* Node 6 — left */}
      <circle cx="50" cy="210" r="22" fill="var(--navy-800)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <text x="50" y="216" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">🎯</text>

      {/* Connector lines to center */}
      {[
        [260, 72, 260, 168],
        [425, 116, 296, 177],
        [449, 210, 302, 210],
        [402, 314, 290, 240],
        [260, 348, 260, 252],
        [72, 210, 218, 210],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.2"
        />
      ))}

      {/* Animated pulse on lines */}
      <circle r="4" fill="var(--accent)" opacity="0.7">
        <animateMotion dur="3s" repeatCount="indefinite" path="M260,72 L260,168" />
      </circle>
      <circle r="4" fill="var(--accent)" opacity="0.7">
        <animateMotion dur="4s" repeatCount="indefinite" path="M449,210 L302,210" begin="1s" />
      </circle>
      <circle r="4" fill="var(--accent)" opacity="0.7">
        <animateMotion dur="3.5s" repeatCount="indefinite" path="M72,210 L218,210" begin="2s" />
      </circle>
    </svg>
  );
}

export function HeroSection({ content, onCta }: HeroSectionProps) {
  const { block1_hero: hero } = content;
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // Parse headline for <em> tags (safe — content is our own)
  // We replace <em> with accent-colored spans
  const headlineHtml = hero.headline.replace(
    /<em>(.*?)<\/em>/g,
    '<em style="color:var(--accent);font-style:normal">$1</em>',
  );

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    // Slight reveal effect on mount
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  return (
    <section className="hero" id="hero" aria-label="Hero">
      {/* Background */}
      <div className="hero__bg">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
        <div className="hero__gradient" />
        <div className="hero__noise" />
      </div>

      {/* Abstract visual (desktop only) */}
      <div className="hero__visual" aria-hidden="true">
        <HeroVisual />
      </div>

      {/* Content */}
      <div className="hero__content">
        <div className="container">
          <div className="reveal visible">
            <div className="hero__eyebrow">{hero.eyebrow}</div>
          </div>

          <h1
            ref={headlineRef}
            className="hero__headline"
            // Safe — content is ours, no user input
            dangerouslySetInnerHTML={{ __html: headlineHtml }}
          />

          <p className="hero__subheadline reveal visible reveal-delay-1">
            {hero.subheadline}
          </p>

          <div className="hero__actions reveal visible reveal-delay-2">
            <button
              id="hero-cta-primary"
              className="btn btn-primary btn-lg"
              onClick={onCta}
              type="button"
            >
              {hero.ctaLabel}
            </button>
            <button
              id="hero-cta-secondary"
              className="btn btn-ghost btn-lg"
              onClick={onCta}
              type="button"
            >
              {hero.ctaSecondaryLabel}
            </button>
          </div>

          <div className="hero__trust reveal visible reveal-delay-3">
            <TrustBar items={hero.trustItems} variant="dark" />
          </div>
        </div>
      </div>
    </section>
  );
}
