import { useCallback, useSyncExternalStore } from 'react';
import {
  buyerGeoApiSignature,
  clearBuyerLocationPreference,
  commitBuyerLocationDraft,
  getBuyerLocationSnapshot,
  resolveBuyerGeoApiParams,
  setBuyerLocationNationwide,
  subscribeBuyerLocation,
  type BuyerGeoApiParams,
  type BuyerLocationDraft,
} from './buyerLocation.ts';

export function useBuyerLocation() {
  const preference = useSyncExternalStore(
    subscribeBuyerLocation,
    getBuyerLocationSnapshot,
    () => null,
  );

  const geoApiParams: BuyerGeoApiParams = resolveBuyerGeoApiParams(preference);
  const geoApiKey = buyerGeoApiSignature(geoApiParams);

  const applyDraft = useCallback((draft: BuyerLocationDraft) => {
    return commitBuyerLocationDraft(draft);
  }, []);

  const setNationwide = useCallback((nationwide: boolean) => {
    return setBuyerLocationNationwide(nationwide);
  }, []);

  const clear = useCallback(() => {
    clearBuyerLocationPreference();
  }, []);

  return {
    preference,
    geoApiParams,
    geoApiKey,
    applyDraft,
    setNationwide,
    clear,
  };
}

