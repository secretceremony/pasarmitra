export const CATEGORIES = ['All', 'Sembako', 'F&B', 'Camilan', 'Kebersihan'] as const;

export type Category = typeof CATEGORIES[number];

