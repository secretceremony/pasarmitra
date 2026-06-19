import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface AuditLogData {
  event: string;
  status: 'SUCCESS' | 'WARNING' | 'BLOCK';
  user: string;
  details: string;
  ip?: string;
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
