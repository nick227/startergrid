import type { DealershipPayload, PlatformProfileSeed, VehiclePayload } from '../../lib/types.js';

export function generateMockOutputNames(platform: PlatformProfileSeed): string[] {
  const base = `exports/${platform.slug}`;
  switch (platform.outputFormat) {
    case 'GOOGLE_VEHICLE_FEED_JSON_OR_XML':
      return [`${base}/vehicle-feed.json`, `${base}/vehicle-feed.xml`];
    case 'META_VEHICLE_CATALOG_CSV':
    case 'TIKTOK_AUTOMOTIVE_CATALOG_CSV':
      return [`${base}/catalog.csv`];
    case 'MICROSOFT_AUTO_INVENTORY_BULK_FEED':
      return [`${base}/auto-inventory-bulk-feed.csv`];
    case 'EBAY_MOTORS_LISTING_API_PAYLOAD':
      return [`${base}/inventory-item.json`, `${base}/offer.json`, `${base}/bulk-listing-feed.xml`];
    case 'SNAPCHAT_PRODUCT_CATALOG_FEED':
      return [`${base}/product-catalog.csv`];
    case 'PINTEREST_PRODUCT_CATALOG_FEED':
      return [`${base}/product-catalog.csv`, `${base}/product-groups.json`];
    case 'REDDIT_PRODUCT_CATALOG_FEED':
      return [`${base}/product-catalog.json`, `${base}/product-feed.json`, `${base}/product-sets.json`];
    case 'X_PRODUCT_CATALOG_FEED':
      return [`${base}/shopping-manager-feed.csv`, `${base}/campaign-creative.json`];
    case 'LINKEDIN_LEAD_GEN_FORM_PACKET':
      return [`${base}/lead-gen-form.json`, `${base}/lead-sync-mapping.json`];
    case 'NEXTDOOR_LOCAL_AD_PACKET':
      return [`${base}/local-campaign.json`, `${base}/creative-packet.json`];
    case 'APPLE_BUSINESS_LOCATION_PACKET':
      return [`${base}/brand-location-packet.json`];
    case 'ADF_XML_EMAIL':
      return [`${base}/sample-lead.adf.xml`];
    default:
      return [`${base}/application-packet.json`, `${base}/feed-sample.csv`];
  }
}

export function toCatalogRows(dealership: DealershipPayload, vehicles: VehiclePayload[]) {
  return vehicles.map((vehicle) => ({
    dealer_name: dealership.dbaName ?? dealership.legalName,
    vin: vehicle.vin,
    stock_number: vehicle.stockNumber,
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim ?? ''}`.trim(),
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    mileage: vehicle.mileage,
    price: ((vehicle.priceCents ?? 0) / 100).toFixed(2),
    condition: vehicle.condition,
    exterior_color: vehicle.exteriorColor,
    image_link: vehicle.media?.[0]?.url,
    url: `${dealership.websiteUrl}/inventory/${vehicle.stockNumber}`
  }));
}
