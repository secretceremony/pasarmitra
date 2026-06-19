import { MarketplaceProduct } from '../types/product.types';

export const PRODUCTS: MarketplaceProduct[] = [
  { id: '1', name: 'Saffron Premium Grade A', price: 2500000, category: 'Spices', image: 'https://images.unsplash.com/photo-1543208541-0961a29a8a3d?auto=format&fit=crop&q=80&w=400', rating: 4.9, bulk: '10g', unit: 'Jar', distributor: 'PT. Rempah Indo', distributorId: '1' },
  { id: '2', name: 'Whole Wheat Grains', price: 150000, category: 'Grains', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400', rating: 4.7, bulk: '50kg', unit: 'Sack', distributor: 'Mitra Tani', distributorId: '2' },
  { id: '3', name: 'Organic Honey Wild Flower', price: 850000, category: 'Dry Goods', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400', rating: 4.8, bulk: '5L', unit: 'Jerrycan', distributor: 'Mayora Indah', distributorId: '3' },
  { id: '4', name: 'Vanilla Beans Tahiti', price: 1200000, category: 'Spices', image: 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&q=80&w=400', rating: 5.0, bulk: '100g', unit: 'Pack', distributor: 'PT. Rempah Indo', distributorId: '1' },
  { id: '5', name: 'Basmati Rice Imperial', price: 350000, category: 'Grains', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400', rating: 4.6, bulk: '25kg', unit: 'Sack', distributor: 'Mitra Tani', distributorId: '2' },
  { id: '6', name: 'Fresh Avocado Butter', price: 45000, category: 'Fresh Produce', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=400', rating: 4.5, bulk: '10kg', unit: 'Box', distributor: 'Indofood', distributorId: '4' },
];
