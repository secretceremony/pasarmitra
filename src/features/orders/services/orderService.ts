import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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
    const q = query(
      collection(db, 'orders'),
      where('distributor_id', '==', distributorId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    for (const document of querySnapshot.docs) {
      const orderData = document.data() as Omit<Order, 'id'>;
      const orderId = document.id;
      
      // Resolve buyer_profile relation
      let buyer_profile: Order['buyer_profile'] = undefined;
      if (orderData.buyer_id) {
        const profileSnap = await getDoc(doc(db, 'profiles', orderData.buyer_id));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          buyer_profile = {
            organization_name: profileData.organization_name || '',
            email: profileData.email || '',
          };
        }
      }
      
      orders.push({
        id: orderId,
        ...orderData,
        buyer_profile,
      } as Order);
    }
    
    return orders;
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, { status });
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Order not found');
    }
    const orderData = snap.data() as Omit<Order, 'id'>;
    
    // Resolve buyer_profile relation
    let buyer_profile: Order['buyer_profile'] = undefined;
    if (orderData.buyer_id) {
      const profileSnap = await getDoc(doc(db, 'profiles', orderData.buyer_id));
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        buyer_profile = {
          organization_name: profileData.organization_name || '',
          email: profileData.email || '',
        };
      }
    }
    
    return {
      id: snap.id,
      ...orderData,
      buyer_profile,
    } as Order;
  }
};

