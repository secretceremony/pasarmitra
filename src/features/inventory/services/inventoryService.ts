import { supabase } from '../../../lib/supabase';

export interface TieredPrice {
  min_quantity: number;
  price_per_unit: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  min_order_quantity: number;
  unit_type: string;
  image_url: string;
  tiered_pricing: TieredPrice[];
  distributor_id: string;
  is_active: boolean;
  created_at: string;
}

export const inventoryService = {
  getDistributorProducts: async (distributorId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('distributor_id', distributorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Product[];
  },

  createProduct: async (product: Omit<Product, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },

  updateProduct: async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
