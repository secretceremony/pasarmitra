import { supabase } from '../../../lib/supabase';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  distributor_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  payment_status: 'unpaid' | 'paid';
  created_at: string;
  items?: OrderItem[];
  buyer_profile?: {
    organization_name: string;
    email: string;
  };
}

export const orderService = {
  getDistributorOrders: async (distributorId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer_profile:buyer_id (
          organization_name,
          email
        )
      `)
      .eq('distributor_id', distributorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Order[];
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Order;
  }
};
