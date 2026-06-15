import { useState } from 'react';

export function HomeSellTrade() {
  const [identifier, setIdentifier] = useState('');

  return (
    <div className="py-20 bg-surface-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <h2 className="text-sm font-bold uppercase tracking-widest text-ink-muted mb-2">
          Selling your car has never been easier
        </h2>
        <h3 className="text-5xl sm:text-7xl font-black text-ink-heading uppercase tracking-tighter mb-16" style={{ transform: 'scaleY(1.1)' }}>
          IT'S SO SIMPLE
        </h3>
        
        <div className="relative mb-20">
          <div className="absolute left-1/2 -top-10 -translate-x-1/2 text-[12rem] font-black text-orange-500/20 leading-none select-none -z-10">
            3
          </div>
          <h4 className="text-3xl font-black text-ink-heading uppercase tracking-tight">
            EASY STEPS
          </h4>
          <p className="text-ink-muted font-medium mt-1">To get top dollar for your vehicle</p>
        </div>

        <div className="space-y-24 text-left max-w-2xl mx-auto">
          
          {/* Step 1 */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <span className="text-orange-500 font-black text-2xl uppercase tracking-tight">Step 1</span>
              <h4 className="text-4xl font-black text-ink-heading uppercase tracking-tighter mt-1 mb-4" style={{ transform: 'scaleY(1.1)' }}>
                GET AN OFFER INSTANTLY
              </h4>
              <p className="text-ink-body font-medium leading-relaxed mb-6">
                Tell us about your vehicle and get a real offer in minutes, good for 7 days.
              </p>
              
              {/* Input Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (identifier.trim().length < 5) {
                    alert('Please enter a valid VIN or License Plate.');
                    return;
                  }
                  alert(`Lead captured for vehicle: ${identifier}. A representative will contact you shortly!`);
                  setIdentifier('');
                }}
                className="bg-white p-2 rounded-xl flex flex-col sm:flex-row gap-2 shadow-elevation-2 focus-within:ring-2 focus-within:ring-orange-500 transition-shadow"
              >
                <input 
                  type="text" 
                  placeholder="Enter License Plate or VIN" 
                  className="flex-1 bg-transparent px-4 py-3 text-ink-heading font-bold uppercase placeholder:normal-case placeholder:font-normal placeholder:text-ink-faint outline-none"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition whitespace-nowrap">
                  Get Estimate
                </button>
              </form>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <span className="text-orange-500 font-black text-2xl uppercase tracking-tight">Step 2</span>
              <h4 className="text-4xl font-black text-ink-heading uppercase tracking-tighter mt-1 mb-4" style={{ transform: 'scaleY(1.1)' }}>
                FREE PICKUP AS SOON AS TODAY
              </h4>
              <p className="text-ink-body font-medium leading-relaxed">
                We'll come to you. Schedule a pickup as soon as today, or visit a local partner. You don't even have to leave your driveway.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <span className="text-orange-500 font-black text-2xl uppercase tracking-tight">Step 3</span>
              <h4 className="text-4xl font-black text-ink-heading uppercase tracking-tighter mt-1 mb-4" style={{ transform: 'scaleY(1.1)' }}>
                GET PAID ON THE SPOT
              </h4>
              <p className="text-ink-body font-medium leading-relaxed mb-8">
                Hand over the keys and title, and we'll hand over a check. Simple as that. The money is yours.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
