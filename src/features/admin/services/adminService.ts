import { collection, addDoc, writeBatch, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface AuditLogData {
  event: string;
  status: 'SUCCESS' | 'WARNING' | 'BLOCK';
  user: string;
  details: string;
  ip?: string;
  targetCollection?: string;
  targetId?: string;
}

export const createAuditLog = async (logData: Omit<AuditLogData, 'ip'>) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const docData = {
      ...logData,
      timestamp,
      ip: '127.0.0.1', // Default IP lokal untuk simulasi
      created_at: new Date().toISOString()
    };

    await addDoc(collection(db, 'audit_logs'), docData);
  } catch (error) {
    console.error("Gagal menulis log audit ke Firestore:", error);
  }
};

export interface DisputeUpdatePayload {
  admin_note?: string;
  rejection_reason?: string;
  refund_amount?: number;
  refund_note?: string;
}

export const updateDisputeStatus = async (
  disputeId: string,
  action: 'review' | 'refund' | 'reject' | 'resolve',
  adminId: string,
  payload: DisputeUpdatePayload
) => {
  const disputeRef = doc(db, 'disputes', disputeId);
  const disputeSnap = await getDoc(disputeRef);
  if (!disputeSnap.exists()) {
    throw new Error('Data komplain tidak ditemukan.');
  }

  const disputeData = disputeSnap.data();
  const orderId = disputeData.order_id || disputeData.orderId;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  let newStatus = 'OPEN';
  let resolutionType = '';
  let auditEvent = '';
  let auditDetails = '';

  const disputeUpdates: any = {
    updated_at: now,
    reviewed_by: adminId,
    reviewed_at: now,
  };

  if (payload.admin_note !== undefined) {
    disputeUpdates.admin_note = payload.admin_note;
  }

  const orderUpdates: any = {
    updated_at: new Date().toISOString() // Orders use ISO string format
  };

  switch (action) {
    case 'review':
      newStatus = 'IN_MEDIATION';
      orderUpdates.dispute_status = 'IN_MEDIATION';
      auditEvent = 'DISPUTE_UNDER_REVIEW';
      auditDetails = `Mengubah status sengketa ${disputeId} menjadi mediasi/peninjauan.`;
      break;

    case 'refund':
      newStatus = 'RESOLVED';
      resolutionType = 'REFUNDED';
      disputeUpdates.resolution_type = 'REFUNDED';
      disputeUpdates.refund_amount = payload.refund_amount || 0;
      disputeUpdates.refund_note = payload.refund_note || '';
      disputeUpdates.refunded_at = now;
      
      orderUpdates.dispute_status = 'RESOLVED';
      orderUpdates.refund_status = 'refunded';
      orderUpdates.payment_status = 'refunded'; // Keep payment status in sync
      
      auditEvent = 'DISPUTE_REFUNDED';
      auditDetails = `Menyetujui refund sengketa ${disputeId} sebesar ${payload.refund_amount || 0}. Catatan: ${payload.refund_note || ''}`;
      break;

    case 'reject':
      newStatus = 'RESOLVED';
      resolutionType = 'REJECTED';
      disputeUpdates.resolution_type = 'REJECTED';
      disputeUpdates.rejection_reason = payload.rejection_reason || '';
      
      orderUpdates.dispute_status = 'RESOLVED';
      orderUpdates.refund_status = 'rejected';
      
      auditEvent = 'DISPUTE_REJECTED';
      auditDetails = `Menolak klaim sengketa ${disputeId}. Alasan: ${payload.rejection_reason || ''}`;
      break;

    case 'resolve':
      newStatus = 'RESOLVED';
      resolutionType = 'RESOLVED';
      disputeUpdates.resolution_type = 'RESOLVED';
      
      orderUpdates.dispute_status = 'RESOLVED';
      
      auditEvent = 'DISPUTE_RESOLVED';
      auditDetails = `Menyelesaikan sengketa ${disputeId} tanpa refund.`;
      break;

    default:
      throw new Error(`Aksi '${action}' tidak dikenali.`);
  }

  disputeUpdates.status = newStatus;

  // Update dispute document
  batch.update(disputeRef, disputeUpdates);

  // Update linked order document if it exists
  if (orderId) {
    const orderRef = doc(db, 'orders', orderId);
    batch.update(orderRef, orderUpdates);
  }

  await batch.commit();

  // Create audit log
  await createAuditLog({
    event: auditEvent,
    status: action === 'reject' ? 'BLOCK' : action === 'review' ? 'WARNING' : 'SUCCESS',
    user: adminId,
    details: auditDetails,
    targetCollection: 'disputes',
    targetId: disputeId
  });
};
