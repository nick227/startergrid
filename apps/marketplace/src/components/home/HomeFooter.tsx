import { MOCK_FOOTER_BRANDS } from '../../data/homeMockData.ts';
import { buildAutomotiveListHref } from './automotiveLinks.ts';

export function HomeFooter() {
  return (
    <footer className="bg-navy-900 py-12 border-t border-navy-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h3 className="text-white font-bold mb-4">What shoppers are searching for</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {MOCK_FOOTER_BRANDS.map(brand => (
              <a key={brand} href={buildAutomotiveListHref({ make: brand, condition: 'USED' })} className="hover:text-white transition-colors text-sm">
                Used {brand}
              </a>
            ))}
          </div>
        </div>
        
        <div className="pt-8 border-t border-navy-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} Marketplace Inc. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
