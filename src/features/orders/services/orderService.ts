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
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'unpaid';
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
  escrow_status?: 'none' | 'held' | 'released' | 'refunded';
  platform_fee_rate?: number;
  platform_fee_amount?: number;
  distributor_net_amount?: number;
  paid_at?: string;
  released_at?: string;
}

export const calculatePlatformFeeRate = async (distributorId: string): Promise<number> => {
  try {
    const distSnap = await getDoc(doc(db, 'profiles', distributorId));
    if (distSnap && typeof distSnap.exists === 'function' && distSnap.exists()) {
      const distData = distSnap.data();
      
      // 1. Check direct configurations
      if (typeof distData.platform_fee_rate === 'number') {
        return distData.platform_fee_rate;
      }
      if (typeof distData.commission_rate === 'number') {
        return distData.commission_rate * 100;
      }
      
      // 2. Check assigned tier
      const tierId = distData.commission_tier || distData.commissionTier;
      if (tierId) {
        const tierSnap = await getDoc(doc(db, 'commission_tiers', tierId));
        if (tierSnap.exists()) {
          const tierData = tierSnap.data();
          if (typeof tierData.platformFee === 'number') {
            return tierData.platformFee;
          }
          if (typeof tierData.commission_rate === 'number') {
            return tierData.commission_rate * 100;
          }
        }
      }

      // 3. Check matching category
      const distCategory = distData.category || distData.business_category;
      if (distCategory) {
        const tiersSnap = await getDocs(collection(db, 'commission_tiers'));
        let matchedFee: number | null = null;
        tiersSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.category && data.category.toLowerCase() === distCategory.toLowerCase()) {
            if (typeof data.platformFee === 'number') {
              matchedFee = data.platformFee;
            } else if (typeof data.commission_rate === 'number') {
              matchedFee = data.commission_rate * 100;
            }
          }
        });
        if (matchedFee !== null) {
          return matchedFee;
        }
      }
    }

    // 4. Global baseline
    const globalDoc = await getDoc(doc(db, 'settings', 'commission'));
    if (globalDoc.exists()) {
      const globalData = globalDoc.data();
      if (typeof globalData.globalBaseline === 'number') {
        return globalData.globalBaseline;
      }
    }
  } catch (err) {
    console.error("Error calculating platform fee rate:", err);
  }

  // 5. Fallback for UAT
  return 1.5;
};

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
    
    // UAT financial flow: Escrow Release on Delivered Order
    const escrowUpdates: any = {};
    if (status === 'delivered') {
      if (currentData.payment_status === 'paid' && currentData.escrow_status !== 'released') {
        // Query active disputes for this order
        const disputesSnap = await getDocs(
          query(collection(db, 'disputes'), where('order_id', '==', id))
        );
        const hasActiveDispute = disputesSnap.docs.some(docSnap => {
          const dStatus = (docSnap.data().status || '').toUpperCase();
          return dStatus !== 'RESOLVED' && dStatus !== 'REJECTED' && dStatus !== 'REFUNDED';
        });

        if (!hasActiveDispute) {
          escrowUpdates.escrow_status = 'released';
          escrowUpdates.released_at = timestamp;

          // Create wallet transaction with deterministic ID if it does not already exist
          const txRef = doc(db, 'wallet_transactions', `release_${id}`);
          const txSnap = await getDoc(txRef);
          if (!txSnap.exists()) {
            const gross = currentData.subtotal || currentData.total_amount;
            const feeRate = currentData.platform_fee_rate ?? 1.5;
            const feeAmount = currentData.platform_fee_amount ?? Math.round(gross * feeRate / 100);
            const net = currentData.distributor_net_amount ?? (gross - feeAmount);

            await setDoc(txRef, {
              id: `release_${id}`,
              distributor_id: currentData.distributor_id,
              order_id: id,
              order_code: currentData.order_code || '',
              type: 'order_release',
              direction: 'credit',
              gross_amount: gross,
              platform_fee_rate: feeRate,
              platform_fee_amount: feeAmount,
              net_amount: net,
              status: 'completed',
              created_at: serverTimestamp()
            });
          }
        }
      }
    }

    await updateDoc(docRef, { 
      status,
      updated_at: timestamp,
      ...escrowUpdates
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

  confirmOrderPayment: async (orderId: string, userEmail: string) => {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      throw new Error('Order tidak ditemukan');
    }
    const timestamp = new Date().toISOString();
    await updateDoc(orderRef, {
      payment_status: 'paid',
      escrow_status: 'held',
      paid_at: timestamp,
      updated_at: timestamp
    });

    await createAuditLog({
      event: 'ORDER_PAYMENT_CONFIRMED',
      status: 'SUCCESS',
      user: userEmail,
      details: `Konfirmasi pembayaran untuk pesanan: ${snap.data().order_code || orderId}`,
      targetCollection: 'orders',
      targetId: orderId
    });

    const updatedSnap = await getDoc(orderRef);
    return {
      id: orderId,
      ...updatedSnap.data()
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

    const subtotal = orderData.subtotal || orderData.total_amount;
    const rate = orderData.platform_fee_rate ?? (await calculatePlatformFeeRate(orderData.distributor_id));
    const amount = orderData.platform_fee_amount ?? Math.round(subtotal * rate / 100);
    const net = orderData.distributor_net_amount ?? (subtotal - amount);

    const timestamp = new Date().toISOString();
    const orderRef = doc(collection(db, 'orders'));
    const newOrder = {
      ...orderData,
      platform_fee_rate: rate,
      platform_fee_amount: amount,
      distributor_net_amount: net,
      payment_status: orderData.payment_status || 'pending',
      escrow_status: orderData.escrow_status || 'none',
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
      const data = item.data;
      const subtotal = data.subtotal || data.total_amount;
      const rate = data.platform_fee_rate ?? (await calculatePlatformFeeRate(data.distributor_id));
      const amount = data.platform_fee_amount ?? Math.round(subtotal * rate / 100);
      const net = data.distributor_net_amount ?? (subtotal - amount);

      const orderData = {
        ...data,
        platform_fee_rate: rate,
        platform_fee_amount: amount,
        distributor_net_amount: net,
        payment_status: data.payment_status || 'pending',
        escrow_status: data.escrow_status || 'none',
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
  },

  backfillWalletTransactionsForDeliveredOrders: async (distributorId: string) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('distributor_id', '==', distributorId),
        where('status', '==', 'delivered'),
        where('payment_status', '==', 'paid')
      );
      const orderSnap = await getDocs(q);
      const batch = writeBatch(db);
      let needCommit = false;

      for (const docSnap of orderSnap.docs) {
        const orderId = docSnap.id;
        const orderData = docSnap.data();

        // Check if transaction already exists
        const txId = `release_${orderId}`;
        const txRef = doc(db, 'wallet_transactions', txId);
        const txSnap = await getDoc(txRef);

        if (!txSnap || typeof txSnap.exists !== 'function' || !txSnap.exists()) {
          const subtotal = orderData.subtotal || orderData.total_amount || 0;
          let rate = orderData.platform_fee_rate;
          if (typeof rate !== 'number') {
            rate = await calculatePlatformFeeRate(distributorId);
          }
          const feeAmount = orderData.platform_fee_amount ?? Math.round(subtotal * (rate / 100));
          const netAmount = orderData.distributor_net_amount ?? (subtotal - feeAmount);

          // Update the order doc
          const orderRef = doc(db, 'orders', orderId);
          batch.update(orderRef, {
            escrow_status: 'released',
            released_at: orderData.released_at || new Date().toISOString(),
            platform_fee_rate: rate,
            platform_fee_amount: feeAmount,
            distributor_net_amount: netAmount
          });

          // Create transaction doc
          batch.set(txRef, {
            id: txId,
            order_id: orderId,
            order_code: orderData.order_code || '',
            distributor_id: distributorId,
            gross_amount: subtotal,
            platform_fee_rate: rate,
            platform_fee_amount: feeAmount,
            net_amount: netAmount,
            direction: 'credit',
            type: 'order_release',
            status: 'completed',
            created_at: serverTimestamp()
          });

          needCommit = true;
        }
      }

      if (needCommit) {
        await batch.commit();
        console.log(`[UAT BACKFILL] Successfully backfilled wallet transactions for distributor: ${distributorId}`);
      }
    } catch (err) {
      console.error('Error in backfillWalletTransactionsForDeliveredOrders:', err);
    }
  }
};

