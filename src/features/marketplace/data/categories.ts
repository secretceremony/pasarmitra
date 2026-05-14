export const CATEGORIES = ['All', 'Fresh Produce', 'Spices', 'Grains', 'Dry Goods', 'Services'] as const;

export type Category = typeof CATEGORIES[number];
