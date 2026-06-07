import type { SplashContent } from '../../types/content.ts';

interface SplashFooterProps {
  content: SplashContent;
}

export function SplashFooter({ content }: SplashFooterProps) {
  const year = new Date().getFullYear();
  const { brand } = content;

  return (
    <footer className="splash-footer" role="contentinfo">
      <div className="container">
        <div className="splash-footer__inner">
          <div className="splash-footer__brand">
            <span className="splash-footer__name">StarterGrid</span>
            <span className="splash-footer__tagline">
              The multi-category automation platform
            </span>
          </div>

          <nav className="splash-footer__links" aria-label="Footer links">
            <a href="mailto:hello@startergrid.com">Contact</a>
            <a href="#/">All products</a>
            <a href="#privacy">Privacy policy</a>
            <a href="#terms">Terms of service</a>
          </nav>
        </div>

        <p className="splash-footer__legal">
          &copy; {year} StarterGrid Inc. All rights reserved.{' '}
          {brand.name} is a product of StarterGrid Inc. and is not affiliated with any
          manufacturer, dealer group, or third-party platform referenced on this page.
        </p>
      </div>
    </footer>
  );
}
