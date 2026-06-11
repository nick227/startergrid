import { useState, useRef } from 'react';
import { uploadDealerLogo, fetchDealers } from '../../lib/api/sdk.ts';
import { useAsyncQuery } from '../../hooks/useAsyncQuery.ts';
import type { DealerSummary } from '../../lib/types.ts';

export function DealerLogo({ dealershipId }: { dealershipId: string }) {
  const { data, reload } = useAsyncQuery(() => fetchDealers(), []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dealer = data?.dealers?.find((d: DealerSummary) => d.id === dealershipId);
  const logoUrl = dealer?.logoUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDealerLogo(dealershipId, file);
      reload();
    } catch (err) {
      console.error('Failed to upload logo', err);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-lg shrink-0 shadow-elevation-1 cursor-pointer overflow-hidden group"
      onClick={() => fileInputRef.current?.click()}
      title="Upload Dealer Logo"
    >
      {logoUrl ? (
        <img src={logoUrl} alt="Dealer Logo" className="w-full h-full object-cover" />
      ) : (
        <span>📡</span>
      )}
      
      {uploading && (
        <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-silver-300 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs">Edit</span>
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
    </div>
  );
}
