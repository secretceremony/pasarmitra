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
    // Store as ISO string; display formatting happens in the UI layer via formatDateTime
    const timestamp = new Date().toISOString();

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

  let orderData: any = null;
  if (orderId) {
    const orderSnap = await getDoc(doc(db, 'orders', orderId));
    if (orderSnap && typeof orderSnap.exists === 'function' && orderSnap.exists()) {
      orderData = orderSnap.data();
    }
  }

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
      
      // If escrow was already released, we must create a debit refund_adjustment transaction
      if (orderData && orderData.escrow_status === 'released') {
        const txRef = doc(db, 'wallet_transactions', `refund_adjust_${orderId}`);
        const gross = orderData.subtotal || orderData.total_amount;
        const feeRate = orderData.platform_fee_rate ?? 1.5;
        const feeAmount = orderData.platform_fee_amount ?? Math.round(gross * feeRate / 100);
        const net = orderData.distributor_net_amount ?? (gross - feeAmount);

        batch.set(txRef, {
          id: `refund_adjust_${orderId}`,
          distributor_id: orderData.distributor_id,
          order_id: orderId,
          order_code: orderData.order_code || '',
          type: 'refund_adjustment',
          direction: 'debit',
          gross_amount: gross,
          platform_fee_rate: feeRate,
          platform_fee_amount: feeAmount,
          net_amount: net,
          status: 'completed',
          created_at: serverTimestamp()
        });

        orderUpdates.escrow_status = 'released'; // remains released, but adjusted via ledger
      } else {
        // Escrow not released yet, so we mark escrow as refunded and do not credit wallet
        orderUpdates.escrow_status = 'refunded';
      }
      
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

      // Check if we should release escrow now (if status is delivered, paid and not released yet)
      if (orderData && orderData.status === 'delivered' && orderData.payment_status === 'paid' && orderData.escrow_status !== 'released') {
        orderUpdates.escrow_status = 'released';
        orderUpdates.released_at = new Date().toISOString();

        const txRef = doc(db, 'wallet_transactions', `release_${orderId}`);
        const gross = orderData.subtotal || orderData.total_amount;
        const feeRate = orderData.platform_fee_rate ?? 1.5;
        const feeAmount = orderData.platform_fee_amount ?? Math.round(gross * feeRate / 100);
        const net = orderData.distributor_net_amount ?? (gross - feeAmount);

        batch.set(txRef, {
          id: `release_${orderId}`,
          distributor_id: orderData.distributor_id,
          order_id: orderId,
          order_code: orderData.order_code || '',
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
      
      auditEvent = 'DISPUTE_REJECTED';
      auditDetails = `Menolak klaim sengketa ${disputeId}. Alasan: ${payload.rejection_reason || ''}`;
      break;

    case 'resolve':
      newStatus = 'RESOLVED';
      resolutionType = 'RESOLVED';
      disputeUpdates.resolution_type = 'RESOLVED';
      
      orderUpdates.dispute_status = 'RESOLVED';

      // Check if we should release escrow now
      if (orderData && orderData.status === 'delivered' && orderData.payment_status === 'paid' && orderData.escrow_status !== 'released') {
        orderUpdates.escrow_status = 'released';
        orderUpdates.released_at = new Date().toISOString();

        const txRef = doc(db, 'wallet_transactions', `release_${orderId}`);
        const gross = orderData.subtotal || orderData.total_amount;
        const feeRate = orderData.platform_fee_rate ?? 1.5;
        const feeAmount = orderData.platform_fee_amount ?? Math.round(gross * feeRate / 100);
        const net = orderData.distributor_net_amount ?? (gross - feeAmount);

        batch.set(txRef, {
          id: `release_${orderId}`,
          distributor_id: orderData.distributor_id,
          order_id: orderId,
          order_code: orderData.order_code || '',
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
