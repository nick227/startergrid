export interface PreFlightCheck {
  id: string;
  label: string;
  category: 'core' | 'media' | 'pricing' | 'schema';
  status: 'passed' | 'warning' | 'blocked';
  detail: string;
}

export interface InspectorVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string;
  vin: string;
  stockNumber: string;
  price: number;
  mileage: number;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  fuelType: string;
  overallStatus: 'Ready to send' | 'Needs details' | 'Cannot list';
  statusBadgeVariant: 'ready' | 'warning' | 'blocked';
  photoCount: number;
  photoTarget: number;
  checks: PreFlightCheck[];
  channelReadiness: {
    channelId: string;
    channelName: string;
    status: 'Ready' | 'Needs Attention' | 'Blocked';
    reason: string;
  }[];
}

export const INSPECTOR_VEHICLES: InspectorVehicle[] = [
  {
    id: 'f150',
    year: 2022,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat 4WD SuperCrew 5.5 ft Bed',
    bodyStyle: 'Truck',
    vin: '1FTFW1ED4NFA10928',
    stockNumber: 'STK-22084',
    price: 46990,
    mileage: 28400,
    exteriorColor: 'Agate Black Metallic',
    interiorColor: 'Black Leather',
    engine: '3.5L PowerBoost Full-Hybrid V6',
    fuelType: 'Hybrid',
    overallStatus: 'Ready to send',
    statusBadgeVariant: 'ready',
    photoCount: 22,
    photoTarget: 20,
    checks: [
      { id: 'vin', label: '17-Char VIN Check Digit', category: 'core', status: 'passed', detail: 'NHTSA ISO-3779 checksum verified. Valid year/make/plant.' },
      { id: 'stock', label: 'Stock Number Uniqueness', category: 'core', status: 'passed', detail: 'No collision with active, sold, or historical records.' },
      { id: 'media-baseline', label: 'Mandatory 6-Slot Photo Grid', category: 'media', status: 'passed', detail: 'Front 3/4, Rear 3/4, Cockpit, Odometer, Bed, and Monroney present.' },
      { id: 'photo-res', label: 'Image Resolution & Framing', category: 'media', status: 'passed', detail: 'All 22 photos meet 1920x1080 minimum with no watermarks.' },
      { id: 'pricing', label: 'Price Compliance', category: 'pricing', status: 'passed', detail: 'Absolute price $46,990 exceeds floor threshold. No zero/placeholder.' },
      { id: 'odometer', label: 'Odometer Certification', category: 'core', status: 'passed', detail: '28,400 mi certified actual mileage with digital photo corroboration.' },
      { id: 'epa', label: 'EPA Fuel Economy Ratings', category: 'schema', status: 'passed', detail: '24 City / 24 Hwy decoded and populated for Google Vehicle Ads.' },
      { id: 'options', label: 'Equipment & Monroney Options', category: 'schema', status: 'passed', detail: '502A High Package, Co-Pilot360 Assist 2.0 mapped.' },
    ],
    channelReadiness: [
      { channelId: 'marketplace', channelName: 'Auto Marketplace (Owned)', status: 'Ready', reason: 'Zero lag. Published to consumer search.' },
      { channelId: 'google-vehicle-ads', channelName: 'Google Vehicle Ads', status: 'Ready', reason: 'EPA specs and clean title match merchant schema.' },
      { channelId: 'meta-automotive-ads', channelName: 'Meta Automotive Ads', status: 'Ready', reason: '16:9 hero image and VIN payload valid.' },
      { channelId: 'cargurus', channelName: 'CarGurus', status: 'Ready', reason: 'Good Deal badge assigned based on regional comp.' },
      { channelId: 'autotrader', channelName: 'AutoTrader', status: 'Ready', reason: 'Full 22 photos formatted for Cox syndication feed.' },
    ],
  },
  {
    id: 'rav4',
    year: 2023,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE AWD',
    bodyStyle: 'SUV',
    vin: '2T3P1RFV5PW219842',
    stockNumber: 'STK-23119',
    price: 29850,
    mileage: 19150,
    exteriorColor: 'Magnetic Gray Metallic',
    interiorColor: 'Ash Fabric',
    engine: '2.5L 4-Cylinder DOHC',
    fuelType: 'Gasoline',
    overallStatus: 'Ready to send',
    statusBadgeVariant: 'ready',
    photoCount: 18,
    photoTarget: 16,
    checks: [
      { id: 'vin', label: '17-Char VIN Check Digit', category: 'core', status: 'passed', detail: 'Toyota Canada Ontario plant decoded successfully.' },
      { id: 'stock', label: 'Stock Number Uniqueness', category: 'core', status: 'passed', detail: 'Unique stock identifier confirmed.' },
      { id: 'media-baseline', label: 'Mandatory 6-Slot Photo Grid', category: 'media', status: 'passed', detail: 'Key angles and instrument cluster verified.' },
      { id: 'pricing', label: 'Price Compliance', category: 'pricing', status: 'passed', detail: 'Retail asking $29,850 formatted without dollar signs or text.' },
      { id: 'odometer', label: 'Odometer Certification', category: 'core', status: 'passed', detail: '19,150 miles matches Carfax 1-owner verification record.' },
      { id: 'epa', label: 'EPA Fuel Economy Ratings', category: 'schema', status: 'passed', detail: '27 City / 33 Hwy populated.' },
    ],
    channelReadiness: [
      { channelId: 'marketplace', channelName: 'Auto Marketplace (Owned)', status: 'Ready', reason: 'Indexed. Direct inquiry enabled.' },
      { channelId: 'google-vehicle-ads', channelName: 'Google Vehicle Ads', status: 'Ready', reason: '100% compliant with local inventory feeds.' },
      { channelId: 'meta-automotive-ads', channelName: 'Meta Automotive Ads', status: 'Ready', reason: 'Catalog entry valid.' },
      { channelId: 'cars-com', channelName: 'Cars.com', status: 'Ready', reason: 'Verified dealer stock.' },
    ],
  },
  {
    id: 'bmw-330i',
    year: 2021,
    make: 'BMW',
    model: '330i',
    trim: 'xDrive Sedan',
    bodyStyle: 'Sedan',
    vin: 'WBA5R7C56MFA83910',
    stockNumber: 'STK-21045',
    price: 31500,
    mileage: 34200,
    exteriorColor: 'Alpine White',
    interiorColor: 'Canberra Beige SensaTec',
    engine: '2.0L TwinPower Turbo I4',
    fuelType: 'Gasoline',
    overallStatus: 'Needs details',
    statusBadgeVariant: 'warning',
    photoCount: 14,
    photoTarget: 16,
    checks: [
      { id: 'vin', label: '17-Char VIN Check Digit', category: 'core', status: 'passed', detail: 'BMW AG Munich check digit verified.' },
      { id: 'media-baseline', label: 'Mandatory 6-Slot Photo Grid', category: 'media', status: 'passed', detail: 'Core slots filled, but missing dedicated Window Sticker photo.' },
      { id: 'pricing', label: 'Price Compliance', category: 'pricing', status: 'passed', detail: 'Priced at $31,500. Aged 42 days in StarterGrid.' },
      { id: 'options', label: 'Trim Package Code Specification', category: 'schema', status: 'warning', detail: 'Missing BMW M Sport package sub-code required by eBay Motors.' },
      { id: 'odometer', label: 'Odometer Certification', category: 'core', status: 'passed', detail: '34,200 mi verified.' },
    ],
    channelReadiness: [
      { channelId: 'marketplace', channelName: 'Auto Marketplace (Owned)', status: 'Ready', reason: 'Visible on marketplace immediately.' },
      { channelId: 'google-vehicle-ads', channelName: 'Google Vehicle Ads', status: 'Ready', reason: 'Basic requirements met.' },
      { channelId: 'meta-automotive-ads', channelName: 'Meta Automotive Ads', status: 'Ready', reason: 'Catalog payload approved.' },
      { channelId: 'ebay-motors', channelName: 'eBay Motors', status: 'Needs Attention', reason: 'Missing M Sport package sub-code. Direct export paused.' },
    ],
  },
  {
    id: 'tahoe',
    year: 2024,
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'RST 4WD',
    bodyStyle: 'SUV',
    vin: '1GNSKRKD8RR198302',
    stockNumber: 'STK-24012',
    price: 64250,
    mileage: 8400,
    exteriorColor: 'Black',
    interiorColor: 'Jet Black / Victory Red',
    engine: '5.3L EcoTec3 V8',
    fuelType: 'Gasoline',
    overallStatus: 'Cannot list',
    statusBadgeVariant: 'blocked',
    photoCount: 4,
    photoTarget: 6,
    checks: [
      { id: 'vin', label: '17-Char VIN Check Digit', category: 'core', status: 'passed', detail: 'General Motors Arlington Assembly plant verified.' },
      { id: 'media-baseline', label: 'Mandatory 6-Slot Photo Grid', category: 'media', status: 'blocked', detail: 'Only 4 photos uploaded. Missing instrument cluster & rear 3/4.' },
      { id: 'pricing', label: 'Price Compliance', category: 'pricing', status: 'passed', detail: 'Price $64,250 confirmed.' },
      { id: 'title', label: 'Title Disclosure State', category: 'core', status: 'passed', detail: 'Clean title verified.' },
      { id: 'gate', label: 'Distribution Blocked', category: 'schema', status: 'blocked', detail: 'Vehicle blocked from all feeds until minimum 6 photos are uploaded.' },
    ],
    channelReadiness: [
      { channelId: 'marketplace', channelName: 'Auto Marketplace (Owned)', status: 'Blocked', reason: 'Below minimum photo threshold (4/6).' },
      { channelId: 'google-vehicle-ads', channelName: 'Google Vehicle Ads', status: 'Blocked', reason: 'Merchant Center photo requirement unsatisfied.' },
      { channelId: 'meta-automotive-ads', channelName: 'Meta Automotive Ads', status: 'Blocked', reason: 'Feed pre-flight rule prevents syndication.' },
      { channelId: 'cargurus', channelName: 'CarGurus', status: 'Blocked', reason: 'Held in staging queue.' },
    ],
  },
];
