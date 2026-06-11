import { useState, useRef } from 'react';
import { uploadOperatorAvatar, type OperatorUser } from '../../lib/api/auth.ts';

type Props = {
  user: OperatorUser;
  onAvatarUpdated: () => void;
};

export function OperatorAvatar({ user, onAvatarUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadOperatorAvatar(file);
      onAvatarUpdated();
    } catch (err) {
      console.error('Failed to upload avatar', err);
      alert('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      className="relative flex items-center gap-2 cursor-pointer group"
      onClick={() => fileInputRef.current?.click()}
      title="Upload Avatar"
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover shadow-sm border border-navy-700 group-hover:border-navy-500 transition-colors" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center text-xs font-medium text-silver-300 border border-navy-700 group-hover:border-navy-500 transition-colors">
          {user.email.charAt(0).toUpperCase()}
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 bg-navy-900/60 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-silver-300 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <span className="text-ink-faint text-xs hidden sm:inline truncate max-w-[12rem] group-hover:text-silver-300 transition-colors">
        {user.email}
      </span>

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
