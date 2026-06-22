/**
 * statusUtils.ts — Centralized status label mappings for PasarMitra
 */

export const getStatusLabel = (status: string | null | undefined): string => {
  if (!status) return 'Belum Diverifikasi';

  const s = status.trim().toUpperCase();

  switch (s) {
    case 'VERIFIED':
    case 'APPROVED':
      return 'Terverifikasi';
    case 'REJECTED':
      return 'Ditolak';
    case 'PENDING':
    case 'PENDING_REVIEW':
      return 'Direview';
    case 'NEEDS_REVISION':
      return 'Perlu Revisi';
    case 'INACTIVE':
      return 'Tidak Aktif';
    case 'SUSPENDED':
      return 'Ditangguhkan';
    case 'ACTIVE':
      return 'Aktif';
    case 'DRAFT':
      return 'Draf';
    case 'ESCALATED':
      return 'Dieskalasikan';
    default:
      return status;
  }
};

export const getVerificationStatusLabel = (user: any): string => {
  if (!user) return 'Belum Diverifikasi';
  if (user.role !== 'DISTRIBUTOR') return '-';
  
  if (user.is_verified) return 'Terverifikasi';
  
  const status = (user.verification_status || '').toUpperCase();
  if (status === 'VERIFIED' || status === 'APPROVED') return 'Terverifikasi';
  if (status === 'REJECTED') return 'Ditolak';
  if (status === 'PENDING_REVIEW' || status === 'PENDING') return 'Direview';
  if (status === 'NEEDS_REVISION') return 'Perlu Revisi';
  if (status === 'ESCALATED') return 'Dieskalasikan';
  
  return 'Belum Diverifikasi';
};

export const getAccountStatusLabel = (user: any): string => {
  if (!user) return 'Tidak Aktif';
  if (user.is_active === false) return 'Dihapus';
  if (user.is_suspended) return 'Ditangguhkan';
  if (user.is_inactive || user.status === 'INACTIVE') return 'Tidak Aktif';
  return 'Aktif';
};
