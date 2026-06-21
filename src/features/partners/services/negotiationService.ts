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
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createAuditLog } from '../../admin/services/adminService';
import { UserRole } from '../../auth/types/auth.types';
import { calculatePlatformFeeRate } from '../../orders/services/orderService';

export interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  sender_name?: string;
  type: 'text' | 'offer' | 'counter_offer' | 'system';
  message?: string;
  text?: string;
  offer_price?: number;
  quantity?: number;
  offer?: {
    unit_price: number;
    quantity: number;
    note?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
    offer_by: 'UMKM' | 'DISTRIBUTOR';
  };
  created_at: any;
  read_by?: string[];
}

export interface Negotiation {
  id: string;
  negotiation_code: string;
  distributor_id: string;
  distributor_name: string;
  umkm_id: string;
  umkm_name: string;
  buyer_id?: string;
  buyer_name?: string;
  product_id: string;
  product_name: string;
  product_image: string;
  original_unit_price: number;
  requested_unit_price: number;
  agreed_unit_price?: number;
  quantity: number;
  status: 'open' | 'waiting_distributor' | 'waiting_buyer' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'checked_out' | 'converted_to_order';
  latest_message: string;
  latest_message_at: string;
  last_message?: string;
  last_message_at?: any;
  last_offer_price?: number;
  last_offer_by?: string;
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
      where(field, '==', userId)
    );

    const snap = await getDocs(q);
    const result: Negotiation[] = [];
    snap.forEach((d) => {
      result.push({ id: d.id, ...d.data() } as Negotiation);
    });

    // Sort in memory by latest_message_at or created_at descending to avoid composite index requirements
    result.sort((a, b) => {
      const timeA = new Date(a.latest_message_at || a.created_at || 0).getTime();
      const timeB = new Date(b.latest_message_at || b.created_at || 0).getTime();
      return timeB - timeA;
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

    const distributorId = product.distributor_id;
    const distributorName = product.distributor_name || 'Distributor';

    // 2. Check for an existing active negotiation room for same buyer + distributor + product
    const existingQ = query(
      collection(db, 'negotiations'),
      where('umkm_id', '==', umkmId),
      where('product_id', '==', productId)
    );
    const existingSnap = await getDocs(existingQ);
    let activeNeg: any = null;
    
    existingSnap.forEach((d) => {
      const data = d.data();
      const status = data.status || 'open';
      if (['open', 'waiting_distributor', 'waiting_buyer', 'accepted', 'pending', 'countered'].includes(status)) {
        activeNeg = { id: d.id, ...data };
      }
    });

    const timestamp = new Date().toISOString();

    if (activeNeg) {
      // Reuse existing open room
      const negRef = doc(db, 'negotiations', activeNeg.id);
      
      const batch = writeBatch(db);

      // Counter/expire any previous pending offers first
      const messagesRef = collection(db, 'negotiations', activeNeg.id, 'messages');
      const qMsg = query(messagesRef, where('type', '==', 'offer'));
      const messagesSnap = await getDocs(qMsg);
      messagesSnap.forEach((dMsg) => {
        const dataMsg = dMsg.data();
        if (dataMsg.offer && dataMsg.offer.status === 'pending') {
          batch.update(doc(db, 'negotiations', activeNeg.id, 'messages', dMsg.id), {
            'offer.status': 'countered'
          });
        }
      });

      // Update parent negotiation document
      batch.update(negRef, {
        status: 'waiting_distributor',
        quantity,
        requested_unit_price: requestedPrice,
        last_offer_price: requestedPrice,
        last_offer_by: 'UMKM',
        last_message: note || `Mengajukan penawaran baru sebesar Rp ${requestedPrice.toLocaleString('id-ID')}`,
        last_message_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create new offer message in messages subcollection
      const newMsgRef = doc(collection(db, 'negotiations', activeNeg.id, 'messages'));
      batch.set(newMsgRef, {
        type: 'offer',
        sender_id: umkmId,
        sender_role: 'UMKM',
        sender_name: umkmName,
        text: note || '',
        offer: {
          unit_price: requestedPrice,
          quantity,
          note: note || '',
          status: 'pending',
          offer_by: 'UMKM'
        },
        created_at: serverTimestamp()
      });

      await batch.commit();

      // Write audit log
      await createAuditLog({
        event: 'NEGOTIATION_COUNTERED',
        status: 'SUCCESS',
        user: umkmId,
        details: `UMKM ${umkmName} mengirim penawaran baru dalam negosiasi yang ada ${activeNeg.negotiation_code} (Jumlah: ${quantity}, Harga: Rp ${requestedPrice})`,
        targetCollection: 'negotiations',
        targetId: activeNeg.id
      });

      return { id: activeNeg.id, ...activeNeg, status: 'waiting_distributor' } as Negotiation;
    }

    // 3. Create a brand new negotiation room
    const randomCode = `NEG-${Math.floor(10000 + Math.random() * 90000)}`;

    const negData: Omit<Negotiation, 'id'> = {
      negotiation_code: randomCode,
      distributor_id: distributorId,
      distributor_name: distributorName,
      umkm_id: umkmId,
      buyer_id: umkmId, // compat
      umkm_name: umkmName,
      buyer_name: umkmName, // compat
      product_id: productId,
      product_name: product.name,
      product_image: product.image_url || '',
      original_unit_price: product.price || 0,
      requested_unit_price: requestedPrice,
      quantity,
      status: 'waiting_distributor',
      latest_message: note || 'Mengajukan negosiasi harga.',
      latest_message_at: timestamp, // resolved dynamically in client if TS read, kept string ISO compat
      created_by: umkmId,
      created_at: timestamp,
      updated_at: timestamp
    };

    // Add extra field properties for the prompt's required schema
    const savePayload = {
      ...negData,
      last_message: note || 'Mengajukan negosiasi harga.',
      last_offer_price: requestedPrice,
      last_offer_by: 'UMKM',
      last_message_at: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const negRef = await addDoc(collection(db, 'negotiations'), savePayload);

    // Create initial offer message
    await addDoc(collection(db, 'negotiations', negRef.id, 'messages'), {
      type: 'offer',
      sender_id: umkmId,
      sender_role: 'UMKM',
      sender_name: umkmName,
      text: note || '',
      offer: {
        unit_price: requestedPrice,
        quantity,
        note: note || '',
        status: 'pending',
        offer_by: 'UMKM'
      },
      created_at: serverTimestamp()
    });

    // Create notification document in Firestore for distributor
    await addDoc(collection(db, 'notifications'), {
      user_id: distributorId,
      title: 'Negosiasi Baru',
      message: `UMKM ${umkmName} memulai negosiasi baru untuk produk ${product.name}.`,
      type: 'info',
      is_read: false,
      created_at: serverTimestamp()
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
    senderName: string,
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
    if (['accepted', 'rejected', 'cancelled', 'checked_out'].includes(negData.status)) {
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

    const batch = writeBatch(db);

    // 1. Counter/expire any previous pending offers
    const messagesRef = collection(db, 'negotiations', negotiationId, 'messages');
    const qMsg = query(messagesRef, where('type', '==', 'offer'));
    const messagesSnap = await getDocs(qMsg);
    messagesSnap.forEach((dMsg) => {
      const dataMsg = dMsg.data();
      if (dataMsg.offer && dataMsg.offer.status === 'pending') {
        batch.update(doc(db, 'negotiations', negotiationId, 'messages', dMsg.id), {
          'offer.status': 'countered'
        });
      }
    });

    // 2. Update parent negotiation status & details
    const newStatus = senderRole === 'UMKM' ? 'waiting_distributor' : 'waiting_buyer';
    batch.update(negRef, {
      status: newStatus,
      requested_unit_price: counterPrice,
      quantity,
      last_offer_price: counterPrice,
      last_offer_by: senderRole,
      last_message: message || `${senderRole === 'UMKM' ? 'Pembeli' : 'Distributor'} mengirim penawaran balik.`,
      last_message_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // 3. Create counter-offer message in messages subcollection
    const newMsgRef = doc(collection(db, 'negotiations', negotiationId, 'messages'));
    batch.set(newMsgRef, {
      type: 'offer',
      sender_id: senderId,
      sender_role: senderRole,
      sender_name: senderName,
      text: message || '',
      offer: {
        unit_price: counterPrice,
        quantity,
        note: message || '',
        status: 'pending',
        offer_by: senderRole
      },
      created_at: serverTimestamp()
    });

    const recipientId = senderRole === 'UMKM' ? negData.distributor_id : negData.umkm_id;
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      user_id: recipientId,
      title: 'Penawaran Balik',
      message: `${senderName} mengirim penawaran balik untuk ${negData.product_name}.`,
      type: 'info',
      is_read: false,
      created_at: serverTimestamp()
    });

    await batch.commit();

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_COUNTERED',
      status: 'SUCCESS',
      user: senderName,
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
    messageId: string,
    userId: string,
    userRole: 'UMKM' | 'DISTRIBUTOR',
    userName: string
  ): Promise<void> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }
    const negData = negSnap.data() as Negotiation;

    // Transition checks
    if (['accepted', 'checked_out', 'cancelled'].includes(negData.status)) {
      throw new Error('Negosiasi sudah disepakati, dibatalkan, atau selesai.');
    }

    const msgRef = doc(db, 'negotiations', negotiationId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) {
      throw new Error('Pesan penawaran tidak ditemukan.');
    }
    const msgData = msgSnap.data();
    if (!msgData.offer || msgData.offer.status !== 'pending') {
      throw new Error('Penawaran ini sudah tidak aktif atau sudah ditanggapi.');
    }

    // Safety: The sender of an offer cannot accept their own offer
    if (msgData.offer.offer_by === userRole) {
      throw new Error('Anda tidak dapat menyetujui penawaran Anda sendiri.');
    }

    const agreedPrice = msgData.offer.unit_price;
    const agreedQuantity = msgData.offer.quantity;

    // Revalidate product status & stock
    const productRef = doc(db, 'products', negData.product_id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produk tidak ditemukan.');
    }
    const product = productSnap.data();
    if (!product.is_active) {
      throw new Error('Produk sedang tidak aktif.');
    }
    if (agreedQuantity > (product.stock || 0)) {
      throw new Error(`Stok produk tidak mencukupi untuk disetujui. Tersedia: ${product.stock || 0}.`);
    }

    const batch = writeBatch(db);

    // 1. Update the accepted offer status
    batch.update(msgRef, {
      'offer.status': 'accepted'
    });

    // 2. Update parent negotiation document
    batch.update(negRef, {
      status: 'accepted',
      agreed_unit_price: agreedPrice,
      quantity: agreedQuantity,
      last_message: 'Penawaran disetujui. Harga akhir telah disepakati.',
      last_message_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // 3. Add system message
    const sysMsgRef = doc(collection(db, 'negotiations', negotiationId, 'messages'));
    batch.set(sysMsgRef, {
      type: 'system',
      sender_id: userId,
      sender_role: 'SYSTEM',
      sender_name: 'SYSTEM',
      text: `Tawaran disetujui oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}. Harga akhir disepakati: Rp ${agreedPrice.toLocaleString('id-ID')} (Qty: ${agreedQuantity}).`,
      created_at: serverTimestamp()
    });

    const recipientId = userRole === 'UMKM' ? negData.distributor_id : negData.umkm_id;
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      user_id: recipientId,
      title: 'Negosiasi Disetujui',
      message: `Penawaran untuk produk ${negData.product_name} disetujui oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}.`,
      type: 'success',
      is_read: false,
      created_at: serverTimestamp()
    });

    await batch.commit();

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_ACCEPTED',
      status: 'SUCCESS',
      user: userName,
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
    messageId: string,
    userId: string,
    userRole: 'UMKM' | 'DISTRIBUTOR',
    userName: string,
    reason: string
  ): Promise<void> {
    const negRef = doc(db, 'negotiations', negotiationId);
    const negSnap = await getDoc(negRef);
    if (!negSnap.exists()) {
      throw new Error('Data negosiasi tidak ditemukan.');
    }
    const negData = negSnap.data() as Negotiation;

    const msgRef = doc(db, 'negotiations', negotiationId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) {
      throw new Error('Pesan penawaran tidak ditemukan.');
    }
    const msgData = msgSnap.data();
    if (!msgData.offer || msgData.offer.status !== 'pending') {
      throw new Error('Penawaran ini sudah tidak aktif atau sudah ditanggapi.');
    }

    if (msgData.offer.offer_by === userRole) {
      throw new Error('Anda tidak dapat menolak penawaran Anda sendiri.');
    }

    const batch = writeBatch(db);

    // 1. Update the rejected offer status
    batch.update(msgRef, {
      'offer.status': 'rejected'
    });

    // 2. Update main negotiation document
    batch.update(negRef, {
      status: 'rejected',
      last_message: `Penawaran ditolak oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}.${reason ? ` Alasan: ${reason}` : ''}`,
      last_message_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // 3. Add system message
    const sysMsgRef = doc(collection(db, 'negotiations', negotiationId, 'messages'));
    batch.set(sysMsgRef, {
      type: 'system',
      sender_id: userId,
      sender_role: 'SYSTEM',
      sender_name: 'SYSTEM',
      text: `Tawaran ditolak oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}.${reason ? ` Alasan: ${reason}` : ''}`,
      created_at: serverTimestamp()
    });

    const recipientId = userRole === 'UMKM' ? negData.distributor_id : negData.umkm_id;
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      user_id: recipientId,
      title: 'Negosiasi Ditolak',
      message: `Penawaran untuk produk ${negData.product_name} ditolak oleh ${userRole === 'UMKM' ? 'Pembeli' : 'Distributor'}.${reason ? ` Alasan: ${reason}` : ''}`,
      type: 'error',
      is_read: false,
      created_at: serverTimestamp()
    });

    await batch.commit();

    // Write audit log
    await createAuditLog({
      event: 'NEGOTIATION_REJECTED',
      status: 'BLOCK',
      user: userName,
      details: `Penawaran negosiasi ${negData.negotiation_code} ditolak oleh ${userRole}. Alasan: ${reason || '-'}`,
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

    if (negData.umkm_id !== userId) {
      throw new Error('Akses ditolak. Hanya pembeli yang dapat membatalkan negosiasi.');
    }

    // Transition checks
    if (['accepted', 'checked_out', 'cancelled'].includes(negData.status)) {
      throw new Error('Negosiasi sudah berada di status final.');
    }

    const batch = writeBatch(db);

    // Update main document
    batch.update(negRef, {
      status: 'cancelled',
      last_message: 'Negosiasi dibatalkan oleh pembeli.',
      last_message_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // Add system message
    const sysMsgRef = doc(collection(db, 'negotiations', negotiationId, 'messages'));
    batch.set(sysMsgRef, {
      type: 'system',
      sender_id: userId,
      sender_role: 'SYSTEM',
      sender_name: 'SYSTEM',
      text: 'Negosiasi dibatalkan oleh pembeli.',
      created_at: serverTimestamp()
    });

    await batch.commit();

    // Write audit log
    const userEmail = negData.umkm_name || userId;
    await createAuditLog({
      event: 'NEGOTIATION_CANCELLED',
      status: 'WARNING',
      user: userEmail,
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
      sender_name: senderRole === 'SYSTEM' ? 'SYSTEM' : (senderRole === 'UMKM' ? 'Pembeli' : 'Distributor'),
      type: 'text',
      text: text, // structured schema property
      message: text, // legacy compat
      created_at: serverTimestamp()
    });

    // Update latest message
    await updateDoc(doc(db, 'negotiations', negotiationId), {
      last_message: text,
      latest_message: text, // legacy compat
      last_message_at: serverTimestamp(),
      latest_message_at: timestamp, // legacy compat
      updated_at: serverTimestamp()
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
    if (negData.status === 'checked_out' || negData.status === 'converted_to_order' || negData.converted_order_id) {
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
    if (!distSnap || typeof distSnap.exists !== 'function' || !distSnap.exists()) {
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

    const platformFeeRate = await calculatePlatformFeeRate(negData.distributor_id);
    const platformFeeAmount = Math.round((totalAmount * platformFeeRate) / 100);
    const distributorNetAmount = totalAmount - platformFeeAmount;

    // Map payment method to lowercase standard keys for UAT
    const mappedPaymentMethod = paymentMethod.includes('QRIS') 
      ? 'qris' 
      : paymentMethod.includes('COD') 
        ? 'cod' 
        : paymentMethod.includes('Transfer') 
          ? 'bank_transfer' 
          : 'manual';

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
      payment_status: 'pending' as const,
      escrow_status: 'none' as const,
      status: 'pending' as const,
      payment_method: mappedPaymentMethod,
      shipping_cost: 0,
      service_fee: 0,
      platform_fee: platformFeeAmount,
      platform_fee_rate: platformFeeRate,
      platform_fee_amount: platformFeeAmount,
      distributor_net_amount: distributorNetAmount,
      negotiation_id: negotiationId,
      original_unit_price: negData.original_unit_price,
      agreed_unit_price: agreedPrice,
      created_at: timestamp,
      updated_at: timestamp
    };

    const batch = writeBatch(db);

    // 8. Create the order
    const orderRef = doc(collection(db, 'orders'));
    batch.set(orderRef, orderData);

    // 9. Update negotiation status to checked_out and converted_to_order compat
    batch.update(negRef, {
      status: 'checked_out',
      converted_order_id: orderRef.id,
      updated_at: serverTimestamp()
    });

    // 10. Add system message in the negotiation room
    const sysMsgRef = doc(collection(db, 'negotiations', negotiationId, 'messages'));
    batch.set(sysMsgRef, {
      type: 'system',
      sender_id: buyerId,
      sender_role: 'SYSTEM',
      sender_name: 'SYSTEM',
      text: `Negosiasi dikonversi menjadi pesanan (Order Code: ${orderCode}, Order ID: ${orderRef.id}).`,
      created_at: serverTimestamp()
    });

    await batch.commit();

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
