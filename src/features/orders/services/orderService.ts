import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createAuditLog } from '../../admin/services/adminService';
import { useAuthStore } from '../../../store/use-auth-store';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number; // legacy compatibility
  total_price: number; // legacy compatibility
  price?: number; // aligned unit price
  subtotal?: number; // aligned item total
  unit?: string; // unit type if available
  image_url?: string; // product image if available
}

export interface Order {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_email?: string;
  distributor_id: string;
  distributor_name?: string;
  order_code?: string;
  subtotal?: number; // aligned subtotal
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  shipping_cost?: number;
  service_fee?: number; // legacy fee field
  platform_fee?: number; // canonical fee field
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  buyer_profile?: {
    organization_name: string;
    email: string;
  };
}

export const orderService = {
  getOrderById: async (id: string) => {
    const docRef = doc(db, 'orders', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
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
      buyer_profile
    } as Order;
  },

  getDistributorOrders: async (distributorId: string) => {
    const q = query(
      collection(db, 'orders'),
      where('distributor_id', '==', distributorId)
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
    
    orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return orders;
  },

  getBuyerOrders: async (buyerId: string) => {
    const q = query(
      collection(db, 'orders'),
      where('buyer_id', '==', buyerId)
    );
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    for (const document of querySnapshot.docs) {
      const orderData = document.data() as Omit<Order, 'id'>;
      const orderId = document.id;
      
      orders.push({
        id: orderId,
        ...orderData,
      } as Order);
    }
    
    orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return orders;
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    const docRef = doc(db, 'orders', id);
    const snapBefore = await getDoc(docRef);
    if (!snapBefore.exists()) {
      throw new Error('Order tidak ditemukan');
    }
    const currentData = snapBefore.data() as Omit<Order, 'id'>;
    const currentStatus = currentData.status || 'pending';

    const ALLOWED_TRANSITIONS: Record<Order['status'], Order['status'][]> = {
      pending: ['processing'],
      processing: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      throw new Error(`Transisi status tidak valid dari '${currentStatus}' ke '${status}'.`);
    }

    const timestamp = new Date().toISOString();
    await updateDoc(docRef, { 
      status,
      updated_at: timestamp
    });

    const snap = await getDoc(docRef);
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
    } as unknown as Order;
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'created_at'>) => {
    // Service-level verification guard
    const buyerDocRef = doc(db, 'profiles', orderData.buyer_id);
    const buyerSnap = await getDoc(buyerDocRef);
    if (!buyerSnap.exists()) {
      throw new Error('Profil pembeli tidak ditemukan.');
    }
    const buyerData = buyerSnap.data();
    if (buyerData.is_suspended) {
      throw new Error('Akun Anda sedang ditangguhkan. Pembelian tidak dapat dilanjutkan.');
    }
    if (buyerData.role === 'UMKM' && !buyerData.is_verified) {
      throw new Error('Akun UMKM belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.');
    }

    const timestamp = new Date().toISOString();
    const orderRef = doc(collection(db, 'orders'));
    const newOrder = {
      ...orderData,
      created_at: timestamp,
      updated_at: timestamp
    };
    await setDoc(orderRef, newOrder);
    return {
      id: orderRef.id,
      ...newOrder
    } as unknown as Order;
  },

  createOrdersBatch: async (orders: { order_code: string; data: Omit<Order, 'id' | 'created_at'> }[]) => {
    if (orders.length > 0) {
      // Service-level verification guard
      const firstOrder = orders[0].data;
      const buyerDocRef = doc(db, 'profiles', firstOrder.buyer_id);
      const buyerSnap = await getDoc(buyerDocRef);
      if (!buyerSnap.exists()) {
        throw new Error('Profil pembeli tidak ditemukan.');
      }
      const buyerData = buyerSnap.data();
      if (buyerData.is_suspended) {
        throw new Error('Akun Anda sedang ditangguhkan. Pembelian tidak dapat dilanjutkan.');
      }
      if (buyerData.role === 'UMKM' && !buyerData.is_verified) {
        throw new Error('Akun UMKM belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.');
      }
    }

    const batch = writeBatch(db);
    const createdOrders: Order[] = [];
    const timestamp = new Date().toISOString();

    for (const item of orders) {
      const orderRef = doc(collection(db, 'orders'));
      const orderData = {
        ...item.data,
        order_code: item.order_code,
        created_at: timestamp,
        updated_at: timestamp
      };
      batch.set(orderRef, orderData);
      createdOrders.push({ id: orderRef.id, ...orderData } as unknown as Order);
    }

    await batch.commit();
    return createdOrders;
  },

  createDisputeFromOrder: async (
    orderId: string, 
    buyerId: string, 
    payload: {
      reason: string;
      evidence_note?: string;
      evidence_url?: string;
      requested_resolution?: 'refund' | 'replacement' | 'admin_review';
    }
  ) => {
    // 1. Read the selected order
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order tidak ditemukan');
    }
    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

    // 2. Validate that the logged-in buyer owns the order
    if (order.buyer_id !== buyerId) {
      throw new Error('Anda tidak memiliki wewenang untuk mengajukan komplain pada pesanan ini.');
    }

    // 3. Validate that the order is eligible for dispute/refund
    // Allowed only when payment_status === "paid" and order.status !== "cancelled"
    if (order.payment_status !== 'paid') {
      throw new Error('Komplain hanya dapat diajukan untuk pesanan yang sudah dibayar.');
    }
    if (order.status === 'cancelled') {
      throw new Error('Pesanan telah dibatalkan, komplain tidak dapat diajukan.');
    }

    // 4. Prevent duplicate active disputes for the same order
    // Active disputes are those that are NOT in terminal status (RESOLVED, REJECTED, REFUNDED)
    const disputesRef = collection(db, 'disputes');
    const q = query(
      disputesRef, 
      where('order_id', '==', orderId)
    );
    const querySnapshot = await getDocs(q);
    const activeDispute = querySnapshot.docs.find(docSnap => {
      const data = docSnap.data();
      const status = (data.status || '').toUpperCase();
      return status !== 'RESOLVED' && status !== 'REJECTED' && status !== 'REFUNDED';
    });

    if (activeDispute) {
      throw new Error('Komplain aktif untuk pesanan ini sudah ada.');
    }

    // 5. Create a dispute document in Firestore
    const disputeRef = doc(collection(db, 'disputes'));
    
    // Formatting currency for the admin amount field compatibility
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(order.total_amount);

    const buyerName = order.buyer_name || order.buyer_profile?.organization_name || 'UMKM Buyer';
    const distributorName = order.distributor_name || 'Distributor';

    const disputeDoc = {
      order_id: orderId,
      orderId: orderId, // redundant compat field
      order_code: order.order_code || '',
      invoiceId: order.order_code || '', // redundant compat field
      buyer_id: buyerId,
      buyer_name: buyerName,
      claimant: buyerName, // redundant compat field
      distributor_id: order.distributor_id,
      distributor_name: distributorName,
      defendant: distributorName, // redundant compat field
      reason: payload.reason,
      evidence_note: payload.evidence_note || '',
      description: payload.evidence_note || payload.reason, // redundant compat field
      evidence_url: payload.evidence_url || '',
      requested_resolution: payload.requested_resolution || 'admin_review',
      amount: formattedAmount, // redundant compat field
      status: 'OPEN',
      created: 'Baru saja', // redundant compat field
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    await setDoc(disputeRef, disputeDoc);

    // 6. Create audit log if it exists
    const userEmail = useAuthStore.getState().user?.email || order.buyer_email || 'buyer@pasarmitra.com';
    await createAuditLog({
      event: 'DISPUTE_CREATED',
      status: 'SUCCESS',
      user: userEmail,
      details: `Mengajukan komplain/refund untuk pesanan #${order.order_code || orderId.slice(0, 8).toUpperCase()}: ${payload.reason}`,
      targetCollection: 'disputes',
      targetId: disputeRef.id
    });

    return {
      id: disputeRef.id,
      ...disputeDoc,
      created_at: new Date().toISOString(), // local fallback for UI mapping until refresh/realtime
      updated_at: new Date().toISOString()
    };
  }
};

