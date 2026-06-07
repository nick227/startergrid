import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchFeed,
  type FeedFilters,
  type MarketplaceFeedItem,
  type MarketplaceFeedResponse,
} from '../lib/api.ts';
import { useCategoryId, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { feedFilterKey, getSavedFeedState, saveFeedState } from '../lib/feedState.ts';
import type { ListQuery } from '../lib/routes.ts';

const FEED_LIMIT = 24;

type FeedStatus = {
  items: MarketplaceFeedItem[];
  nextCursor: string | null;
  totalEstimate: number;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: unknown;
  restoredScrollY: number | null;
};

export function useInfiniteMarketplaceFeed(query: ListQuery) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();

  const filters = useMemo<FeedFilters>(() => ({
    category:   categoryId,
    make:       query.make,
    model:      query.model,
    condition:  query.condition,
    minPrice:   query.minPrice,
    maxPrice:   query.maxPrice,
    maxMileage: query.maxMileage,
    dealer:     query.dealer,
    limit:      FEED_LIMIT,
  }), [categoryId, query.make, query.model, query.condition, query.minPrice, query.maxPrice, query.maxMileage, query.dealer]);

  const filterKey = useMemo(() => feedFilterKey(slug, query), [slug, query]);
  const requestId = useRef(0);
  const loadingRef = useRef(false);
  const [state, setState] = useState<FeedStatus>(() => {
    const saved = getSavedFeedState(filterKey);
    if (saved) {
      return {
        items: saved.items,
        nextCursor: saved.nextCursor,
        totalEstimate: saved.totalEstimate,
        loadingInitial: false,
        loadingMore: false,
        error: null,
        restoredScrollY: saved.scrollY,
      };
    }
    return {
      items: [],
      nextCursor: null,
      totalEstimate: 0,
      loadingInitial: true,
      loadingMore: false,
      error: null,
      restoredScrollY: null,
    };
  });

  const mergePage = useCallback((current: MarketplaceFeedItem[], page: MarketplaceFeedResponse, mode: 'replace' | 'append') => {
    if (mode === 'replace') return page.items;
    const seen = new Set(current.map(item => item.id));
    return [...current, ...page.items.filter(item => !seen.has(item.id))];
  }, []);

  const loadPage = useCallback(async (mode: 'replace' | 'append') => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const id = requestId.current + 1;
    requestId.current = id;
    const cursor = mode === 'append' ? state.nextCursor ?? undefined : undefined;

    setState(current => ({
      ...current,
      error: null,
      loadingInitial: mode === 'replace' && current.items.length === 0,
      loadingMore: mode === 'append',
    }));

    try {
      const page = await fetchFeed({ ...filters, cursor });
      if (requestId.current !== id) return;
      setState(current => ({
        items: mergePage(current.items, page, mode),
        nextCursor: page.nextCursor,
        totalEstimate: page.totalEstimate,
        loadingInitial: false,
        loadingMore: false,
        error: null,
        restoredScrollY: mode === 'replace' ? null : current.restoredScrollY,
      }));
    } catch (error) {
      if (requestId.current !== id) return;
      setState(current => ({
        ...current,
        loadingInitial: false,
        loadingMore: false,
        error,
      }));
    } finally {
      if (requestId.current === id) loadingRef.current = false;
    }
  }, [filters, mergePage, state.nextCursor]);

  useEffect(() => {
    requestId.current += 1;
    loadingRef.current = false;
    const saved = getSavedFeedState(filterKey);
    if (saved) {
      setState({
        items: saved.items,
        nextCursor: saved.nextCursor,
        totalEstimate: saved.totalEstimate,
        loadingInitial: false,
        loadingMore: false,
        error: null,
        restoredScrollY: saved.scrollY,
      });
      return;
    }
    setState({
      items: [],
      nextCursor: null,
      totalEstimate: 0,
      loadingInitial: true,
      loadingMore: false,
      error: null,
      restoredScrollY: null,
    });
    void loadPage('replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    if (state.restoredScrollY == null) return;
    requestAnimationFrame(() => window.scrollTo(0, state.restoredScrollY ?? 0));
  }, [state.restoredScrollY]);

  useEffect(() => {
    if (state.items.length === 0) return;
    const save = () => saveFeedState({
      filterKey,
      items: state.items,
      nextCursor: state.nextCursor,
      totalEstimate: state.totalEstimate,
      scrollY: window.scrollY,
    });
    save();
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      window.removeEventListener('scroll', save);
    };
  }, [filterKey, state.items, state.nextCursor, state.totalEstimate]);

  return {
    ...state,
    hasMore: Boolean(state.nextCursor),
    loadMore: () => {
      if (state.nextCursor) void loadPage('append');
    },
    retry: () => void loadPage(state.items.length > 0 ? 'append' : 'replace'),
    reload: () => void loadPage('replace'),
  };
}
