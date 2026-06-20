import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  getDoc, 
  addDoc,
  setDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createAuditLog } from '../../admin/services/adminService';
import { UserRole } from '../../auth/types/auth.types';

export interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  type: 'text' | 'offer' | 'counter_offer' | 'system';
  message: string;
  offer_price?: number;
  quantity?: number;
  created_at: string;
  read_by: string[];
}

export interface Negotiation {
  id: string;
  negotiation_code: string;
  distributor_id: string;
  distributor_name: string;
  umkm_id: string;
  umkm_name: string;
  product_id: string;
  product_name: string;
  product_image: string;
  original_unit_price: number;
  requested_unit_price: number;
  agreed_unit_price?: number;
  quantity: number;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'cancelled' | 'converted_to_order';
  latest_message: string;
  latest_message_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  converted_order_id?: string;
}

export const negotiationService = {
  /**
   * Fetch negotiations list for a user.
   * Access control is enforced by user ID and role query filters.
   */
  async getNegotiationsList(userId: string, role: string): Promise<Negotiation[]> {
    if (!userId) return [];
    
    const field = role === 'UMKM' ? 'umkm_id' : 'distributor_id';
    const q = query(
      collection(db, 'negotiations'),
      where(field, '==', userId),
      orderBy('latest_message_at', 'desc')
    );

    const snap = await getDocs(q);
    const result: Negotiation[] = [];
    snap.forEach((d) => {
      result.push({ id: d.id, ...d.data() } as Negotiation);
    });
    return result;
  },

  /**
   * Fetches messages for a specific negotiation.
   */
  async getMessages(negotiationId: string): Promise<Message[]> {
    const q = query(
      collection(db, 'negotiations', negotiationId, 'messages'),
      orderBy('created_at', 'asc')
    );
    const snap = await getDocs(q);
    const result: Message[] = [];
    snap.forEach((d) => {
      result.push({ id: d.id, ...d.data() } as Message);
    });
    return result;
  },

  /**
   * Start a new price negotiation from the marketplace.
   */
  async createNegotiation(
    umkmId: string,
    umkmName: string,
    productId: string,
    requestedPrice: number,
    quantity: number,
    note: string
  ): Promise<Negotiation> {
    // 1. Validations
    if (requestedPrice <= 0) {
      throw new Error('Harga yang ditawarkan harus lebih besar dari Rp 0.');
    }
    if (quantity <= 0) {
      throw new Error('Jumlah barang harus lebih besar dari 0.');
    }

    // Fetch product details
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produk tidak ditemukan.');
    }
    const product = productSnap.data();

    // Verify product status
    if (!product.is_active) {
      throw new Error('Produk sedang tidak aktif.');
    }

    // Verify stock
    if (quantity > (product.stock || 0)) {
      throw new Error(`Stok tidak mencukupi. Stok tersedia: ${product.stock || 0}.`);
    }

    // Verify MOQ
    if (quantity < (product.min_order_quantity || 1)) {
      throw new Error(`Jumlah pesanan minimal adalah ${product.min_order_quantity || 1}.`);
    }

    // Verify not negotiating with oneself
    if (umkmId === product.distributor_id) {
      throw new Error('Anda tidak dapat melakukan negosiasi dengan bisnis Anda sendiri.');
    }

    // Fetch distributor name if needed
    const distributorId = product.distributor_id;
    const distributorName = product.distributor_name || 'Distributor';

    // Generate code
    const randomCode = `NEG-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = new Date().toISOString();

    // Create negotiation document
    const negData: Omit<Negotiation, 'id'> = {
      negotiation_code: randomCode,
      distributor_id: distributorId,
      distributor_name: distributorName,
      umkm_id: umkmId,
      umkm_name: umkmName,
      product_id: productId,
      product_name: product.name,
      product_image: product.image_url || '',
      original_unit_price: product.price || 0,
      requested_unit_price: requestedPrice,
      quantity,
      status: 'pending',
      latest_message: note || 'Mengajukan negosiasi harga.',
      latest_message_at: timestamp,
      created_by: umkmId,
      created_at: timestamp,
      updated_at: timestamp
    };

    const negRef = await addDoc(collection(db, 'negotiations'), negData);

    // Create initial message
    await addDoc(collection(db, 'negotiations', negRef.id, 'messages'), {
      sender_id: umkmId,
      sender_role: 'UMKM',
      type: 'offer',
      message: note || 'Mengajukan negosiasi harga.',
      offer_price: requestedPrice,
      quantity,
      created_at: timestamp,
      read_by: [umkmId]
    });

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_CREATED',
      status: 'SUCCESS',
      user: umkmId,
      details: `UMKM ${umkmName} memulai negosiasi ${randomCode} untuk produk ${product.name} (Jumlah: ${quantity}, Harga: Rp ${requestedPrice})`,
      targetCollection: 'negotiations',
      targetId: negRef.id
    });

    return { id: negRef.id, ...negData } as Negotiation;
  },

  /**
   * Counter with a new price and quantity.
   */
  async counterOffer(
    negotiationId: string,
    senderId: string,
    senderRole: 'UMKM' | 'DISTRIBUTOR',
    counterPrice: number,
    quantity: number,
    message: string
  ): Promise<void> {
    if (counterPrice <= 0) {
      throw new Error('Harga counter harus lebih besar dari Rp 0.');
    }
    if (quantity <= 0) {
      throw new Error('Jumlah barang harus lebih besar dari 0.');
    }

    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }

    const negData = negSnap.data() as Negotiation;

    // Enforce strict access control
    if (senderRole === 'UMKM' && negData.umkm_id !== senderId) {
      throw new Error('Akses ditolak.');
    }
    if (senderRole === 'DISTRIBUTOR' && negData.distributor_id !== senderId) {
      throw new Error('Akses ditolak.');
    }

    // Transition checks
    if (negData.status !== 'pending' && negData.status !== 'countered') {
      throw new Error('Negosiasi sudah selesai atau dibatalkan.');
    }

    // Revalidate stock
    const productRef = doc(db, 'products', negData.product_id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produk tidak ditemukan.');
    }
    const product = productSnap.data();
    if (!product.is_active) {
      throw new Error('Produk sedang tidak aktif.');
    }
    if (quantity > (product.stock || 0)) {
      throw new Error(`Stok tidak mencukupi. Stok tersedia: ${product.stock || 0}.`);
    }

    const timestamp = new Date().toISOString();

    // Update main document
    await updateDoc(negRef, {
      status: 'countered',
      requested_unit_price: counterPrice,
      quantity,
      latest_message: message || `Menawarkan kembali dengan harga Rp ${counterPrice}`,
      latest_message_at: timestamp,
      updated_at: timestamp
    });

    // Add counter message
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: senderId,
      sender_role: senderRole,
      type: 'counter_offer',
      message: message || `Menawarkan kembali dengan harga Rp ${counterPrice}`,
      offer_price: counterPrice,
      quantity,
      created_at: timestamp,
      read_by: [senderId]
    });

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_COUNTERED',
      status: 'SUCCESS',
      user: senderId,
      details: `${senderRole} mengirim penawaran balik ${negData.negotiation_code} (Jumlah: ${quantity}, Harga: Rp ${counterPrice})`,
      targetCollection: 'negotiations',
      targetId: negotiationId
    });
  },

  /**
   * Accepts the current negotiation offer.
   */
  async acceptOffer(
    negotiationId: string,
    userId: string,
    userRole: 'UMKM' | 'DISTRIBUTOR',
    agreedPrice: number
  ): Promise<void> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }

    const negData = negSnap.data() as Negotiation;

    // Enforce strict access control
    if (userRole === 'UMKM' && negData.umkm_id !== userId) {
      throw new Error('Akses ditolak.');
    }
    if (userRole === 'DISTRIBUTOR' && negData.distributor_id !== userId) {
      throw new Error('Akses ditolak.');
    }

    // Transition checks
    if (negData.status !== 'pending' && negData.status !== 'countered') {
      throw new Error('Hanya negosiasi berstatus pending atau countered yang dapat disetujui.');
    }

    // Revalidate product status
    const productRef = doc(db, 'products', negData.product_id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produk tidak ditemukan.');
    }
    const product = productSnap.data();
    if (!product.is_active) {
      throw new Error('Produk sedang tidak aktif.');
    }
    if (negData.quantity > (product.stock || 0)) {
      throw new Error(`Stok produk tidak mencukupi untuk disetujui. Tersedia: ${product.stock || 0}.`);
    }

    const timestamp = new Date().toISOString();

    // Update main document
    await updateDoc(negRef, {
      status: 'accepted',
      agreed_unit_price: agreedPrice,
      accepted_at: timestamp,
      latest_message: 'Penawaran harga disetujui.',
      latest_message_at: timestamp,
      updated_at: timestamp
    });

    // Add system message
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: userId,
      sender_role: 'SYSTEM',
      type: 'system',
      message: `Penawaran harga Rp ${agreedPrice.toLocaleString('id-ID')} disetujui oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}.`,
      created_at: timestamp,
      read_by: [userId]
    });

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_ACCEPTED',
      status: 'SUCCESS',
      user: userId,
      details: `Negosiasi ${negData.negotiation_code} disetujui dengan harga kesepakatan Rp ${agreedPrice} oleh ${userRole}`,
      targetCollection: 'negotiations',
      targetId: negotiationId
    });
  },

  /**
   * Rejects the current negotiation offer.
   */
  async rejectOffer(
    negotiationId: string,
    userId: string,
    userRole: 'UMKM' | 'DISTRIBUTOR',
    reason: string
  ): Promise<void> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }

    const negData = negSnap.data() as Negotiation;

    // Enforce strict access control
    if (userRole === 'UMKM' && negData.umkm_id !== userId) {
      throw new Error('Akses ditolak.');
    }
    if (userRole === 'DISTRIBUTOR' && negData.distributor_id !== userId) {
      throw new Error('Akses ditolak.');
    }

    // Transition checks
    if (negData.status !== 'pending' && negData.status !== 'countered') {
      throw new Error('Negosiasi sudah selesai atau tidak aktif.');
    }

    const timestamp = new Date().toISOString();

    // Update main document
    await updateDoc(negRef, {
      status: 'rejected',
      rejected_at: timestamp,
      latest_message: `Negosiasi ditolak. Alasan: ${reason || 'Tidak ada alasan ditentukan.'}`,
      latest_message_at: timestamp,
      updated_at: timestamp
    });

    // Add system message
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: userId,
      sender_role: 'SYSTEM',
      type: 'system',
      message: `Negosiasi ditolak oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}. Alasan: ${reason || '-'}`,
      created_at: timestamp,
      read_by: [userId]
    });

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_REJECTED',
      status: 'BLOCK',
      user: userId,
      details: `Negosiasi ${negData.negotiation_code} ditolak oleh ${userRole}. Alasan: ${reason || '-'}`,
      targetCollection: 'negotiations',
      targetId: negotiationId
    });
  },

  /**
   * Cancels the current negotiation.
   */
  async cancelNegotiation(negotiationId: string, userId: string): Promise<void> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }

    const negData = negSnap.data() as Negotiation;

    // Enforce strict access control (only UMKM can cancel)
    if (negData.umkm_id !== userId) {
      throw new Error('Akses ditolak. Hanya pembeli yang dapat membatalkan negosiasi.');
    }

    // Transition checks
    if (negData.status !== 'pending' && negData.status !== 'countered') {
      throw new Error('Negosiasi sudah berada di status final.');
    }

    const timestamp = new Date().toISOString();

    // Update main document
    await updateDoc(negRef, {
      status: 'cancelled',
      cancelled_at: timestamp,
      latest_message: 'Negosiasi dibatalkan oleh pembeli.',
      latest_message_at: timestamp,
      updated_at: timestamp
    });

    // Add system message
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: userId,
      sender_role: 'SYSTEM',
      type: 'system',
      message: 'Negosiasi dibatalkan oleh pembeli.',
      created_at: timestamp,
      read_by: [userId]
    });

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_CANCELLED',
      status: 'WARNING',
      user: userId,
      details: `Negosiasi ${negData.negotiation_code} dibatalkan oleh pembeli`,
      targetCollection: 'negotiations',
      targetId: negotiationId
    });
  },

  /**
   * Post message to room.
   */
  async postMessage(
    negotiationId: string,
    senderId: string,
    senderRole: string,
    text: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Add message
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: senderId,
      sender_role: senderRole,
      type: 'text',
      message: text,
      created_at: timestamp,
      read_by: [senderId]
    });

    // Update latest message
    await updateDoc(doc(db, 'negotiations', negotiationId), {
      latest_message: text,
      latest_message_at: timestamp,
      updated_at: timestamp
    });
  },

  /**
   * Fetch a single negotiation by ID, enforcing participant-based access control.
   */
  async getNegotiationById(negotiationId: string, userId: string, role: string): Promise<Negotiation> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }
    const neg = { id: negSnap.id, ...negSnap.data() } as Negotiation;
    
    // Strict participant-based access control
    if (role === 'UMKM' && neg.umkm_id !== userId) {
      throw new Error('Akses ditolak. Anda tidak memiliki akses ke negosiasi ini.');
    }
    if (role === 'DISTRIBUTOR' && neg.distributor_id !== userId) {
      throw new Error('Akses ditolak. Anda tidak memiliki akses ke negosiasi ini.');
    }
    if (role !== 'UMKM' && role !== 'DISTRIBUTOR' && role !== 'ADMIN') {
      throw new Error('Akses ditolak. Peran Anda tidak diizinkan mengakses negosiasi ini.');
    }
    return neg;
  },

  /**
   * Complete checkout from accepted negotiation.
   * Performs validation, creates the order, and updates negotiation status.
   */
  async checkoutNegotiation(
    negotiationId: string,
    buyerId: string,
    buyerName: string,
    buyerEmail: string,
    shippingAddress: string,
    paymentMethod: string
  ): Promise<{ id: string; order_code: string }> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }

    const negData = negSnap.data() as Negotiation;

    // 1. Strict access control
    if (negData.umkm_id !== buyerId) {
      throw new Error('Akses ditolak. Anda bukan pemilik negosiasi ini.');
    }

    // 2. Prevent duplicate checkout
    if (negData.status === 'converted_to_order' || negData.converted_order_id) {
      throw new Error('Negosiasi ini sudah diproses menjadi pesanan sebelumnya.');
    }

    // 3. Status checks
    if (negData.status !== 'accepted') {
      throw new Error('Negosiasi harus berada dalam status disetujui (accepted) sebelum checkout.');
    }

    // 4. Revalidate: product stock, MOQ, active status
    const productRef = doc(db, 'products', negData.product_id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produk negosiasi tidak ditemukan.');
    }
    const product = productSnap.data();
    if (!product.is_active) {
      throw new Error('Produk negosiasi sedang tidak aktif.');
    }
    if (negData.quantity > (product.stock || 0)) {
      throw new Error(`Stok produk tidak mencukupi. Tersedia: ${product.stock || 0}.`);
    }
    if (negData.quantity < (product.min_order_quantity || 1)) {
      throw new Error(`Jumlah pesanan kurang dari batas minimal (${product.min_order_quantity || 1}).`);
    }

    // 5. Revalidate distributor status
    const distRef = doc(db, 'profiles', negData.distributor_id);
    const distSnap = await getDoc(distRef);
    if (!distSnap.exists()) {
      throw new Error('Distributor tidak ditemukan.');
    }
    const distributor = distSnap.data();
    if (distributor.is_suspended) {
      throw new Error('Akun distributor sedang ditangguhkan.');
    }

    // 6. Generate order code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `ORD-${dateStr}-${randNum}`;

    const timestamp = new Date().toISOString();
    const agreedPrice = negData.agreed_unit_price || negData.requested_unit_price;
    const totalAmount = agreedPrice * negData.quantity;

    // 7. Prepare order document
    const orderItems = [{
      id: `item-${Math.random().toString(36).substring(7)}`,
      product_id: negData.product_id,
      product_name: negData.product_name,
      quantity: negData.quantity,
      price_per_unit: agreedPrice,
      total_price: totalAmount,
      price: agreedPrice,
      subtotal: totalAmount,
      unit: product.unit_type || 'Unit',
      image_url: negData.product_image || ''
    }];

    const orderData = {
      buyer_id: buyerId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      distributor_id: negData.distributor_id,
      distributor_name: negData.distributor_name,
      order_code: orderCode,
      items: orderItems,
      subtotal: totalAmount,
      total_amount: totalAmount,
      shipping_address: shippingAddress,
      payment_status: 'unpaid' as const,
      status: 'pending' as const,
      payment_method: paymentMethod,
      shipping_cost: 0,
      service_fee: 0,
      platform_fee: 0,
      negotiation_id: negotiationId,
      original_unit_price: negData.original_unit_price,
      agreed_unit_price: agreedPrice,
      created_at: timestamp,
      updated_at: timestamp
    };

    // 8. Create the order
    const orderRef = doc(collection(db, 'orders'));
    await setDoc(orderRef, orderData);

    // 9. Update negotiation status to converted_to_order ONLY after order creation succeeds
    await updateDoc(negRef, {
      status: 'converted_to_order',
      converted_order_id: orderRef.id,
      updated_at: timestamp
    });

    // 10. Add system message in the negotiation room
    await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
      sender_id: buyerId,
      sender_role: 'SYSTEM',
      type: 'system',
      message: `Negosiasi dikonversi menjadi pesanan (Order Code: ${orderCode}, Order ID: ${orderRef.id}).`,
      created_at: timestamp,
      read_by: [buyerId]
    });

    // 11. Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_CONVERTED_TO_ORDER',
      status: 'SUCCESS',
      user: buyerEmail,
      details: `Negosiasi ${negData.negotiation_code} dikonversi menjadi pesanan ${orderCode}`,
      targetCollection: 'negotiations',
      targetId: negotiationId
    });

    return { id: orderRef.id, order_code: orderCode };
  }
};
