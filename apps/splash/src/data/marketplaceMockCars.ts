export interface MarketplaceCar {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  mileage: number;
  bodyStyle: 'SUV' | 'Truck' | 'Sedan' | 'Hybrid' | 'EV';
  dealershipName: string;
  location: string;
  badge: string;
  imageUrl: string;
  mpg: string;
  vin: string;
  zeroConquestAds: boolean;
}

export const MARKETPLACE_MOCK_CARS: MarketplaceCar[] = [
  {
    id: 'mp-1',
    year: 2024,
    make: 'Ford',
    model: 'F-150 Lightning',
    trim: 'Lariat SuperCrew 4WD',
    price: 58900,
    mileage: 11200,
    bodyStyle: 'Truck',
    dealershipName: 'Austin Auto Group',
    location: 'Austin, TX',
    badge: 'Verified Dealer',
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=600',
    mpg: '78 MPGe / Dual Motor',
    vin: '1FT6W1EV7PW019284',
    zeroConquestAds: true,
  },
  {
    id: 'mp-2',
    year: 2023,
    make: 'Toyota',
    model: 'RAV4 Prime',
    trim: 'XSE Plug-In Hybrid',
    price: 36400,
    mileage: 16800,
    bodyStyle: 'SUV',
    dealershipName: 'Austin Auto Group',
    location: 'Austin, TX',
    badge: '1-Owner Clean',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=600',
    mpg: '38 MPG / 42mi EV',
    vin: 'JTMBABFV6PD014920',
    zeroConquestAds: true,
  },
  {
    id: 'mp-3',
    year: 2024,
    make: 'Honda',
    model: 'CR-V Hybrid',
    trim: 'Sport Touring AWD',
    price: 33500,
    mileage: 9400,
    bodyStyle: 'SUV',
    dealershipName: 'Pristine Dealer Solutions',
    location: 'Dallas, TX',
    badge: 'Just Arrived',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600',
    mpg: '40 City / 34 Hwy',
    vin: '7FARW2H88RE019842',
    zeroConquestAds: true,
  },
  {
    id: 'mp-4',
    year: 2023,
    make: 'Tesla',
    model: 'Model Y',
    trim: 'Long Range Dual Motor',
    price: 37900,
    mileage: 14200,
    bodyStyle: 'EV',
    dealershipName: 'Austin Auto Group',
    location: 'Austin, TX',
    badge: 'Clean History',
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=600',
    mpg: '122 MPGe / 330mi Range',
    vin: '7SAYGDEE1PF719283',
    zeroConquestAds: true,
  },
  {
    id: 'mp-5',
    year: 2022,
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'RST Crew Cab 4WD',
    price: 41800,
    mileage: 29400,
    bodyStyle: 'Truck',
    dealershipName: 'Lone Star Motors',
    location: 'Fort Worth, TX',
    badge: 'Great Price',
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=600',
    mpg: '16 City / 21 Hwy',
    vin: '1GCPYFED7NZ192840',
    zeroConquestAds: true,
  },
  {
    id: 'mp-6',
    year: 2021,
    make: 'BMW',
    model: 'M340i',
    trim: 'xDrive Sedan',
    price: 44500,
    mileage: 26100,
    bodyStyle: 'Sedan',
    dealershipName: 'Premium Imports',
    location: 'Houston, TX',
    badge: 'M Sport Pack',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600',
    mpg: '23 City / 32 Hwy',
    vin: 'WBA5U7C04MFA192834',
    zeroConquestAds: true,
  },
];
