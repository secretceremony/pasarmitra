export const MARKETPLACE_HERO_CONFIG = {
  badge: "Kemitraan Sembako",
  title: "Jaringan Grosir Sembako Terpercaya",
  description: "Terhubung langsung dengan distributor pilihan dan dapatkan harga grosir terbaik untuk usaha UMKM Anda.",
  ctaPrimary: "Jelajahi Produk",
  ctaSecondary: "Mitra Pilihan",
  image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=2000"
};

export const SUPPLIER_TIER_CONFIG = {
  GOLD: {
    label: "Pemasok Emas",
    colorClass: "bg-primary/20 text-primary border-primary/20",
  },
  VERIFIED: {
    label: "Mitra Terverifikasi",
    colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  }
};

export const MARKETPLACE_SORT_OPTIONS = [
  { id: 'best_match', label: 'Paling Sesuai' },
  { id: 'price_asc', label: 'Harga: Terendah ke Tertinggi' },
  { id: 'price_desc', label: 'Harga: Tertinggi ke Terendah' },
  { id: 'rating', label: 'Rating Tertinggi' },
  { id: 'newest', label: 'Terbaru' }
];

export const MARKETPLACE_UI_STRINGS = {
  gridTitle: "Jelajahi Produk",
  resultsFound: "Produk Ditemukan",
  sortBy: "Urutkan:",
  pricePer: "Harga per",
  minOrder: "Minimal Pembelian",
  noProducts: "Produk tidak ditemukan",
  noProductsDesc: "Coba sesuaikan kata kunci atau filter pencarian Anda.",
  resetFilters: "Atur Ulang Filter"
};

export const MARKETPLACE_ANIMATIONS = {
  layoutTransition: { duration: 0.4 },
  heroEnter: { opacity: 0, y: 30 },
  heroActive: { opacity: 1, y: 0 }
};

