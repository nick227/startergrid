import type { DealershipPayload, FeedArtifact, PlatformProfileSeed, VehiclePayload } from '../../lib/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceDollars(priceCents: number | null | undefined): string {
  return ((priceCents ?? 0) / 100).toFixed(2);
}

function vehicleTitle(v: VehiclePayload): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
}

function vehicleUrl(dealership: DealershipPayload, v: VehiclePayload): string {
  const base = dealership.websiteUrl ?? 'https://dealer.example.com';
  return `${base}/vehicles/${v.stockNumber}`;
}

function firstImageUrl(v: VehiclePayload): string {
  return v.media?.find(m => m.kind === 'IMAGE')?.url ?? '';
}

// ─── Google Vehicle Listings Feed (JSON) ─────────────────────────────────────
// https://developers.google.com/vehicle-listings/reference/feed-specification

export function generateGoogleVehicleFeed(dealership: DealershipPayload, vehicles: VehiclePayload[]): FeedArtifact {
  const items = vehicles.map(v => ({
    id: v.stockNumber,
    title: vehicleTitle(v),
    link: vehicleUrl(dealership, v),
    image_link: firstImageUrl(v),
    condition: v.condition?.toLowerCase() === 'new' ? 'new' : 'used',
    availability: 'in stock',
    price: `${priceDollars(v.priceCents)} USD`,
    vin: v.vin ?? '',
    year: v.year ?? null,
    make: v.make ?? '',
    model: v.model ?? '',
    trim: v.trim ?? undefined,
    mileage: v.mileage != null ? { value: v.mileage, unit: 'MI' } : undefined,
    body_style: v.bodyStyle ?? undefined,
    exterior_color: v.exteriorColor ?? undefined,
    drivetrain: v.drivetrain ?? undefined,
    fuel_type: v.fuelType ?? undefined,
    dealer: {
      id: dealership.legalName.toLowerCase().replace(/\s+/g, '-'),
      name: dealership.dbaName ?? dealership.legalName,
      phone: dealership.primaryContact?.phone ?? '',
      city: (dealership.rooftopAddress as Record<string, string>)?.city ?? '',
      state: (dealership.rooftopAddress as Record<string, string>)?.state ?? '',
      zip: (dealership.rooftopAddress as Record<string, string>)?.postalCode ?? '',
      country: (dealership.rooftopAddress as Record<string, string>)?.country ?? 'US'
    }
  }));

  return {
    platformSlug: 'google-vehicle-ads',
    format: 'GOOGLE_VEHICLE_FEED_JSON',
    filename: 'google-vehicle-feed.json',
    content: JSON.stringify({ vehicles: items }, null, 2),
    generatedAt: new Date().toISOString()
  };
}

// ─── Meta Automotive Inventory Catalog (CSV) ─────────────────────────────────
// https://developers.facebook.com/docs/marketing-api/catalog/reference

export function generateMetaCatalogCsv(dealership: DealershipPayload, vehicles: VehiclePayload[]): FeedArtifact {
  const headers = [
    'id', 'title', 'description', 'availability', 'condition', 'price',
    'link', 'image_link', 'brand', 'vehicle_type', 'vin',
    'make', 'model', 'year', 'mileage', 'body_style', 'exterior_color', 'state_of_vehicle'
  ];

  const rows = vehicles.map(v => {
    const desc = `${v.condition ?? 'Used'} ${vehicleTitle(v)} with ${v.mileage?.toLocaleString() ?? 0} miles`;
    return [
      v.stockNumber,
      vehicleTitle(v),
      desc,
      'in stock',
      (v.condition?.toLowerCase() === 'new') ? 'new' : 'used',
      `${priceDollars(v.priceCents)} USD`,
      vehicleUrl(dealership, v),
      firstImageUrl(v),
      v.make ?? '',
      'AUTOMOBILE',
      v.vin ?? '',
      v.make ?? '',
      v.model ?? '',
      String(v.year ?? ''),
      v.mileage != null ? `${v.mileage} MI` : '',
      v.bodyStyle ?? '',
      v.exteriorColor ?? '',
      (v.condition?.toLowerCase() === 'new') ? 'NEW' : 'USED'
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });

  return {
    platformSlug: 'meta-automotive-ads',
    format: 'META_VEHICLE_CATALOG_CSV',
    filename: 'meta-vehicle-catalog.csv',
    content: [headers.join(','), ...rows].join('\n'),
    generatedAt: new Date().toISOString()
  };
}

// ─── ADF/XML 1.0 Lead Payload ─────────────────────────────────────────────────
// https://adfxml.info/adf_spec.pdf

export function generateAdfXml(options: {
  dealership: DealershipPayload;
  vehicle: VehiclePayload;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
}): FeedArtifact {
  const { dealership, vehicle: v, contactName, contactEmail, contactPhone, message } = options;
  const requestDate = new Date().toISOString().replace('Z', '');
  const dealer = dealership.primaryContact as Record<string, string> ?? {};
  const address = dealership.rooftopAddress as Record<string, string> ?? {};

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<adf>
  <prospect>
    <requestdate>${requestDate}</requestdate>
    <vehicle interest="buy" status="${v.condition?.toLowerCase() === 'new' ? 'new' : 'used'}">
      <year>${v.year ?? ''}</year>
      <make>${v.make ?? ''}</make>
      <model>${v.model ?? ''}</model>
      <trim>${v.trim ?? ''}</trim>
      <vin>${v.vin ?? ''}</vin>
      <stock>${v.stockNumber}</stock>
      <price type="quote" currency="USD">${priceDollars(v.priceCents)}</price>
      <odometer status="unknown" units="mi">${v.mileage ?? 0}</odometer>
    </vehicle>
    <customer>
      <contact primarycontact="1">
        <name part="full">${contactName ?? 'Prospective Buyer'}</name>
        ${contactEmail ? `<email>${contactEmail}</email>` : ''}
        ${contactPhone ? `<phone type="voice" time="nopreference">${contactPhone}</phone>` : ''}
      </contact>
      ${message ? `<comments>${message}</comments>` : ''}
    </customer>
    <vendor>
      <vendorname>${dealership.dbaName ?? dealership.legalName}</vendorname>
      <contact primarycontact="1">
        <name part="full">${dealer['name'] ?? ''}</name>
        <email>${dealer['email'] ?? ''}</email>
        <phone type="voice" time="business">${(dealer['phone'] ?? '').replace(/\D/g, '')}</phone>
      </contact>
      <address>
        <street line="1">${address['street'] ?? ''}</street>
        <city>${address['city'] ?? ''}</city>
        <regioncode>${address['state'] ?? ''}</regioncode>
        <postalcode>${address['postalCode'] ?? ''}</postalcode>
        <country>${address['country'] ?? 'US'}</country>
      </address>
    </vendor>
  </prospect>
</adf>`;

  return {
    platformSlug: 'adf-xml-lead-routing',
    format: 'ADF_XML_1_0',
    filename: `adf-lead-${v.stockNumber}-${Date.now()}.xml`,
    content: xml,
    generatedAt: new Date().toISOString()
  };
}

// ─── Owned Storefront Listing JSON ───────────────────────────────────────────

export function generateOwnedStorefrontJson(dealership: DealershipPayload, vehicles: VehiclePayload[]): FeedArtifact {
  const address = dealership.rooftopAddress as Record<string, string> ?? {};

  const payload = {
    dealer: {
      slug: (dealership.dbaName ?? dealership.legalName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: dealership.dbaName ?? dealership.legalName,
      legalName: dealership.legalName,
      address: {
        street: address['street'] ?? '',
        city: address['city'] ?? '',
        state: address['state'] ?? '',
        postalCode: address['postalCode'] ?? '',
        country: address['country'] ?? 'US'
      },
      website: dealership.websiteUrl ?? '',
      phone: (dealership.primaryContact as Record<string, string>)?.['phone'] ?? '',
      email: (dealership.primaryContact as Record<string, string>)?.['email'] ?? '',
      inventoryCount: vehicles.length
    },
    listings: vehicles.map(v => ({
      id: v.stockNumber,
      vin: v.vin ?? '',
      title: vehicleTitle(v),
      year: v.year ?? null,
      make: v.make ?? '',
      model: v.model ?? '',
      trim: v.trim ?? null,
      condition: v.condition ?? '',
      mileage: v.mileage ?? null,
      priceCents: v.priceCents ?? null,
      priceDisplay: `$${((v.priceCents ?? 0) / 100).toLocaleString()}`,
      exteriorColor: v.exteriorColor ?? null,
      interiorColor: v.interiorColor ?? null,
      bodyStyle: v.bodyStyle ?? null,
      fuelType: v.fuelType ?? null,
      drivetrain: v.drivetrain ?? null,
      transmission: v.transmission ?? null,
      images: (v.media ?? []).filter(m => m.kind === 'IMAGE').map(m => ({
        url: m.url ?? '',
        width: m.width ?? null,
        height: m.height ?? null
      })),
      listingUrl: vehicleUrl(dealership, v),
      leadCaptureUrl: `${vehicleUrl(dealership, v)}/contact`
    })),
    generatedAt: new Date().toISOString(),
    channel: 'DEALER_STOREFRONT'
  };

  return {
    platformSlug: 'dealer-storefront',
    format: 'OWNED_STOREFRONT_LISTING_JSON',
    filename: 'storefront-listings.json',
    content: JSON.stringify(payload, null, 2),
    generatedAt: new Date().toISOString()
  };
}

// ─── Platform dispatcher ─────────────────────────────────────────────────────

export function generateFeedForPlatform(
  platform: PlatformProfileSeed,
  dealership: DealershipPayload,
  vehicles: VehiclePayload[]
): FeedArtifact {
  switch (platform.slug) {
    case 'dealer-storefront':
      return generateOwnedStorefrontJson(dealership, vehicles);
    case 'google-vehicle-ads':
      return generateGoogleVehicleFeed(dealership, vehicles);
    case 'meta-automotive-ads':
      return generateMetaCatalogCsv(dealership, vehicles);
    case 'adf-xml-lead-routing':
      return generateAdfXml({ dealership, vehicle: vehicles[0] ?? { stockNumber: 'NONE' } });
    default: {
      // Generic JSON catalog for all other FEEDABLE platforms
      const rows = vehicles.map(v => ({
        id: v.stockNumber,
        vin: v.vin ?? '',
        title: vehicleTitle(v),
        price: `${priceDollars(v.priceCents)} USD`,
        condition: v.condition ?? '',
        link: vehicleUrl(dealership, v),
        image_link: firstImageUrl(v),
        make: v.make ?? '',
        model: v.model ?? '',
        year: v.year ?? null,
        mileage: v.mileage ?? null,
        exterior_color: v.exteriorColor ?? null
      }));
      return {
        platformSlug: platform.slug,
        format: platform.outputFormat,
        filename: `${platform.slug}-feed.json`,
        content: JSON.stringify({ platform: platform.slug, items: rows }, null, 2),
        generatedAt: new Date().toISOString()
      };
    }
  }
}
