export type GeocodeInput = {
  street?:     string;
  city?:       string;
  state?:      string;
  postalCode?: string;
  country?:    string;
};

export type GeocodeResult = {
  lat:        number;
  lng:        number;
  confidence: number; // 1–10 (OpenCage scale)
  provider:   'opencage';
};

// Injectable function type — backfill service and tests both use this shape.
export type GeocodeFn = (address: GeocodeInput) => Promise<GeocodeResult | null>;

type OpenCageResponse = {
  results: Array<{
    geometry:   { lat: number; lng: number };
    confidence: number;
  }>;
  status: { code: number; message: string };
};

export function buildOpenCageGeocoder(apiKey: string): GeocodeFn {
  return async (address: GeocodeInput): Promise<GeocodeResult | null> => {
    const q = [address.street, address.city, address.state, address.postalCode, address.country]
      .filter(Boolean)
      .join(', ');
    if (!q) return null;

    const url = new URL('https://api.opencagedata.com/geocode/v1/json');
    url.searchParams.set('q', q);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('limit', '1');
    url.searchParams.set('no_annotations', '1');
    url.searchParams.set('countrycode', address.country?.toLowerCase().slice(0, 2) ?? 'us');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`OpenCage HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json() as OpenCageResponse;
    const result = data.results?.[0];
    if (!result) return null;

    return {
      lat:        result.geometry.lat,
      lng:        result.geometry.lng,
      confidence: result.confidence,
      provider:   'opencage',
    };
  };
}
