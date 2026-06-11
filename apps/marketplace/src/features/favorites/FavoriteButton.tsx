import { useAuth } from '../../contexts/AuthContext.tsx';
import { useCategoryId, useCategorySchema } from '../../contexts/CategoryContext.tsx';

type Props = {
  listingId: string;
  className?: string;
};

export function FavoriteButton({ listingId, className = '' }: Props) {
  const { isFavorited, toggleFavorite } = useAuth();
  const categoryId = useCategoryId();
  const schema = useCategorySchema();
  const saved = isFavorited(listingId);
  const noun = schema.asset.singular;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void toggleFavorite(listingId, categoryId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? `Remove from saved ${schema.asset.plural}` : `Save ${noun}`}
      aria-pressed={saved}
      className={`mp-focus flex size-8 items-center justify-center rounded-full bg-white/90 shadow-elevation-2 transition hover:bg-white ${saved ? 'text-red-500' : 'text-ink-muted hover:text-red-500'} ${className}`}
    >
      {saved ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
          <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.184C4.045 12.211 2 9.6 2 6.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 6.5c0 3.1-2.045 5.711-3.885 7.516a22.045 22.045 0 0 1-2.582 2.184 20.759 20.759 0 0 1-1.162.682l-.019.01-.005.003h-.002l-.001.001a.75.75 0 0 1-.688 0l-.001-.001h-.002z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
    </button>
  );
}
