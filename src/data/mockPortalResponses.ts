import type { MockPortalCondition, MockPortalResponse } from '../lib/types.js';

type PlatformResponses = Partial<Record<MockPortalCondition, MockPortalResponse>>;

function r(
  platformSlug: string,
  condition: MockPortalCondition,
  httpStatus: number,
  body: Record<string, unknown>,
  nextStatus: MockPortalResponse['nextStatus'],
  dealerAction: string | null,
  notes: string
): MockPortalResponse {
  return { platformSlug, condition, httpStatus, body, nextStatus, dealerAction, notes };
}

const googleVehicleAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'google-vehicle-ads', 'PORTAL_ACCEPTED', 200,
    { kind: 'content#vehicle', id: 'mock-gva-feed-001', status: 'pending_review', feedValidationStatus: 'PENDING', merchantCenterId: 'MOCK-MC-48291' },
    'PLATFORM_REVIEWING', null,
    'Feed submitted to Merchant Center. Google crawl and review typically takes 3–5 business days.'
  ),
  PORTAL_APPROVED: r(
    'google-vehicle-ads', 'PORTAL_APPROVED', 200,
    { kind: 'content#vehicle', id: 'mock-gva-feed-001', status: 'approved', feedValidationStatus: 'PASS', merchantCenterId: 'MOCK-MC-48291' },
    'FEED_TESTING', null,
    'Feed approved by Google. Vehicle Ads campaign setup can begin; impressions start once campaign is live.'
  ),
  FEED_LIVE: r(
    'google-vehicle-ads', 'FEED_LIVE', 200,
    { kind: 'content#vehicleAdsAccount', id: 'mock-gva-feed-001', status: 'active', impressions: 0, merchantCenterId: 'MOCK-MC-48291', activatedAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'Vehicle Ads feed is live in Merchant Center. Impressions will accumulate once campaign budget is active.'
  ),
  PORTAL_REJECTED: r(
    'google-vehicle-ads', 'PORTAL_REJECTED', 422,
    { kind: 'content#vehicleListItem', id: 'mock-gva-feed-001', status: 'disapproved', servabilityStatus: 'unservable', issues: [{ servability: 'unservable', resolution: 'merchant_action', attribute: 'vin', description: 'Missing or invalid VIN' }] },
    'REJECTED',
    'Correct all disapproved attributes in Merchant Center and resubmit the feed.',
    'Feed disapproved due to attribute violations. Dealer must resolve issues in Merchant Center before relisting.'
  ),
  PORTAL_NEEDS_INFO: r(
    'google-vehicle-ads', 'PORTAL_NEEDS_INFO', 200,
    { kind: 'content#vehicleListItem', id: 'mock-gva-feed-001', status: 'pending', warnings: ['feed_url_not_crawlable'], message: 'Feed URL returned a non-200 response during crawl attempt.' },
    'DEALER_ACTION_NEEDED',
    'Verify the feed URL is publicly accessible and returns valid XML or JSON. Re-register the feed URL in Merchant Center.',
    'Feed URL crawl failed. Dealer must verify URL accessibility and MIME type before Google can index inventory.'
  ),
  PORTAL_ERROR: r(
    'google-vehicle-ads', 'PORTAL_ERROR', 503,
    { error: { code: 503, message: 'Backend Error', errors: [{ message: 'Backend Error', domain: 'global', reason: 'backendError' }] } },
    'SUBMITTED', null,
    'Transient Google Content API error. Submission packet remains queued; retry after backoff.'
  ),
  FEED_VALIDATION_FAILED: r(
    'google-vehicle-ads', 'FEED_VALIDATION_FAILED', 200,
    { kind: 'content#vehicleListItem', id: 'mock-gva-feed-001', status: 'disapproved', issues: [{ servability: 'unservable', resolution: 'merchant_action', attribute: 'price', description: 'Price does not match landing page' }, { servability: 'demoted', resolution: 'merchant_action', attribute: 'image_link', description: 'Image resolution below minimum' }] },
    'DEALER_ACTION_NEEDED',
    'Correct feed attribute violations: price must match landing page; images must meet minimum resolution. Re-upload the feed.',
    'Feed validation failed post-approval. Dealer must fix attribute issues and re-upload before ads can serve.'
  )
};

const metaAutomotiveAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'meta-automotive-ads', 'PORTAL_ACCEPTED', 201,
    { id: 'catalog_mock_123456789', name: 'Lone Star Budget Auto — Vehicle Catalog', event_time: 1748995200, review_status: { status: 'pending_review' } },
    'PLATFORM_REVIEWING', null,
    'Catalog created in Meta Commerce Manager. Business verification and catalog review typically takes 1–3 business days.'
  ),
  PORTAL_APPROVED: r(
    'meta-automotive-ads', 'PORTAL_APPROVED', 200,
    { id: 'catalog_mock_123456789', status: 'active', product_count: 37, feed_id: 'feed_mock_987654321' },
    'FEED_TESTING', null,
    'Catalog approved. Automotive Inventory Ads can be set up in Ads Manager once feed sync is confirmed.'
  ),
  FEED_LIVE: r(
    'meta-automotive-ads', 'FEED_LIVE', 200,
    { id: 'feed_mock_987654321', status: 'active', product_count: 37, last_upload_time: 1748995200, upload_schedule: 'daily' },
    'ACTIVE', null,
    'Vehicle catalog feed is active and syncing daily. Automotive Inventory Ads are eligible to serve.'
  ),
  PORTAL_REJECTED: r(
    'meta-automotive-ads', 'PORTAL_REJECTED', 400,
    { error: { message: 'Catalog rejected: required fields missing or invalid', type: 'GraphMethodException', code: 100, error_subcode: 2108006, fbtrace_id: 'mock-trace-001' } },
    'REJECTED',
    'Review the Meta catalog field requirements and correct all invalid attributes before resubmitting.',
    'Catalog rejected at Meta review. Common causes: missing VIN, invalid price format, or non-compliant image URLs.'
  ),
  PORTAL_NEEDS_INFO: r(
    'meta-automotive-ads', 'PORTAL_NEEDS_INFO', 200,
    { id: 'catalog_mock_123456789', review_status: { status: 'pending_review' }, warnings: ['business_verification_pending'], message: 'Business Manager verification is required before catalog can be approved.' },
    'DEALER_ACTION_NEEDED',
    'Complete Meta Business Manager verification at business.facebook.com before catalog approval can proceed.',
    'Catalog held pending Meta Business Manager verification. Dealer must complete business identity verification.'
  ),
  PORTAL_ERROR: r(
    'meta-automotive-ads', 'PORTAL_ERROR', 500,
    { error: { message: 'Service temporarily unavailable', type: 'OAuthException', code: 2, fbtrace_id: 'mock-trace-002' } },
    'SUBMITTED', null,
    'Transient Meta Graph API error. Submission queued; retry after brief backoff.'
  )
};

const tiktokAutomotiveAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'tiktok-automotive-ads', 'PORTAL_ACCEPTED', 200,
    { code: 0, message: 'OK', data: { catalog_id: '7300000000000000001', name: 'Lone Star Budget Auto — TikTok Catalog', status: 'PENDING', request_id: 'mock-req-tiktok-001' } },
    'PLATFORM_REVIEWING', null,
    'Catalog submitted to TikTok Ads Manager. Review typically completes within 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'tiktok-automotive-ads', 'PORTAL_APPROVED', 200,
    { code: 0, message: 'OK', data: { catalog_id: '7300000000000000001', status: 'ACTIVE', product_count: 37 } },
    'FEED_TESTING', null,
    'TikTok catalog approved. Automotive Inventory Ads campaigns can now be created in Ads Manager.'
  ),
  FEED_LIVE: r(
    'tiktok-automotive-ads', 'FEED_LIVE', 200,
    { code: 0, data: { catalog_id: '7300000000000000001', status: 'ACTIVE', product_count: 37, last_sync: '2026-06-03T12:00:00.000Z' } },
    'ACTIVE', null,
    'TikTok catalog feed is live and syncing. Vehicle ads are eligible to serve on TikTok placements.'
  ),
  PORTAL_REJECTED: r(
    'tiktok-automotive-ads', 'PORTAL_REJECTED', 200,
    { code: 40601, message: 'Catalog rejected due to policy violation', data: { reason: 'INSUFFICIENT_INVENTORY_IMAGES', affected_products: 2, request_id: 'mock-req-tiktok-002' } },
    'REJECTED',
    'Ensure all vehicle listings include at least one image meeting TikTok\'s minimum 450×450px requirement.',
    'TikTok catalog rejected for insufficient or non-compliant vehicle images. All vehicles must have qualifying images.'
  ),
  PORTAL_NEEDS_INFO: r(
    'tiktok-automotive-ads', 'PORTAL_NEEDS_INFO', 200,
    { code: 40001, message: 'Advertiser account verification pending', data: { action_required: 'COMPLETE_ADVERTISER_VERIFICATION', verification_url: 'https://ads.tiktok.com/i18n/qualification/', request_id: 'mock-req-tiktok-003' } },
    'DEALER_ACTION_NEEDED',
    'Complete TikTok advertiser account verification at ads.tiktok.com before catalog can be reviewed.',
    'TikTok catalog held pending advertiser verification. Dealer must complete identity and business verification in TikTok Ads Manager.'
  ),
  PORTAL_ERROR: r(
    'tiktok-automotive-ads', 'PORTAL_ERROR', 200,
    { code: 50001, message: 'Internal server error', data: null, request_id: 'mock-req-tiktok-004' },
    'SUBMITTED', null,
    'Transient TikTok Business API error. Submission packet queued; retry after backoff.'
  )
};

const cargurusDealer: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'cargurus-dealer', 'PORTAL_ACCEPTED', 200,
    { type: 'EMAIL_ACKNOWLEDGED', ticketId: 'CG-2026-MOCK-00001', from: 'dealers@cargurus.com', estimatedReview: '3–5 business days', message: 'Your dealer onboarding packet has been received. A CarGurus representative will follow up within 3–5 business days.' },
    'PLATFORM_REVIEWING', null,
    'CarGurus partner onboarding email acknowledged. Account setup is partner-assisted and typically takes 3–5 business days.'
  ),
  PORTAL_APPROVED: r(
    'cargurus-dealer', 'PORTAL_APPROVED', 200,
    { type: 'DEALER_ACCOUNT_ACTIVATED', ticketId: 'CG-2026-MOCK-00001', dealerId: 'D-MOCK-CG-4829', portalAccess: 'https://dealers.cargurus.com/dashboard', inventoryFeedStatus: 'ACTIVE', message: 'Your CarGurus dealer account and inventory feed are now active.' },
    'ACTIVE', null,
    'CarGurus dealer account activated. Inventory is live and visible to shoppers on CarGurus.'
  ),
  PORTAL_REJECTED: r(
    'cargurus-dealer', 'PORTAL_REJECTED', 200,
    { type: 'APPLICATION_DECLINED', ticketId: 'CG-2026-MOCK-00002', reason: 'Incomplete inventory feed sample', requiredDocuments: ['dealer_license_copy', 'sample_feed_file_csv_or_xml'], message: 'Your onboarding application could not be processed. Please provide the required documents and resubmit.' },
    'REJECTED',
    'Resubmit the onboarding packet with a valid dealer license copy and a sample inventory feed file (CSV or XML).',
    'CarGurus declined application due to missing documentation. Dealer must provide complete packet before re-engagement.'
  ),
  PORTAL_NEEDS_INFO: r(
    'cargurus-dealer', 'PORTAL_NEEDS_INFO', 200,
    { type: 'ADDITIONAL_INFO_REQUESTED', ticketId: 'CG-2026-MOCK-00001', fields: ['dealerLicenseDocument', 'inventoryFeedSampleUrl'], dueDate: '2026-06-17', message: 'Please provide your dealer license document and an inventory feed sample URL within 10 business days.' },
    'DEALER_ACTION_NEEDED',
    'Upload dealer license document and provide an inventory feed sample URL by 2026-06-17 to continue CarGurus onboarding.',
    'CarGurus requested additional documents. Failure to respond within the due date may result in application closure.'
  ),
  PORTAL_ERROR: r(
    'cargurus-dealer', 'PORTAL_ERROR', 500,
    { type: 'DELIVERY_FAILED', error: 'Partner portal email delivery failed', retryAfter: 'PT1H', ticketId: null },
    'SUBMITTED', null,
    'CarGurus partner email delivery failed. Submission remains queued; retry recommended after 1 hour.'
  )
};

const autotraderCox: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'autotrader-cox', 'PORTAL_ACCEPTED', 200,
    { type: 'APPLICATION_RECEIVED', caseId: 'AT-2026-MOCK-44821', from: 'dealers@autotrader.com', estimatedFollowUp: '2–3 business days', message: 'Your Autotrader dealer onboarding packet has been received. A Cox Automotive representative will contact you within 2–3 business days.' },
    'PLATFORM_REVIEWING', null,
    'Autotrader/Cox onboarding email acknowledged. Account setup requires a Cox Automotive representative and an approved feed provider.'
  ),
  PORTAL_APPROVED: r(
    'autotrader-cox', 'PORTAL_APPROVED', 200,
    { type: 'DEALER_APPROVED', caseId: 'AT-2026-MOCK-44821', dealerId: 'AT-D-MOCK-44821', feedProvider: 'HomeNet', feedStatus: 'PENDING_SETUP', message: 'Your Autotrader listing account is approved. Complete inventory feed setup with your Cox-approved provider to activate listings.' },
    'FEED_TESTING',
    'Contact your Cox Automotive inventory feed provider (HomeNet, vAuto, or VinSolutions) to complete feed setup and activate Autotrader listings.',
    'Autotrader account approved. Feed provider setup is required before inventory becomes visible to shoppers.'
  ),
  PORTAL_REJECTED: r(
    'autotrader-cox', 'PORTAL_REJECTED', 200,
    { type: 'APPLICATION_DECLINED', caseId: 'AT-2026-MOCK-44822', reason: 'No approved Cox Automotive feed provider on file', details: 'Dealer must select an approved inventory feed provider from the Cox Automotive network before listing activation.' },
    'REJECTED',
    'Select an approved Cox Automotive inventory feed provider (HomeNet, vAuto, VinSolutions) and resubmit the application.',
    'Autotrader rejected application — no approved feed provider selected. This is a common blocker for independent dealers.'
  ),
  PORTAL_NEEDS_INFO: r(
    'autotrader-cox', 'PORTAL_NEEDS_INFO', 200,
    { type: 'PROVIDER_SELECTION_REQUIRED', caseId: 'AT-2026-MOCK-44821', requiredAction: 'Select an approved inventory feed provider from the Cox Automotive network', approvedProviders: ['vAuto', 'HomeNet', 'VinSolutions', 'Dealertrack'], deadline: '2026-06-17' },
    'DEALER_ACTION_NEEDED',
    'Select a Cox Automotive approved feed provider (vAuto, HomeNet, VinSolutions, or Dealertrack) and inform your representative by 2026-06-17.',
    'Autotrader application on hold pending provider selection. Dealer must commit to a feed provider before Cox can activate the account.'
  ),
  FEED_LIVE: r(
    'autotrader-cox', 'FEED_LIVE', 200,
    { type: 'FEED_ACTIVATED', caseId: 'AT-2026-MOCK-44821', dealerId: 'AT-D-MOCK-44821', feedProvider: 'HomeNet', feedStatus: 'ACTIVE', listingsLive: 37, message: 'Your inventory feed is active on Autotrader. Listings are visible to shoppers.' },
    'ACTIVE', null,
    'Autotrader inventory feed active via Cox-approved provider. Vehicle listings are live and visible to shoppers on Autotrader.'
  ),
  PORTAL_ERROR: r(
    'autotrader-cox', 'PORTAL_ERROR', 500,
    { type: 'SUBMISSION_FAILED', error: 'Autotrader partner portal temporarily unavailable', retryAfter: 'PT2H' },
    'SUBMITTED', null,
    'Autotrader partner portal unreachable. Submission queued; retry recommended after 2 hours.'
  )
};

const carsCom: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'cars-com', 'PORTAL_ACCEPTED', 200,
    { type: 'ONBOARDING_INITIATED', referenceId: 'CC-MOCK-29847', from: 'dealer-support@cars.com', estimatedActivation: '5–7 business days', message: 'Your Cars.com dealer onboarding request has been received. A Cars Commerce specialist will contact you within 5–7 business days.' },
    'PLATFORM_REVIEWING', null,
    'Cars.com onboarding packet received. Activation is partner-assisted and typically requires a dealer contract review.'
  ),
  PORTAL_APPROVED: r(
    'cars-com', 'PORTAL_APPROVED', 200,
    { type: 'LISTING_ACTIVATED', referenceId: 'CC-MOCK-29847', dealerPageUrl: 'https://www.cars.com/dealers/mock-dealer-29847/', feedStatus: 'ACTIVE', contractStatus: 'SIGNED', message: 'Your Cars.com dealer listing page and inventory feed are now active.' },
    'ACTIVE', null,
    'Cars.com dealer listing is live. Inventory is visible to shoppers and the feed syncs on the agreed schedule.'
  ),
  PORTAL_REJECTED: r(
    'cars-com', 'PORTAL_REJECTED', 200,
    { type: 'APPLICATION_DECLINED', referenceId: 'CC-MOCK-29848', reason: 'Vehicle listing policy violation — prices below market minimum', violations: ['price_below_market_minimum'], policyUrl: 'https://www.carscommerce.inc/marketplace/vehicle-listing-policy/' },
    'REJECTED',
    'Review the Cars Commerce vehicle listing policy and correct pricing to meet market minimums before reapplying.',
    'Cars.com declined application due to listing policy violation. Dealer must correct vehicle pricing before re-engagement.'
  ),
  PORTAL_NEEDS_INFO: r(
    'cars-com', 'PORTAL_NEEDS_INFO', 200,
    { type: 'DOCUMENTATION_REQUIRED', referenceId: 'CC-MOCK-29847', requiredDocuments: ['state_dealer_license', 'business_tax_id_w9'], deadline: '2026-06-17', message: 'Please provide the required business documents within 10 business days to proceed with your Cars.com onboarding.' },
    'DEALER_ACTION_NEEDED',
    'Submit state dealer license and W-9 to dealer-support@cars.com by 2026-06-17 to proceed with Cars.com onboarding.',
    'Cars.com onboarding on hold pending business documentation. Standard KYC requirement for new dealer contracts.'
  ),
  PORTAL_ERROR: r(
    'cars-com', 'PORTAL_ERROR', 503,
    { type: 'PORTAL_UNAVAILABLE', error: 'Cars Commerce partner portal is currently undergoing scheduled maintenance', retryAfter: 'PT4H' },
    'SUBMITTED', null,
    'Cars Commerce portal in maintenance window. Submission queued; retry recommended after 4 hours.'
  )
};

const truecarDealerNetwork: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'truecar-dealer-network', 'PORTAL_ACCEPTED', 200,
    { type: 'APPLICATION_RECEIVED', dealerId: 'TC-MOCK-38291', from: 'dealer-support@truecar.com', estimatedReview: '5–7 business days', message: 'Your TrueCar Dealer Network application has been received. Our team will review your application and contact you within 5–7 business days.' },
    'PLATFORM_REVIEWING', null,
    'TrueCar application acknowledged. Market area availability and AIS requirements review typically takes 5–7 business days.'
  ),
  PORTAL_APPROVED: r(
    'truecar-dealer-network', 'PORTAL_APPROVED', 200,
    { type: 'DEALER_PORTAL_ACCESS_GRANTED', dealerId: 'TC-MOCK-38291', portalUrl: 'https://dealerportal.truecar.com/', inventoryProviderSetup: 'REQUIRED', message: 'Welcome to TrueCar Dealer Network. Please complete your inventory provider setup in the dealer portal to activate listings.' },
    'ACTIVE', null,
    'TrueCar dealer portal access granted. Dealer must configure their inventory provider in the portal to activate vehicle listings.'
  ),
  PORTAL_REJECTED: r(
    'truecar-dealer-network', 'PORTAL_REJECTED', 200,
    { type: 'APPLICATION_DECLINED', dealerId: 'TC-MOCK-38292', reason: 'Market area dealer capacity reached for this vehicle segment', appealInfo: 'https://dealerportal.truecar.com/dealer/faqs', message: 'We are unable to onboard additional dealers in your market area at this time.' },
    'REJECTED',
    'TrueCar market area is at capacity. Monitor dealerportal.truecar.com/dealer/faqs for availability updates or explore adjacent markets.',
    'TrueCar rejected due to market saturation. This is expected behavior for high-density metro markets and is not a data quality issue.'
  ),
  PORTAL_NEEDS_INFO: r(
    'truecar-dealer-network', 'PORTAL_NEEDS_INFO', 200,
    { type: 'AIS_VERIFICATION_REQUIRED', dealerId: 'TC-MOCK-38291', requiredAction: 'Complete TrueCar AIS requirements verification', referenceUrl: 'https://www.truecar.com/legal/aisrequirements0D.html', deadline: '2026-06-17' },
    'DEALER_ACTION_NEEDED',
    'Review and complete TrueCar AIS compliance requirements at truecar.com/legal/aisrequirements0D.html by 2026-06-17.',
    'TrueCar application held pending AIS (Automotive Industry Standards) compliance verification. Required for all new dealer network participants.'
  ),
  PORTAL_ERROR: r(
    'truecar-dealer-network', 'PORTAL_ERROR', 503,
    { type: 'DEALER_PORTAL_UNAVAILABLE', error: 'TrueCar dealer portal is temporarily unavailable', retryAfter: 'PT1H' },
    'SUBMITTED', null,
    'TrueCar dealer portal unavailable. Submission queued; retry recommended after 1 hour.'
  )
};

const adfXmlLeadRouting: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'adf-xml-lead-routing', 'PORTAL_ACCEPTED', 200,
    { type: 'LEAD_ROUTING_CONFIGURED', endpointId: 'ADF-MOCK-CRM-001', crmEndpoint: 'crm@lonestar-budget-auto.example.com', format: 'ADF/XML 1.0', testLeadDelivered: true, deliveredAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'ADF/XML lead routing configured and test lead delivered successfully. CRM endpoint is accepting leads.'
  ),
  PORTAL_REJECTED: r(
    'adf-xml-lead-routing', 'PORTAL_REJECTED', 400,
    { type: 'CONFIGURATION_FAILED', endpointId: 'ADF-MOCK-CRM-001', error: 'CRM endpoint does not accept ADF/XML format', supportedFormats: ['JSON', 'CSV'], testLeadDelivered: false },
    'REJECTED',
    'Configure your CRM to accept ADF/XML 1.0 format, or use a CRM integration middleware that handles ADF conversion.',
    'CRM endpoint rejected ADF/XML payload format. Dealer must update CRM settings or use an ADF-compatible CRM vendor.'
  ),
  PORTAL_NEEDS_INFO: r(
    'adf-xml-lead-routing', 'PORTAL_NEEDS_INFO', 200,
    { type: 'ENDPOINT_VERIFICATION_REQUIRED', requiredAction: 'Provide a valid CRM endpoint that accepts ADF/XML 1.0 lead payloads', testValidator: 'http://validator.adfxml.info/', currentEndpoint: null },
    'DEALER_ACTION_NEEDED',
    'Provide a confirmed CRM endpoint URL that accepts ADF/XML 1.0 leads. Use the ADF validator at validator.adfxml.info to test compatibility.',
    'ADF/XML lead routing held — no verified CRM endpoint provided. Dealer must supply and validate their CRM delivery endpoint.'
  ),
  PORTAL_ERROR: r(
    'adf-xml-lead-routing', 'PORTAL_ERROR', 500,
    { type: 'DELIVERY_FAILED', endpointId: 'ADF-MOCK-CRM-001', error: 'CRM endpoint unreachable — connection timed out', failedAt: '2026-06-03T12:00:00.000Z', retryAfter: 'PT30M' },
    'SUBMITTED', null,
    'ADF/XML delivery failed — CRM endpoint timed out. Submission queued; retry after 30 minutes.'
  )
};

const microsoftAutomotiveAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'microsoft-automotive-ads', 'PORTAL_ACCEPTED', 200,
    { RequestStatus: 'InProgress', FeedId: 'MOCK-MSFT-FEED-001', FeedName: 'Lone Star Budget Auto — Auto Inventory Feed', UploadStatus: 'PendingReview' },
    'PLATFORM_REVIEWING', null,
    'Microsoft Advertising auto inventory feed submitted via Bulk API. Review and crawl typically complete within 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'microsoft-automotive-ads', 'PORTAL_APPROVED', 200,
    { RequestStatus: 'Completed', FeedId: 'MOCK-MSFT-FEED-001', FeedStatus: 'Active', ApprovedItems: 37, RejectedItems: 0 },
    'FEED_TESTING', null,
    'Microsoft Automotive Ads feed approved. Automotive Ads campaigns can now be created in Microsoft Advertising.'
  ),
  FEED_LIVE: r(
    'microsoft-automotive-ads', 'FEED_LIVE', 200,
    { FeedId: 'MOCK-MSFT-FEED-001', FeedStatus: 'Active', ActiveAds: 37, Impressions: 0, ActivatedAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'Microsoft Automotive Ads feed is live. Vehicle ads are eligible to serve across Bing and Microsoft partner network.'
  ),
  PORTAL_REJECTED: r(
    'microsoft-automotive-ads', 'PORTAL_REJECTED', 422,
    { RequestStatus: 'Failed', FeedId: 'MOCK-MSFT-FEED-001', Errors: [{ Code: 'InvalidFeedAttribute', Message: 'Required attribute VIN is missing or invalid for 2 items', AffectedItems: 2 }] },
    'REJECTED',
    'Correct the invalid feed attributes in Microsoft Advertising Bulk API and resubmit the auto inventory feed.',
    'Microsoft auto inventory feed rejected due to invalid VIN attributes. Common in bulk uploads with malformed VINs.'
  ),
  PORTAL_NEEDS_INFO: r(
    'microsoft-automotive-ads', 'PORTAL_NEEDS_INFO', 200,
    { RequestStatus: 'PendingCustomerAction', FeedId: 'MOCK-MSFT-FEED-001', Warnings: ['FeedUrlUnreachable'], Message: 'The auto inventory feed URL returned a non-200 response. Verify the feed URL is publicly accessible.' },
    'DEALER_ACTION_NEEDED',
    'Verify the auto inventory feed URL is publicly accessible and returns valid XML or CSV. Update the feed URL in Microsoft Advertising.',
    'Microsoft Advertising cannot crawl the feed URL. Dealer must ensure feed is publicly hosted before re-triggering crawl.'
  ),
  PORTAL_ERROR: r(
    'microsoft-automotive-ads', 'PORTAL_ERROR', 503,
    { RequestStatus: 'Failed', Error: { Code: 'InternalError', Message: 'Microsoft Advertising Bulk API is temporarily unavailable' } },
    'SUBMITTED', null,
    'Transient Microsoft Advertising Bulk API error. Submission queued; retry after brief backoff.'
  )
};

const pinterestShoppingAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'pinterest-shopping-ads', 'PORTAL_ACCEPTED', 201,
    { id: 'mock-catalog-pinterest-001', name: 'Lone Star Budget Auto — Vehicle Catalog', created_at: '2026-06-03T12:00:00.000Z', status: 'PENDING' },
    'PLATFORM_REVIEWING', null,
    'Pinterest product catalog created. Domain verification and catalog review typically take 1–3 business days.'
  ),
  PORTAL_APPROVED: r(
    'pinterest-shopping-ads', 'PORTAL_APPROVED', 200,
    { id: 'mock-catalog-pinterest-001', status: 'ACTIVE', product_count: 37, feed_id: 'mock-feed-pinterest-001' },
    'FEED_TESTING', null,
    'Pinterest catalog approved. Shopping Ads campaigns can now be created in Pinterest Ads Manager.'
  ),
  FEED_LIVE: r(
    'pinterest-shopping-ads', 'FEED_LIVE', 200,
    { id: 'mock-feed-pinterest-001', status: 'ACTIVE', product_count: 37, last_processed: '2026-06-03T12:00:00.000Z', active_product_groups: 1 },
    'ACTIVE', null,
    'Pinterest catalog feed is live. Vehicle listings are eligible to appear in Shopping Ads and organic Pinterest search.'
  ),
  PORTAL_REJECTED: r(
    'pinterest-shopping-ads', 'PORTAL_REJECTED', 400,
    { code: 'CATALOG_REJECTED', message: 'Catalog feed failed policy review', details: [{ attribute: 'availability', issue: 'Invalid availability value — must be in_stock, out_of_stock, or preorder' }] },
    'REJECTED',
    'Correct the product availability attribute in your Pinterest catalog feed to use Pinterest\'s accepted values: in_stock, out_of_stock, or preorder.',
    'Pinterest catalog rejected for invalid availability attribute. Automotive catalogs must map condition to Pinterest availability values.'
  ),
  PORTAL_NEEDS_INFO: r(
    'pinterest-shopping-ads', 'PORTAL_NEEDS_INFO', 200,
    { code: 'DOMAIN_VERIFICATION_REQUIRED', message: 'Business account domain verification is required before catalog approval', domain_claim_url: 'https://ads.pinterest.com/business/domain-claim/', catalog_id: 'mock-catalog-pinterest-001' },
    'DEALER_ACTION_NEEDED',
    'Complete Pinterest domain verification for your dealership website at ads.pinterest.com/business/domain-claim/ before the catalog can be approved.',
    'Pinterest catalog held pending domain verification. Dealer website must be claimed in Pinterest Business before catalog review.'
  ),
  PORTAL_ERROR: r(
    'pinterest-shopping-ads', 'PORTAL_ERROR', 500,
    { code: 'INTERNAL_ERROR', message: 'Pinterest API is temporarily unavailable', request_id: 'mock-pin-req-001' },
    'SUBMITTED', null,
    'Transient Pinterest API error. Submission queued; retry after brief backoff.'
  )
};

const redditDynamicProductAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'reddit-dynamic-product-ads', 'PORTAL_ACCEPTED', 201,
    { data: { id: 'mock-catalog-reddit-001', name: 'Lone Star Budget Auto — Vehicle Catalog', status: 'PENDING_REVIEW', created_at: '2026-06-03T12:00:00.000Z' } },
    'PLATFORM_REVIEWING', null,
    'Reddit product catalog submitted via Ads API. Review and pixel setup verification typically take 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'reddit-dynamic-product-ads', 'PORTAL_APPROVED', 200,
    { data: { id: 'mock-catalog-reddit-001', status: 'ACTIVE', product_count: 37, feed_id: 'mock-feed-reddit-001' } },
    'FEED_TESTING', null,
    'Reddit catalog approved. Dynamic Product Ads campaigns can now be created in Reddit Ads Manager.'
  ),
  FEED_LIVE: r(
    'reddit-dynamic-product-ads', 'FEED_LIVE', 200,
    { data: { id: 'mock-feed-reddit-001', status: 'ACTIVE', product_count: 37, last_sync: '2026-06-03T12:00:00.000Z', pixel_matched: true } },
    'ACTIVE', null,
    'Reddit DPA catalog feed is live with Pixel matching confirmed. Vehicle ads are eligible to serve across Reddit.'
  ),
  PORTAL_REJECTED: r(
    'reddit-dynamic-product-ads', 'PORTAL_REJECTED', 400,
    { error: { type: 'POLICY_VIOLATION', message: 'Catalog rejected: vehicle listings must include valid pricing in supported currency', affected_products: 3 } },
    'REJECTED',
    'Correct vehicle pricing in the Reddit catalog feed — prices must be in a supported currency format (e.g., 25000.00 USD).',
    'Reddit catalog rejected for invalid pricing format. Ensure priceCents converts cleanly to the required decimal currency format.'
  ),
  PORTAL_NEEDS_INFO: r(
    'reddit-dynamic-product-ads', 'PORTAL_NEEDS_INFO', 200,
    { error: { type: 'PIXEL_NOT_FOUND', message: 'Reddit Pixel not detected on the dealership website. Pixel events are required for Dynamic Product Ads relevance.', pixel_setup_url: 'https://ads.reddit.com/register/pixel' } },
    'DEALER_ACTION_NEEDED',
    'Install the Reddit Pixel on the dealership website and verify product ID events fire before DPA campaigns can serve.',
    'Reddit DPA requires Pixel or Conversions API product events to match catalog IDs. Dealer must complete pixel setup before ads are eligible.'
  ),
  PORTAL_ERROR: r(
    'reddit-dynamic-product-ads', 'PORTAL_ERROR', 503,
    { error: { type: 'SERVICE_UNAVAILABLE', message: 'Reddit Ads API is temporarily unavailable', retry_after: 3600 } },
    'SUBMITTED', null,
    'Transient Reddit Ads API outage. Submission queued; retry recommended after 1 hour.'
  )
};

const ebayMotors: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'ebay-motors', 'PORTAL_ACCEPTED', 201,
    { inventoryItemGroupKey: 'MOCK-EBAY-SKU-001', locale: 'en_US', listingStatus: 'PENDING_REVIEW', offerId: 'mock-offer-ebay-001', marketplaceId: 'EBAY_US' },
    'PLATFORM_REVIEWING', null,
    'eBay Motors listing submitted via Sell Inventory API. Motors-specific category requirements verified; listing under eBay review.'
  ),
  PORTAL_APPROVED: r(
    'ebay-motors', 'PORTAL_APPROVED', 200,
    { offerId: 'mock-offer-ebay-001', listingId: 'mock-listing-ebay-001', listingStatus: 'ACTIVE', viewItemURL: 'https://www.ebay.com/itm/mock-listing-ebay-001', publishedAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'eBay Motors listing is live. Vehicle is visible to buyers on eBay Motors and eligible for search placement.'
  ),
  PORTAL_REJECTED: r(
    'ebay-motors', 'PORTAL_REJECTED', 400,
    { errors: [{ errorId: 25002, domain: 'API_SELL_INVENTORY', category: 'REQUEST', message: 'The item condition is not valid for this category', parameters: [{ name: 'fieldName', value: 'condition' }] }] },
    'REJECTED',
    'Correct the vehicle condition field to match eBay Motors accepted values: Used, Certified Pre-Owned, For parts or not working.',
    'eBay listing rejected — invalid condition value for Motors category. eBay Motors uses category-specific condition values different from standard eBay.'
  ),
  PORTAL_NEEDS_INFO: r(
    'ebay-motors', 'PORTAL_NEEDS_INFO', 400,
    { errors: [{ errorId: 21916635, domain: 'API_SELL_INVENTORY', category: 'REQUEST', message: 'VIN is required for Motor Vehicle listings in this category', parameters: [{ name: 'fieldName', value: 'aspects.VIN' }] }] },
    'DEALER_ACTION_NEEDED',
    'Provide a valid VIN in the vehicle aspects for this eBay Motors listing. VIN is a required attribute for vehicle listings.',
    'eBay listing rejected — VIN is a required aspect for Motors vehicle category listings. Dealer must supply valid VIN in listing aspects.'
  ),
  PORTAL_ERROR: r(
    'ebay-motors', 'PORTAL_ERROR', 500,
    { errors: [{ errorId: 1001, domain: 'API_SELL_INVENTORY', category: 'APPLICATION', message: 'Internal application error. Please retry the request.' }] },
    'SUBMITTED', null,
    'Transient eBay Sell Inventory API error. Submission queued; retry after brief backoff.'
  )
};

const xDynamicProductAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'x-dynamic-product-ads', 'PORTAL_ACCEPTED', 201,
    { data: { id: 'mock-catalog-x-001', name: 'Lone Star Budget Auto — X Product Catalog', status: 'PENDING', created_at: '2026-06-03T12:00:00.000Z' }, request_id: 'mock-x-req-001' },
    'PLATFORM_REVIEWING', null,
    'X (Twitter) product catalog submitted to Shopping Manager. Feed crawl and review typically complete within 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'x-dynamic-product-ads', 'PORTAL_APPROVED', 200,
    { data: { id: 'mock-catalog-x-001', status: 'ACTIVE', product_count: 37, feed_id: 'mock-feed-x-001' } },
    'FEED_TESTING', null,
    'X catalog approved. Dynamic Product Ads campaigns can now be created in X Ads Manager.'
  ),
  FEED_LIVE: r(
    'x-dynamic-product-ads', 'FEED_LIVE', 200,
    { data: { id: 'mock-feed-x-001', status: 'ACTIVE', product_count: 37, last_sync: '2026-06-03T12:00:00.000Z' } },
    'ACTIVE', null,
    'X DPA catalog feed is live. Vehicle ads are eligible to serve across X placements.'
  ),
  PORTAL_REJECTED: r(
    'x-dynamic-product-ads', 'PORTAL_REJECTED', 400,
    { errors: [{ code: 'CATALOG_POLICY_VIOLATION', message: 'Product catalog contains items that violate X advertising policies', affected_count: 2, policy_url: 'https://business.x.com/en/help/ads-policies/prohibited-content-policies' }] },
    'REJECTED',
    'Review X advertising policies and correct any policy-violating vehicle listings before resubmitting the catalog.',
    'X catalog rejected for policy violation. Review pricing, availability, and content attributes against X Shopping catalog policies.'
  ),
  PORTAL_NEEDS_INFO: r(
    'x-dynamic-product-ads', 'PORTAL_NEEDS_INFO', 200,
    { errors: [{ code: 'PIXEL_VERIFICATION_REQUIRED', message: 'X Pixel must be installed and verified on the dealership website before Dynamic Product Ads can serve', pixel_setup_url: 'https://ads.x.com/onboarding/pixel' }] },
    'DEALER_ACTION_NEEDED',
    'Install the X Pixel on the dealership website and complete pixel verification in X Ads Manager before DPA campaigns are eligible.',
    'X DPA requires Pixel or Conversions API product events. Dealer must complete pixel setup before catalog can be used for ad serving.'
  ),
  PORTAL_ERROR: r(
    'x-dynamic-product-ads', 'PORTAL_ERROR', 503,
    { errors: [{ code: 'SERVICE_UNAVAILABLE', message: 'X Ads API is temporarily unavailable', retry_after: 7200 }] },
    'SUBMITTED', null,
    'Transient X Ads API outage. Submission queued; retry recommended after 2 hours.'
  )
};

const snapchatDynamicProductAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'snapchat-dynamic-product-ads', 'PORTAL_ACCEPTED', 201,
    { request_status: 'SUCCESS', catalog: { id: 'mock-catalog-snap-001', name: 'Lone Star Budget Auto — Snap Catalog', status: 'PENDING_REVIEW', created_at: '2026-06-03T12:00:00.000Z' } },
    'PLATFORM_REVIEWING', null,
    'Snapchat product catalog submitted via Marketing API. Catalog review and pixel setup verification typically take 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'snapchat-dynamic-product-ads', 'PORTAL_APPROVED', 200,
    { request_status: 'SUCCESS', catalog: { id: 'mock-catalog-snap-001', status: 'ACTIVE', product_count: 37 } },
    'FEED_TESTING', null,
    'Snapchat catalog approved. Dynamic Product Ads campaigns can now be set up in Snapchat Ads Manager.'
  ),
  FEED_LIVE: r(
    'snapchat-dynamic-product-ads', 'FEED_LIVE', 200,
    { request_status: 'SUCCESS', product_feed: { id: 'mock-feed-snap-001', status: 'ACTIVE', product_count: 37, last_sync: '2026-06-03T12:00:00.000Z' } },
    'ACTIVE', null,
    'Snapchat DPA catalog feed is live. Vehicle ads are eligible to serve to Snapchat audiences.'
  ),
  PORTAL_REJECTED: r(
    'snapchat-dynamic-product-ads', 'PORTAL_REJECTED', 400,
    { request_status: 'FAILED', reason: 'CATALOG_POLICY_VIOLATION', detail: 'Product images do not meet Snapchat minimum resolution requirements (minimum 160x160px required)', affected_products: 5 },
    'REJECTED',
    'Update vehicle images to meet Snapchat\'s minimum 160×160px resolution requirement and resubmit the catalog.',
    'Snapchat catalog rejected for image resolution violations. Ensure all vehicle images meet the minimum resolution before resubmission.'
  ),
  PORTAL_NEEDS_INFO: r(
    'snapchat-dynamic-product-ads', 'PORTAL_NEEDS_INFO', 200,
    { request_status: 'PENDING_ACTION', reason: 'SNAP_PIXEL_NOT_VERIFIED', detail: 'Snap Pixel must be installed and events verified on the dealership website before Dynamic Product Ads can serve', pixel_url: 'https://ads.snapchat.com/pixel' },
    'DEALER_ACTION_NEEDED',
    'Install the Snap Pixel on the dealership website and verify product events fire before the DPA catalog can be used for ad targeting.',
    'Snapchat DPA requires verified Pixel product events. Dealer must complete Snap Pixel setup before catalog is eligible for ad serving.'
  ),
  PORTAL_ERROR: r(
    'snapchat-dynamic-product-ads', 'PORTAL_ERROR', 500,
    { request_status: 'FAILED', reason: 'INTERNAL_ERROR', detail: 'Snapchat Marketing API is temporarily unavailable' },
    'SUBMITTED', null,
    'Transient Snapchat Marketing API error. Submission queued; retry after brief backoff.'
  )
};

const linkedinLeadGenForms: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'linkedin-lead-gen-forms', 'PORTAL_ACCEPTED', 201,
    { id: 'mock-lgf-001', name: 'Lone Star Budget Auto — Lead Gen Form', status: 'PENDING_REVIEW', created_at: '2026-06-03T12:00:00.000Z', campaign_id: 'mock-campaign-linkedin-001' },
    'PLATFORM_REVIEWING', null,
    'LinkedIn Lead Gen Form submitted. Ad creative and form review typically complete within 1–2 business days.'
  ),
  PORTAL_APPROVED: r(
    'linkedin-lead-gen-forms', 'PORTAL_APPROVED', 200,
    { id: 'mock-lgf-001', status: 'ACTIVE', lead_sync_enabled: true, leads_received: 0, campaign_status: 'ACTIVE' },
    'ACTIVE', null,
    'LinkedIn Lead Gen Form approved and active. Lead Sync API can now be used to retrieve submitted leads.'
  ),
  PORTAL_REJECTED: r(
    'linkedin-lead-gen-forms', 'PORTAL_REJECTED', 400,
    { serviceErrorCode: 100, message: 'Lead Gen Form rejected: form fields contain prohibited data collection (SSN, financial account numbers)', documentation_url: 'https://www.linkedin.com/help/lms/answer/a1341257' },
    'REJECTED',
    'Remove prohibited data collection fields (SSN, financial account numbers) and resubmit the Lead Gen Form per LinkedIn ad policies.',
    'LinkedIn Lead Gen Form rejected for policy-prohibited field types. Ensure form only collects contact and vehicle interest data.'
  ),
  PORTAL_NEEDS_INFO: r(
    'linkedin-lead-gen-forms', 'PORTAL_NEEDS_INFO', 200,
    { serviceErrorCode: 403, message: 'LinkedIn Lead Sync API access requires separate approval. Submit an API access request to enable lead retrieval.', access_request_url: 'https://business.linkedin.com/content/dam/me/business/en-us/marketing-solutions/cx/2022/pdf/linkedin-lead-sync-api-access-guide.pdf' },
    'DEALER_ACTION_NEEDED',
    'Apply for LinkedIn Lead Sync API access via the API access request process before leads can be retrieved programmatically.',
    'LinkedIn Lead Sync API access is gated behind a separate approval process. The form can run ads, but programmatic lead retrieval requires API approval.'
  ),
  PORTAL_ERROR: r(
    'linkedin-lead-gen-forms', 'PORTAL_ERROR', 500,
    { serviceErrorCode: 500, message: 'LinkedIn Marketing API is temporarily unavailable. Please retry your request.' },
    'SUBMITTED', null,
    'Transient LinkedIn Marketing API error. Submission queued; retry after brief backoff.'
  )
};

const nextdoorAds: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'nextdoor-ads', 'PORTAL_ACCEPTED', 201,
    { id: 'mock-campaign-nd-001', name: 'Lone Star Budget Auto — Local Inventory Campaign', status: 'PENDING_REVIEW', created_at: '2026-06-03T12:00:00.000Z', service_area: { city: 'Austin', state: 'TX', radius_miles: 15 } },
    'PLATFORM_REVIEWING', null,
    'Nextdoor local ad campaign submitted. Creative and targeting review typically completes within 1 business day.'
  ),
  PORTAL_APPROVED: r(
    'nextdoor-ads', 'PORTAL_APPROVED', 200,
    { id: 'mock-campaign-nd-001', status: 'ACTIVE', impressions: 0, reach: 0, service_area_households: 42000, activated_at: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'Nextdoor local ad campaign is live. Dealer ads are serving to verified neighbors within the configured service area radius.'
  ),
  PORTAL_REJECTED: r(
    'nextdoor-ads', 'PORTAL_REJECTED', 400,
    { error: { code: 'AD_POLICY_VIOLATION', message: 'Ad creative violates Nextdoor advertising guidelines — dealership address must match verified Nextdoor business location', policy_url: 'https://business.nextdoor.com/en-us/enterprise/creative-specs' } },
    'REJECTED',
    'Verify the dealership rooftop address matches the registered Nextdoor business location before resubmitting the campaign.',
    'Nextdoor rejected ad — dealership address doesn\'t match verified business location. Nextdoor requires local-business address verification.'
  ),
  PORTAL_NEEDS_INFO: r(
    'nextdoor-ads', 'PORTAL_NEEDS_INFO', 200,
    { error: { code: 'BUSINESS_VERIFICATION_REQUIRED', message: 'Nextdoor business account must be verified before Ads API campaigns can run', verification_url: 'https://ads.nextdoor.com/v2' } },
    'DEALER_ACTION_NEEDED',
    'Complete Nextdoor business account verification at ads.nextdoor.com before the ad campaign can go live.',
    'Nextdoor Ads API requires a verified business account. Dealer must claim and verify their business location in Nextdoor before API campaigns are eligible.'
  ),
  PORTAL_ERROR: r(
    'nextdoor-ads', 'PORTAL_ERROR', 503,
    { error: { code: 'SERVICE_UNAVAILABLE', message: 'Nextdoor Ads API is temporarily unavailable', retry_after: 1800 } },
    'SUBMITTED', null,
    'Transient Nextdoor Ads API outage. Submission queued; retry recommended after 30 minutes.'
  )
};

const appleBusinessConnect: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'apple-business-connect', 'PORTAL_ACCEPTED', 202,
    { requestId: 'mock-abc-req-001', businessId: 'mock-abc-biz-001', locationId: 'mock-abc-loc-001', status: 'PENDING_REVIEW', submittedAt: '2026-06-03T12:00:00.000Z' },
    'PLATFORM_REVIEWING', null,
    'Apple Business Connect location data submitted for review. Apple Maps verification typically takes 3–5 business days.'
  ),
  PORTAL_APPROVED: r(
    'apple-business-connect', 'PORTAL_APPROVED', 200,
    { requestId: 'mock-abc-req-001', businessId: 'mock-abc-biz-001', locationId: 'mock-abc-loc-001', status: 'PUBLISHED', mapsUrl: 'https://maps.apple.com/?address=1400+Mockingbird+Ln,+Austin,+TX', publishedAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'Apple Business Connect location is published to Apple Maps. Dealership appears in Siri, Maps, and Spotlight searches.'
  ),
  PORTAL_REJECTED: r(
    'apple-business-connect', 'PORTAL_REJECTED', 400,
    { requestId: 'mock-abc-req-001', status: 'REJECTED', reason: 'DUPLICATE_LOCATION', message: 'A business listing for this address already exists on Apple Maps. Claim the existing listing rather than creating a new one.', claimUrl: 'https://businessconnect.apple.com/' },
    'REJECTED',
    'Claim the existing Apple Maps business listing at businessconnect.apple.com instead of creating a duplicate location.',
    'Apple Business Connect rejected — duplicate location. Dealer must claim the existing listing and update it rather than creating a new one.'
  ),
  PORTAL_NEEDS_INFO: r(
    'apple-business-connect', 'PORTAL_NEEDS_INFO', 200,
    { requestId: 'mock-abc-req-001', status: 'PENDING_VERIFICATION', reason: 'LOCATION_VERIFICATION_REQUIRED', message: 'Physical location verification is required. Apple will send a verification code to the dealership phone number on file.', verificationMethod: 'PHONE_CALL' },
    'DEALER_ACTION_NEEDED',
    'Answer the Apple verification phone call to the dealership main number to confirm the physical location and complete Apple Maps publishing.',
    'Apple Business Connect requires phone-call verification of the physical dealership location. Dealer must be available to receive the call.'
  ),
  PORTAL_ERROR: r(
    'apple-business-connect', 'PORTAL_ERROR', 503,
    { requestId: 'mock-abc-req-001', status: 'FAILED', error: 'Apple Business Connect API is temporarily unavailable', retryAfter: 'PT2H' },
    'SUBMITTED', null,
    'Transient Apple Business Connect API error. Submission queued; retry recommended after 2 hours.'
  )
};

const dealerStorefront: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'dealer-storefront', 'PORTAL_ACCEPTED', 201,
    { type: 'STOREFRONT_PROVISIONED', storefrontId: 'SF-MOCK-001', dealerSlug: 'lone-star-budget-auto', inventoryCount: 37, listingsLive: true, leadCaptureEnabled: true, activatedAt: '2026-06-03T12:00:00.000Z' },
    'ACTIVE', null,
    'Owned storefront provisioned instantly. Inventory is live, lead capture is active, and no partner review is required.'
  ),
  PORTAL_REJECTED: r(
    'dealer-storefront', 'PORTAL_REJECTED', 400,
    { type: 'PROVISIONING_FAILED', reason: 'DUPLICATE_DEALER_SLUG', message: 'A storefront with this dealer slug already exists. Contact support to claim or merge.' },
    'REJECTED',
    'Contact support to claim or merge the existing storefront for this dealer.',
    'Owned storefront provisioning failed — duplicate dealer slug. Rare but possible if the dealer was previously onboarded.'
  ),
  PORTAL_NEEDS_INFO: r(
    'dealer-storefront', 'PORTAL_NEEDS_INFO', 200,
    { type: 'PROFILE_INCOMPLETE', missingFields: ['websiteUrl', 'primaryContact.phone'], message: 'Dealer profile is missing required fields for storefront provisioning.' },
    'DEALER_ACTION_NEEDED',
    'Complete the dealer profile: add a valid HTTPS website URL and primary contact phone number.',
    'Owned storefront provisioning held — dealer profile missing required fields. Most common for new onboardings.'
  ),
  PORTAL_ERROR: r(
    'dealer-storefront', 'PORTAL_ERROR', 500,
    { type: 'PROVISIONING_ERROR', error: 'Internal provisioning service error', retryAfter: 'PT5M' },
    'SUBMITTED', null,
    'Transient owned-channel provisioning error. Retry after 5 minutes.'
  )
};

const consumerMarketplace: PlatformResponses = {
  PORTAL_ACCEPTED: r(
    'consumer-marketplace', 'PORTAL_ACCEPTED', 201,
    { type: 'MARKETPLACE_INDEX_REFRESHED', dealerId: 'dealer-mock-001', eligibleListings: 37, indexLive: true, leadCaptureEnabled: true, activatedAt: '2026-06-06T12:00:00.000Z' },
    'ACTIVE', null,
    'First-party marketplace index refreshed instantly. Eligible listings are public-safe; no partner review required.'
  ),
  PORTAL_REJECTED: r(
    'consumer-marketplace', 'PORTAL_REJECTED', 400,
    { type: 'INDEX_REFRESH_FAILED', reason: 'NO_ELIGIBLE_LISTINGS', message: 'No vehicles met marketplace eligibility (priceCents > 0, active lifecycle).' },
    'REJECTED',
    'Ensure at least one vehicle has a price and is active before refreshing the marketplace index.',
    'Marketplace index refresh rejected — no eligible inventory to publish.'
  ),
  PORTAL_NEEDS_INFO: r(
    'consumer-marketplace', 'PORTAL_NEEDS_INFO', 200,
    { type: 'PROFILE_INCOMPLETE', missingFields: ['primaryContact.email', 'rooftopAddress.city'], message: 'Dealer profile is missing required fields for marketplace listing context.' },
    'DEALER_ACTION_NEEDED',
    'Complete the dealer profile: add primary contact email and rooftop city/state.',
    'Marketplace index refresh held — dealer profile missing required public context fields.'
  ),
  PORTAL_ERROR: r(
    'consumer-marketplace', 'PORTAL_ERROR', 500,
    { type: 'INDEX_REFRESH_ERROR', error: 'Internal marketplace index service error', retryAfter: 'PT5M' },
    'SUBMITTED', null,
    'Transient marketplace index error. Retry after 5 minutes.'
  )
};

function assistedMarketplaceStub(slug: string, label: string): PlatformResponses {
  return {
    PORTAL_ACCEPTED: r(
      slug, 'PORTAL_ACCEPTED', 200,
      { type: 'EMAIL_ACKNOWLEDGED', ticketId: `${slug.toUpperCase()}-MOCK-00001`, message: `${label} onboarding packet received.` },
      'PLATFORM_REVIEWING', null,
      `${label} partner onboarding acknowledged. Account setup is partner-assisted.`,
    ),
    PORTAL_REJECTED: r(
      slug, 'PORTAL_REJECTED', 200,
      { type: 'APPLICATION_DECLINED', reason: 'Incomplete listing packet', message: `${label} declined the onboarding packet.` },
      'REJECTED',
      `Resubmit a complete inventory packet for ${label}.`,
      `${label} declined application due to missing documentation.`,
    ),
    PORTAL_NEEDS_INFO: r(
      slug, 'PORTAL_NEEDS_INFO', 200,
      { type: 'ADDITIONAL_INFO_REQUESTED', fields: ['dealerLicenseDocument', 'inventoryFeedSampleUrl'], message: `${label} requested additional documents.` },
      'DEALER_ACTION_NEEDED',
      `Upload required documents to continue ${label} onboarding.`,
      `${label} requested additional documents before review can continue.`,
    ),
    PORTAL_ERROR: r(
      slug, 'PORTAL_ERROR', 500,
      { type: 'DELIVERY_FAILED', error: 'Partner portal email delivery failed', retryAfter: 'PT1H' },
      'SUBMITTED', null,
      `${label} partner email delivery failed. Retry recommended after 1 hour.`,
    ),
  };
}

const rvTrader = assistedMarketplaceStub('rv-trader', 'RV Trader');
const cycleTrader = assistedMarketplaceStub('cycle-trader', 'Cycle Trader');
const atvTrader = assistedMarketplaceStub('atv-trader', 'ATV Trader');
const trailerTrader = assistedMarketplaceStub('trailer-trader', 'Trailer Trader');
const facebookMarketplaceGeneral = assistedMarketplaceStub('facebook-marketplace-general', 'Facebook Marketplace');

const boatTrader = assistedMarketplaceStub('boat-trader', 'Boat Trader');
const yachtWorld = assistedMarketplaceStub('yachtworld', 'YachtWorld');
const boatsCom = assistedMarketplaceStub('boats-com', 'Boats.com');

const distrokid = assistedMarketplaceStub('distrokid', 'DistroKid');
const spotifyForArtists = assistedMarketplaceStub('spotify-for-artists', 'Spotify for Artists');
const amazonKdp = assistedMarketplaceStub('amazon-kdp', 'Amazon KDP');
const appleBooks = assistedMarketplaceStub('apple-books', 'Apple Books');
const shopifyCatalog = assistedMarketplaceStub('shopify-catalog', 'Shopify Product Catalog');
const etsy = assistedMarketplaceStub('etsy', 'Etsy');
const opensea = assistedMarketplaceStub('opensea', 'OpenSea');
const artstationMarketplace = assistedMarketplaceStub('artstation-marketplace', 'ArtStation Marketplace');
const youtubeCreator = assistedMarketplaceStub('youtube-creator', 'YouTube Creator Studio');
const vimeoOtt = assistedMarketplaceStub('vimeo-ott', 'Vimeo OTT');
const ebayResale = assistedMarketplaceStub('ebay-resale', 'eBay Seller Hub');
const mercari = assistedMarketplaceStub('mercari', 'Mercari');

const tunecore = assistedMarketplaceStub('tunecore', 'TuneCore');
const bandcamp = assistedMarketplaceStub('bandcamp', 'Bandcamp');
const googlePlayBooks = assistedMarketplaceStub('google-play-books', 'Google Play Books');
const barnesNoblePress = assistedMarketplaceStub('barnes-noble-press', 'Barnes & Noble Press');
const poshmark = assistedMarketplaceStub('poshmark', 'Poshmark');
const depop = assistedMarketplaceStub('depop', 'Depop');
const saatchiArt = assistedMarketplaceStub('saatchi-art', 'Saatchi Art');
const redbubble = assistedMarketplaceStub('redbubble', 'Redbubble');
const tiktokCreator = assistedMarketplaceStub('tiktok-creator', 'TikTok Creator Portal');
const rumbleCreator = assistedMarketplaceStub('rumble-creator', 'Rumble Creator');
const offerup = assistedMarketplaceStub('offerup', 'OfferUp');
const facebookMarketplaceResale = assistedMarketplaceStub('facebook-marketplace-resale', 'Facebook Marketplace Resale');
const chrono24Dealer = assistedMarketplaceStub('chrono24-dealer', 'Chrono24');
const watchbox = assistedMarketplaceStub('watchbox', 'WatchBox');
const stockx = assistedMarketplaceStub('stockx', 'StockX');
const goatSneakers = assistedMarketplaceStub('goat-sneakers', 'GOAT');
const tcgplayer = assistedMarketplaceStub('tcgplayer', 'TCGplayer');
const pwccMarketplace = assistedMarketplaceStub('pwcc-marketplace', 'PWCC Marketplace');
const chairish = assistedMarketplaceStub('chairish', 'Chairish');
const wayfairSeller = assistedMarketplaceStub('wayfair-seller', 'Wayfair Seller');
const airbnbHost = assistedMarketplaceStub('airbnb-host', 'Airbnb Host');
const vrboOwner = assistedMarketplaceStub('vrbo-owner', 'Vrbo Owner');

export const mockPortalResponses: Record<string, PlatformResponses> = {
  'dealer-storefront': dealerStorefront,
  'consumer-marketplace': consumerMarketplace,
  'google-vehicle-ads': googleVehicleAds,
  'meta-automotive-ads': metaAutomotiveAds,
  'tiktok-automotive-ads': tiktokAutomotiveAds,
  'microsoft-automotive-ads': microsoftAutomotiveAds,
  'pinterest-shopping-ads': pinterestShoppingAds,
  'reddit-dynamic-product-ads': redditDynamicProductAds,
  'cargurus-dealer': cargurusDealer,
  'autotrader-cox': autotraderCox,
  'ebay-motors': ebayMotors,
  'x-dynamic-product-ads': xDynamicProductAds,
  'cars-com': carsCom,
  'snapchat-dynamic-product-ads': snapchatDynamicProductAds,
  'linkedin-lead-gen-forms': linkedinLeadGenForms,
  'truecar-dealer-network': truecarDealerNetwork,
  'adf-xml-lead-routing': adfXmlLeadRouting,
  'nextdoor-ads': nextdoorAds,
  'apple-business-connect': appleBusinessConnect,
  'rv-trader': rvTrader,
  'cycle-trader': cycleTrader,
  'atv-trader': atvTrader,
  'trailer-trader': trailerTrader,
  'facebook-marketplace-general': facebookMarketplaceGeneral,
  'boat-trader': boatTrader,
  'yachtworld': yachtWorld,
  'boats-com': boatsCom,
  'distrokid': distrokid,
  'spotify-for-artists': spotifyForArtists,
  'amazon-kdp': amazonKdp,
  'apple-books': appleBooks,
  'shopify-catalog': shopifyCatalog,
  'etsy': etsy,
  'opensea': opensea,
  'artstation-marketplace': artstationMarketplace,
  'youtube-creator': youtubeCreator,
  'vimeo-ott': vimeoOtt,
  'ebay-resale': ebayResale,
  'mercari': mercari,
  'tunecore': tunecore,
  'bandcamp': bandcamp,
  'google-play-books': googlePlayBooks,
  'barnes-noble-press': barnesNoblePress,
  'poshmark': poshmark,
  'depop': depop,
  'saatchi-art': saatchiArt,
  'redbubble': redbubble,
  'tiktok-creator': tiktokCreator,
  'rumble-creator': rumbleCreator,
  'offerup': offerup,
  'facebook-marketplace-resale': facebookMarketplaceResale,
  'chrono24-dealer': chrono24Dealer,
  'watchbox': watchbox,
  'stockx': stockx,
  'goat-sneakers': goatSneakers,
  'tcgplayer': tcgplayer,
  'pwcc-marketplace': pwccMarketplace,
  'chairish': chairish,
  'wayfair-seller': wayfairSeller,
  'airbnb-host': airbnbHost,
  'vrbo-owner': vrboOwner,
};

export function getMockPortalResponse(platformSlug: string, condition: MockPortalCondition): MockPortalResponse | undefined {
  return mockPortalResponses[platformSlug]?.[condition];
}
