import { useEffect } from 'react';
import { useAuth } from './AuthContext.tsx';
import { useCategoryId } from './CategoryContext.tsx';

export function CategoryFavoritesSync() {
  const categoryId = useCategoryId();
  const { user, syncFavorites } = useAuth();

  useEffect(() => {
    if (!user) return;
    void syncFavorites(categoryId).catch(() => {
      // Non-critical
    });
  }, [user, categoryId, syncFavorites]);

  return null;
}
