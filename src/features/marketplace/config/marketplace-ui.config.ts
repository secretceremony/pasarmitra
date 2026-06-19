export const MARKETPLACE_HERO_CONFIG = {
  badge: "Harvest Season 2024",
  title: "Direct Source Wholesale Network",
  description: "Connect directly with vetted local harvesters and distributors at industrial wholesale rates.",
  ctaPrimary: "Browse Fresh Produce",
  ctaSecondary: "Featured Farms",
  image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=2000"
};

export const SUPPLIER_TIER_CONFIG = {
  GOLD: {
    label: "Gold Supplier",
    colorClass: "bg-primary/20 text-primary border-primary/20",
  },
  VERIFIED: {
    label: "Verified Partner",
    colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  }
};

export const MARKETPLACE_SORT_OPTIONS = [
  { id: 'relativity', label: 'Relativity' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' }
];

export const MARKETPLACE_UI_STRINGS = {
  gridTitle: "Marketplace Browse",
  resultsFound: "Results Found",
  sortBy: "Sort by:",
  pricePer: "Price per",
  minOrder: "Standard Min.",
  noProducts: "No products found",
  noProductsDesc: "Try adjusting your filters or search keywords.",
  resetFilters: "Reset All Filters"
};

export const MARKETPLACE_ANIMATIONS = {
  layoutTransition: { duration: 0.4 },
  heroEnter: { opacity: 0, y: 30 },
  heroActive: { opacity: 1, y: 0 }
};
