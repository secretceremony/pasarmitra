export const CATEGORIES = [
  'All',
  'Sembako',
  'Beras & biji-bijian',
  'Minyak & bahan masak',
  'Gula, tepung & baking',
  'Sayur & buah',
  'Daging & seafood',
  'Frozen food',
  'Bumbu & rempah',
  'Minuman',
  'Kopi & teh',
  'Kemasan makanan',
  'Peralatan dapur',
  'Kebersihan usaha',
  'Produk grosir lain'
] as const;

export type Category = typeof CATEGORIES[number];

export const DISTRIBUTOR_TYPES = [
  'All',
  'Distributor sembako',
  'Supplier sayur & buah',
  'Supplier seafood/daging',
  'Supplier kemasan',
  'Supplier minuman',
  'Supplier bahan kue',
  'Supplier frozen food',
  'Supplier kebersihan usaha',
  'Supplier kopi/teh',
  'Grosir campuran'
] as const;

export type DistributorType = typeof DISTRIBUTOR_TYPES[number];

export const LOCATIONS = [
  'All',
  'Balikpapan Tengah',
  'Balikpapan Selatan',
  'Balikpapan Utara',
  'Balikpapan Timur',
  'Balikpapan Barat',
  'Balikpapan Kota'
] as const;

export type LocationType = typeof LOCATIONS[number];
