import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createAuditLog } from '../../admin/services/adminService';

export interface DisputeResponse {
  status: "accepted" | "rejected" | "needs_admin_review";
  message: string;
  evidence_urls?: string[];
  responded_at: Timestamp;
  responded_by: string;
}

export interface DisputeAdminDecision {
  decision: "approve_refund" | "reject_claim" | "replacement_required" | "mediation";
  notes: string;
  refund_amount?: number;
  decided_at: Timestamp;
  decided_by: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  orderId?: string; // compat
  order_code: string;
  invoiceId?: string; // compat
  buyer_id: string;
  buyer_name: string;
  claimant?: string; // compat
  distributor_id: string;
  distributor_name: string;
  defendant?: string; // compat
  status: "submitted" | "awaiting_distributor_response" | "under_admin_review" | "approved" | "rejected" | "resolved" | "cancelled" | "OPEN" | "IN_MEDIATION" | "RESOLVED";
  type: "damaged_item" | "wrong_item" | "missing_quantity" | "not_received" | "late_delivery" | "other";
  title: string;
  reason?: string; // compat
  description: string;
  requested_resolution: "full_refund" | "partial_refund" | "replacement" | "discussion";
  requested_refund_amount?: number;
  evidence_urls: string[];
  evidence_url?: string; // compat
  buyer_notes?: string;
  evidence_note?: string; // compat
  amount?: string; // compat
  distributor_response?: DisputeResponse;
  admin_decision?: DisputeAdminDecision;
  created_at: any;
  updated_at: any;
  created?: string; // compat
  
  // legacy compat fields for resolution display
  resolution_type?: string;
  refund_amount?: number;
  refund_note?: string;
  refunded_at?: any;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: any;
  admin_note?: string;
}

export const disputeService = {
  createDispute: async (data: {
    order_id: string;
    buyer_id: string;
    buyer_name: string;
    type: Dispute['type'];
    title: string;
    description: string;
    requested_resolution: Dispute['requested_resolution'];
    requested_refund_amount?: number;
    evidence_urls: string[];
    buyer_notes?: string;
  }) => {
    // 1. Fetch order details to validate
    const orderRef = doc(db, 'orders', data.order_id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order tidak ditemukan');
    }
    const orderData = orderSnap.data();

    // 2. Access control and status check
    if (orderData.buyer_id !== data.buyer_id) {
      throw new Error('Anda tidak memiliki wewenang untuk mengajukan komplain pada pesanan ini.');
    }
    const allowedStatuses = ['shipped', 'delivered'];
    if (!allowedStatuses.includes(orderData.status)) {
      throw new Error('Komplain hanya dapat diajukan jika pesanan telah dikirim (shipped) atau selesai (delivered).');
    }

    if (orderData.payment_status === 'unpaid' || orderData.status === 'cancelled') {
      throw new Error('Pesanan belum dibayar atau sudah dibatalkan.');
    }

    // Check refund amount doesn't exceed order total
    if (data.requested_refund_amount && data.requested_refund_amount > orderData.total_amount) {
      throw new Error('Jumlah pengembalian dana tidak boleh melebihi total pembayaran pesanan.');
    }

    // 3. Check for active dispute
    const disputesRef = collection(db, 'disputes');
    const q = query(disputesRef, where('order_id', '==', data.order_id));
    const querySnapshot = await getDocs(q);
    const hasActiveDispute = querySnapshot.docs.some(docSnap => {
      const disp = docSnap.data();
      return !['approved', 'rejected', 'resolved', 'cancelled', 'RESOLVED'].includes(disp.status);
    });

    if (hasActiveDispute) {
      throw new Error('Sengketa aktif untuk pesanan ini sudah ada.');
    }

    const disputeId = doc(collection(db, 'disputes')).id;
    const now = serverTimestamp();

    // Legacy fields for backward compatibility with existing DisputeManagement.tsx
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(orderData.total_amount);

    const disputeDoc = {
      id: disputeId,
      order_id: data.order_id,
      orderId: data.order_id, // compat
      order_code: orderData.order_code || '',
      invoiceId: orderData.order_code || '', // compat
      buyer_id: data.buyer_id,
      buyer_name: data.buyer_name,
      claimant: data.buyer_name, // compat
      distributor_id: orderData.distributor_id,
      distributor_name: orderData.distributor_name || 'Distributor',
      defendant: orderData.distributor_name || 'Distributor', // compat
      
      status: 'submitted', // new status
      type: data.type,
      title: data.title,
      reason: data.title, // compat
      description: data.description,
      requested_resolution: data.requested_resolution,
      requested_refund_amount: data.requested_refund_amount || 0,
      evidence_urls: data.evidence_urls,
      evidence_url: data.evidence_urls[0] || '', // compat
      buyer_notes: data.buyer_notes || '',
      evidence_note: data.buyer_notes || '', // compat
      amount: formattedAmount, // compat
      created_at: now,
      updated_at: now,
      created: 'Baru saja' // compat
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'disputes', disputeId), disputeDoc);
    
    // Update order with active dispute status
    batch.update(orderRef, {
      dispute_status: 'submitted',
      updated_at: new Date().toISOString()
    });

    await batch.commit();

    // Create Audit Log
    const userEmail = orderData.buyer_email || 'buyer@pasarmitra.com';
    await createAuditLog({
      event: 'DISPUTE_CREATED',
      status: 'SUCCESS',
      user: userEmail,
      details: `Mengajukan komplain/sengketa #${disputeDoc.order_code || disputeId.slice(0, 8)}: ${data.title}`,
      targetCollection: 'disputes',
      targetId: disputeId
    });

    return {
      ...disputeDoc,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
  },

  getDisputeByOrderId: async (orderId: string) => {
    const q = query(collection(db, 'disputes'), where('order_id', '==', orderId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Dispute;
  },

  getDisputesByBuyer: async (buyerId: string) => {
    const q = query(
      collection(db, 'disputes'), 
      where('buyer_id', '==', buyerId)
    );
    const snap = await getDocs(q);
    const list: Dispute[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Dispute);
    });
    list.sort((a, b) => {
      const aTime = a.created_at?.toDate?.()?.getTime() || 0;
      const bTime = b.created_at?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    return list;
  },

  getDisputesByDistributor: async (distributorId: string) => {
    const q = query(
      collection(db, 'disputes'), 
      where('distributor_id', '==', distributorId)
    );
    const snap = await getDocs(q);
    const list: Dispute[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Dispute);
    });
    list.sort((a, b) => {
      const aTime = a.created_at?.toDate?.()?.getTime() || 0;
      const bTime = b.created_at?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    return list;
  },

  getDisputesForAdmin: async () => {
    const snap = await getDocs(collection(db, 'disputes'));
    const list: Dispute[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Dispute);
    });
    list.sort((a, b) => {
      const aTime = a.created_at?.toDate?.()?.getTime() || 0;
      const bTime = b.created_at?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    return list;
  },

  respondToDispute: async (
    disputeId: string, 
    response: {
      status: "accepted" | "rejected" | "needs_admin_review";
      message: string;
      evidence_urls?: string[];
      responded_by: string;
    }
  ) => {
    const disputeRef = doc(db, 'disputes', disputeId);
    const disputeSnap = await getDoc(disputeRef);
    if (!disputeSnap.exists()) {
      throw new Error('Data komplain tidak ditemukan.');
    }
    const disputeData = disputeSnap.data();

    // Recommended flow: All accepted/rejected/needs_admin_review distributor responses go to under_admin_review first for UAT safety.
    const newStatus = 'under_admin_review';

    const distributor_response = {
      status: response.status,
      message: response.message,
      evidence_urls: response.evidence_urls || [],
      responded_at: Timestamp.now(),
      responded_by: response.responded_by
    };

    const batch = writeBatch(db);
    batch.update(disputeRef, {
      status: newStatus,
      distributor_response,
      updated_at: serverTimestamp()
    });

    if (disputeData.order_id) {
      batch.update(doc(db, 'orders', disputeData.order_id), {
        dispute_status: newStatus,
        updated_at: new Date().toISOString()
      });
    }

    await batch.commit();

    // Create audit log
    await createAuditLog({
      event: 'DISPUTE_DISTRIBUTOR_RESPONDED',
      status: response.status === 'rejected' ? 'WARNING' : 'SUCCESS',
      user: response.responded_by,
      details: `Distributor menanggapi sengketa ${disputeId} dengan keputusan: ${response.status}. Alasan: ${response.message}`,
      targetCollection: 'disputes',
      targetId: disputeId
    });
  },

  updateDisputeStatus: async (disputeId: string, status: Dispute['status']) => {
    const disputeRef = doc(db, 'disputes', disputeId);
    const disputeSnap = await getDoc(disputeRef);
    if (!disputeSnap.exists()) {
      throw new Error('Data komplain tidak ditemukan.');
    }
    const disputeData = disputeSnap.data();

    const batch = writeBatch(db);
    batch.update(disputeRef, {
      status,
      updated_at: serverTimestamp()
    });

    if (disputeData.order_id) {
      batch.update(doc(db, 'orders', disputeData.order_id), {
        dispute_status: status,
        updated_at: new Date().toISOString()
      });
    }

    await batch.commit();
  },

  resolveDispute: async (
    disputeId: string, 
    adminDecision: {
      decision: "approve_refund" | "reject_claim" | "replacement_required" | "mediation";
      notes: string;
      refund_amount?: number;
      decided_by: string;
    }
  ) => {
    const disputeRef = doc(db, 'disputes', disputeId);
    const disputeSnap = await getDoc(disputeRef);
    if (!disputeSnap.exists()) {
      throw new Error('Data komplain tidak ditemukan.');
    }
    const disputeData = disputeSnap.data();

    let newDisputeStatus: Dispute['status'] = 'resolved';
    let refundStatus = 'none';
    let paymentStatus = '';

    if (adminDecision.decision === 'approve_refund') {
      newDisputeStatus = 'approved';
      refundStatus = 'refunded';
      paymentStatus = 'refunded';
    } else if (adminDecision.decision === 'reject_claim') {
      newDisputeStatus = 'rejected';
      refundStatus = 'rejected';
    } else if (adminDecision.decision === 'replacement_required') {
      newDisputeStatus = 'resolved';
    } else if (adminDecision.decision === 'mediation') {
      newDisputeStatus = 'under_admin_review'; // keeps it under admin review/mediation
    }

    const admin_decision = {
      decision: adminDecision.decision,
      notes: adminDecision.notes,
      refund_amount: adminDecision.refund_amount || 0,
      decided_at: Timestamp.now(),
      decided_by: adminDecision.decided_by
    };

    const batch = writeBatch(db);
    
    // updates for backward compatibility with existing DisputeManagement.tsx
    const compatUpdates: any = {};
    if (adminDecision.decision === 'approve_refund') {
      compatUpdates.resolution_type = 'REFUNDED';
      compatUpdates.refund_amount = adminDecision.refund_amount || 0;
      compatUpdates.refund_note = adminDecision.notes;
      compatUpdates.refunded_at = serverTimestamp();
      compatUpdates.reviewed_by = adminDecision.decided_by;
      compatUpdates.reviewed_at = serverTimestamp();
    } else if (adminDecision.decision === 'reject_claim') {
      compatUpdates.resolution_type = 'REJECTED';
      compatUpdates.rejection_reason = adminDecision.notes;
      compatUpdates.reviewed_by = adminDecision.decided_by;
      compatUpdates.reviewed_at = serverTimestamp();
    } else if (adminDecision.decision === 'mediation') {
      // mediation keeps it in mediation or review state
      compatUpdates.admin_note = adminDecision.notes;
      compatUpdates.reviewed_by = adminDecision.decided_by;
      compatUpdates.reviewed_at = serverTimestamp();
    }

    batch.update(disputeRef, {
      status: newDisputeStatus,
      admin_decision,
      updated_at: serverTimestamp(),
      ...compatUpdates
    });

    if (disputeData.order_id) {
      const orderUpdates: any = {
        dispute_status: newDisputeStatus,
        updated_at: new Date().toISOString()
      };
      if (refundStatus !== 'none') {
        orderUpdates.refund_status = refundStatus;
      }
      if (paymentStatus) {
        orderUpdates.payment_status = paymentStatus;
      }
      batch.update(doc(db, 'orders', disputeData.order_id), orderUpdates);
    }

    await batch.commit();

    // Create audit log
    let auditEvent = 'DISPUTE_RESOLVED';
    let auditDetails = `Menyelesaikan sengketa ${disputeId}`;

    if (adminDecision.decision === 'approve_refund') {
      auditEvent = 'DISPUTE_REFUNDED';
      auditDetails = `Menyetujui refund sengketa ${disputeId} sebesar ${adminDecision.refund_amount || 0}. Catatan: ${adminDecision.notes}`;
    } else if (adminDecision.decision === 'reject_claim') {
      auditEvent = 'DISPUTE_REJECTED';
      auditDetails = `Menolak klaim sengketa ${disputeId}. Alasan: ${adminDecision.notes}`;
    } else if (adminDecision.decision === 'mediation') {
      auditEvent = 'DISPUTE_UNDER_REVIEW';
      auditDetails = `Mengubah status sengketa ${disputeId} menjadi mediasi/peninjauan. Catatan: ${adminDecision.notes}`;
    }

    await createAuditLog({
      event: auditEvent,
      status: adminDecision.decision === 'reject_claim' ? 'BLOCK' : 'SUCCESS',
      user: adminDecision.decided_by,
      details: auditDetails,
      targetCollection: 'disputes',
      targetId: disputeId
    });
  }
};
