import { buildAutomotiveListHref, type AutomotiveListParams } from '../components/home/automotiveLinks.ts';

export const MOCK_BODY_STYLES = [
  { label: 'SUVs', count: 12050, icon: 'suv' },
  { label: 'Trucks', count: 8304, icon: 'truck' },
  { label: 'Sedans', count: 15200, icon: 'sedan' },
  { label: 'Coupes', count: 2100, icon: 'coupe' },
  { label: 'Vans', count: 1800, icon: 'van' },
  { label: 'EVs', count: 4200, icon: 'ev' },
  { label: 'Hybrids', count: 6500, icon: 'hybrid' },
];

export const MOCK_FEATURED_CARS = [
  { id: 'f1', year: 2024, make: 'Ford', model: 'F-150', price: 42500, imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=400', badge: 'Great Deal' },
  { id: 'f2', year: 2023, make: 'Toyota', model: 'RAV4', price: 28900, imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400', badge: 'Low Mileage' },
  { id: 'f3', year: 2025, make: 'Honda', model: 'CR-V', price: 31200, imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400', badge: 'Just Arrived' },
];

type BuyingGuide = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  params: AutomotiveListParams;
  isFeatured: boolean;
  link: string;
};

type EditorialCampaign = {
  id: string;
  tabLabel: string;
  title: string;
  badge: string;
  imageUrl: string;
  params: AutomotiveListParams;
  link: string;
};

export const MOCK_EDITORIAL_CAMPAIGNS: EditorialCampaign[] = [
  {
    id: 'c1',
    tabLabel: 'SUVs Under $30k',
    title: 'Top SUVs Under $30,000',
    badge: '',
    imageUrl: '/images/collections/suv-under-30k.jpg',
    params: { bodyStyle: 'SUV', maxPrice: 3000000 },
    link: buildAutomotiveListHref({ bodyStyle: 'SUV', maxPrice: 3000000 }),
  },
  {
    id: 'c2',
    tabLabel: 'Hybrids',
    title: 'Top Rated Hybrids',
    badge: '',
    imageUrl: '/images/collections/hybrid-guide.jpg',
    params: { powertrain: 'Hybrid' },
    link: buildAutomotiveListHref({ powertrain: 'Hybrid' }),
  },
  {
    id: 'c3',
    tabLabel: 'Work Trucks',
    title: 'Heavy Duty Work Trucks',
    badge: '',
    imageUrl: '/images/collections/work-trucks.jpg',
    params: { bodyStyle: 'Truck' },
    link: buildAutomotiveListHref({ bodyStyle: 'Truck' }),
  },
  {
    id: 'c4',
    tabLabel: 'Under $15k',
    title: 'Great Deals Under $15,000',
    badge: '',
    imageUrl: '/images/collections/under-15k.jpg',
    params: { condition: 'USED', maxPrice: 1500000 },
    link: buildAutomotiveListHref({ condition: 'USED', maxPrice: 1500000 }),
  },
  {
    id: 'c5',
    tabLabel: 'Commuter Cars',
    title: 'Best Commuter Cars',
    badge: '',
    imageUrl: '/images/collections/commuter-cars.jpg',
    params: { bodyStyle: 'Sedan' },
    link: buildAutomotiveListHref({ bodyStyle: 'Sedan' }),
  },
];

export const MOCK_TRENDING_BENTO = [
  { id: 't1', year: 2023, make: 'Tesla', model: 'Model Y', price: 41000, imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=600', badge: 'Just Arrived', isFeatured: true },
  { id: 't2', year: 2022, make: 'Jeep', model: 'Wrangler', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400', badge: 'Great Deal', isFeatured: false },
  { id: 't3', year: 2024, make: 'Chevrolet', model: 'Tahoe', price: 56000, imageUrl: 'https://images.unsplash.com/photo-1563720225384-9c0f671c89f5?auto=format&fit=crop&q=80&w=400', badge: 'Low Mileage', isFeatured: false },
  { id: 't4', year: 2021, make: 'Toyota', model: 'Camry', price: 21000, imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400', badge: 'Priced to Sell', isFeatured: false },
  { id: 't5', year: 2023, make: 'Kia', model: 'Telluride', price: 38500, imageUrl: 'https://images.unsplash.com/photo-1605810731671-893bd9a910ec?auto=format&fit=crop&q=80&w=400', badge: 'Just Arrived', isFeatured: false },
];

export const MOCK_DEALS_CAROUSEL = [
  { id: 'd1', year: 2022, make: 'Ford', model: 'Mustang', price: 28000, marketDelta: 3200, mileage: 15000, dealer: 'City Ford', imageUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=400', badge: 'Price Drop' },
  { id: 'd2', year: 2020, make: 'BMW', model: '3 Series', price: 26500, marketDelta: 2100, mileage: 42000, dealer: 'Elite Auto', imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=400', badge: 'Below Market' },
  { id: 'd3', year: 2023, make: 'Hyundai', model: 'Tucson', price: 24000, marketDelta: 1800, mileage: 12000, dealer: 'Hyundai Direct', imageUrl: 'https://images.unsplash.com/photo-1633506161494-b2b918f6d7ab?auto=format&fit=crop&q=80&w=400', badge: 'Price Drop' },
  { id: 'd4', year: 2021, make: 'Nissan', model: 'Rogue', price: 19500, marketDelta: 1500, mileage: 36000, dealer: 'Nissan of North', imageUrl: 'https://images.unsplash.com/photo-1630138241088-72b1660bd5cc?auto=format&fit=crop&q=80&w=400', badge: 'Below Market' },
  { id: 'd5', year: 2022, make: 'Subaru', model: 'Outback', price: 27500, marketDelta: 2400, mileage: 22000, dealer: 'Valley Auto', imageUrl: 'https://images.unsplash.com/photo-1520050735087-1ed65d0b27fe?auto=format&fit=crop&q=80&w=400', badge: 'Price Drop' },
];

export const MOCK_BUYING_GUIDES: BuyingGuide[] = [
  { id: 'g1', title: 'Top-Rated SUVs', subtitle: 'Browse the most popular SUVs on the market.', imageUrl: '/images/collections/suvs.jpg', params: { bodyStyle: 'SUV' }, isFeatured: true, link: buildAutomotiveListHref({ bodyStyle: 'SUV' }) },
  { id: 'g2', title: 'Great Deals Under $15k', subtitle: 'Affordable used cars priced to sell.', imageUrl: '/images/collections/under-15k.jpg', params: { condition: 'USED', maxPrice: 1500000 }, isFeatured: false, link: buildAutomotiveListHref({ condition: 'USED', maxPrice: 1500000 }) },
  { id: 'g3', title: 'Heavy Duty Work Trucks', subtitle: 'Tough trucks ready for the job.', imageUrl: '/images/collections/work-trucks.jpg', params: { bodyStyle: 'Truck' }, isFeatured: false, link: buildAutomotiveListHref({ bodyStyle: 'Truck' }) },
  { id: 'g4', title: 'Best Commuter Cars', subtitle: 'Save gas and money on your commute.', imageUrl: '/images/collections/commuter-cars.jpg', params: { bodyStyle: 'Sedan' }, isFeatured: false, link: buildAutomotiveListHref({ bodyStyle: 'Sedan' }) },
];

export const MOCK_FOOTER_BRANDS = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai', 'Kia', 'Jeep', 'Nissan',
  'Subaru', 'Volkswagen', 'Audi', 'Lexus', 'Porsche'
];
