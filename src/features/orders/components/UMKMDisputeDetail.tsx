import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../../store/use-auth-store';
import { disputeService, Dispute } from '../services/disputeService';
import { formatDateTime } from '../../../lib/dateUtils';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Button } from '../../../components/ui/button';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export const UMKMDisputeDetail = () => {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!disputeId) return;
    setIsLoading(true);
    
    // Set up realtime snapshot listener so updates are immediate
    const unsub = onSnapshot(doc(db, 'disputes', disputeId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<Dispute, 'id'>;
        setDispute({ id: docSnap.id, ...data } as Dispute);
        setError(null);
      } else {
        setError('Detail komplain tidak ditemukan.');
      }
      setIsLoading(false);
    }, (err) => {
      console.error('Gagal mengambil detail komplain:', err);
      setError('Gagal memuat detail komplain.');
      setIsLoading(false);
    });

    return () => unsub();
  }, [disputeId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black text-xs uppercase tracking-widest">Memuat Detail Komplain...</p>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">{error || 'Komplain Tidak Ditemukan'}</h2>
        </div>
        <Button 
          onClick={() => navigate('/umkm/disputes')}
          className="h-12 px-8 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform"
        >
          <ArrowLeft size={16} className="mr-2" />
          Kembali ke Daftar Komplain
        </Button>
      </div>
    );
  }

  // Access control check: Buyer can only view their own disputes
  if (dispute.buyer_id !== user?.id) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Akses Dibatasi</h2>
          <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat komplain ini.</p>
        </div>
        <Button onClick={() => navigate('/umkm/disputes')} className="h-12 px-8 rounded-xl font-bold">
          Kembali
        </Button>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Diajukan';
      case 'awaiting_distributor_response':
        return 'Menunggu Respon Distributor';
      case 'under_admin_review':
        return 'Ditinjau Admin';
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      case 'resolved':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      case 'OPEN':
        return 'Terbuka';
      case 'IN_MEDIATION':
        return 'Mediasi Admin';
      case 'RESOLVED':
        return 'Selesai';
      default:
        return status;
    }
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'info';
      case 'awaiting_distributor_response':
      case 'under_admin_review':
        return 'warning';
      case 'approved':
      case 'resolved':
      case 'RESOLVED':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getResolutionLabel = (res: string) => {
    switch (res) {
      case 'full_refund':
        return 'Refund Penuh';
      case 'partial_refund':
        return 'Refund Sebagian';
      case 'replacement':
        return 'Penggantian Barang';
      case 'discussion':
        return 'Diskusi dengan Distributor';
      default:
        return res;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'damaged_item':
        return 'Barang Rusak';
      case 'wrong_item':
        return 'Barang Tidak Sesuai';
      case 'missing_quantity':
        return 'Jumlah Kurang';
      case 'not_received':
        return 'Barang Tidak Diterima';
      case 'late_delivery':
        return 'Keterlambatan Pengiriman';
      default:
        return 'Lainnya';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-0">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/umkm/disputes')}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Komplain Saya</span>
        </button>
        <span className="font-mono text-xs text-muted-foreground font-bold">
          ID Komplain: {dispute.id}
        </span>
      </div>

      {/* Header Info */}
      <div className="p-6 bg-card border border-border/50 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{dispute.title}</h2>
            <StatusBadge type={getStatusType(dispute.status)} label={getStatusLabel(dispute.status)} />
          </div>
          <p className="text-xs text-muted-foreground font-bold">
            Tanggal Pengajuan: {formatDateTime(dispute.created_at)}
          </p>
        </div>
        <div className="z-10 shrink-0">
          <Button
            onClick={() => navigate(`/umkm/orders/${dispute.order_id}`)}
            variant="outline"
            className="h-10 px-4 rounded-xl font-bold text-xs"
          >
            Lihat Pesanan #{dispute.order_code || dispute.order_id.slice(0, 8)}
          </Button>
        </div>
      </div>

      {/* Core Complaint Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-card border border-border/50 rounded-2xl shadow-lg space-y-6">
            <h3 className="text-lg font-black flex items-center gap-2 border-b border-border/30 pb-3">
              <FileText className="text-rose-500" size={20} />
              Rincian Pengajuan Komplain
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold text-muted-foreground">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Tipe Kendala</p>
                <p className="text-foreground text-sm mt-0.5">{getTypeLabel(dispute.type)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Solusi Diharapkan</p>
                <p className="text-foreground text-sm mt-0.5">{getResolutionLabel(dispute.requested_resolution)}</p>
              </div>
              {dispute.requested_refund_amount ? (
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Jumlah Refund Diminta</p>
                  <p className="text-rose-500 font-mono text-base font-black mt-0.5">
                    Rp {dispute.requested_refund_amount.toLocaleString('id-ID')}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5 pt-3 border-t border-border/30">
              <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Kronologi / Penjelasan</p>
              <p className="text-xs sm:text-sm font-bold text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl whitespace-pre-line border border-border/30">
                {dispute.description}
              </p>
            </div>

            {dispute.buyer_notes && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Catatan Tambahan</p>
                <p className="text-xs text-foreground font-bold">{dispute.buyer_notes}</p>
              </div>
            )}

            {/* Evidence List */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Bukti Terlampir</p>
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dispute.evidence_urls.map((url, idx) => {
                    const isImg = url.match(/\.(jpeg|jpg|gif|png)/i) || url.includes('image') || !url.includes('.pdf');
                    return (
                      <div key={idx} className="group relative border border-border/50 rounded-xl overflow-hidden bg-muted aspect-video shadow-md">
                        {isImg ? (
                          <img src={url} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
                            <FileText size={24} />
                            <span className="text-[10px] font-bold mt-1">Dokumen</span>
                          </div>
                        )}
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                        >
                          Buka Link
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs font-bold text-muted-foreground italic">Tidak ada lampiran bukti.</p>
              )}
            </div>
          </div>

          {/* Distributor Response Card */}
          {dispute.distributor_response && (
            <div className="p-6 bg-card border border-border/50 rounded-2xl shadow-lg space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2 border-b border-border/30 pb-3">
                <Building2 className="text-amber-500" size={20} />
                Respon Distributor
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold text-muted-foreground">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Keputusan Distributor</p>
                  <span className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-full border mt-1 ${
                    dispute.distributor_response.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    dispute.distributor_response.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {dispute.distributor_response.status === 'accepted' ? 'Menerima Komplain' :
                     dispute.distributor_response.status === 'rejected' ? 'Menolak Komplain' :
                     'Ajukan Tinjauan Admin'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Ditanggapi Oleh</p>
                  <p className="text-foreground text-sm mt-0.5">{dispute.distributor_response.responded_by}</p>
                </div>
              </div>
              <div className="space-y-1 bg-muted/20 p-4 rounded-xl border border-border/30">
                <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Pesan / Alasan Tanggapan</p>
                <p className="text-xs sm:text-sm font-bold text-foreground/80 leading-relaxed whitespace-pre-line">
                  {dispute.distributor_response.message}
                </p>
              </div>

              {dispute.distributor_response.evidence_urls && dispute.distributor_response.evidence_urls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Bukti dari Distributor</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {dispute.distributor_response.evidence_urls.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 bg-muted hover:bg-muted/70 border border-border/50 rounded-xl text-[10px] font-bold text-center block truncate"
                      >
                        Buka Bukti {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Decision / Mediation Card */}
          {dispute.admin_decision && (
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl shadow-lg space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2 border-b border-emerald-500/20 pb-3 text-emerald-600">
                <CheckCircle2 size={20} />
                Keputusan & Resolusi Admin
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold text-muted-foreground">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Resolusi Admin</p>
                  <span className="text-foreground text-sm font-black mt-0.5 block">
                    {dispute.admin_decision.decision === 'approve_refund' ? 'Refund Disetujui' :
                     dispute.admin_decision.decision === 'reject_claim' ? 'Komplain Ditolak' :
                     dispute.admin_decision.decision === 'replacement_required' ? 'Wajib Ganti Barang' :
                     'Proses Mediasi Lanjutan'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Diputuskan Oleh</p>
                  <p className="text-foreground text-sm mt-0.5">{dispute.admin_decision.decided_by}</p>
                </div>
              </div>
              <div className="space-y-1 bg-white/50 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider text-emerald-600">Catatan / Keterangan Resolusi</p>
                <p className="text-xs sm:text-sm font-bold text-foreground/80 leading-relaxed whitespace-pre-line">
                  {dispute.admin_decision.notes}
                </p>
              </div>

              {dispute.admin_decision.refund_amount ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">Jumlah Dana Direfund</p>
                  <p className="text-lg font-black text-emerald-600 font-mono">
                    Rp {dispute.admin_decision.refund_amount.toLocaleString('id-ID')}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Sidebar: Dispute Status & Summary */}
        <div className="space-y-6">
          <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-lg space-y-4">
            <h3 className="font-black text-xs text-muted-foreground uppercase tracking-widest border-b border-border/30 pb-2">Ringkasan Sengketa</h3>
            
            <div className="space-y-3 text-xs font-bold text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Distributor</span>
                <span className="text-foreground">{dispute.distributor_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Buyer UMKM</span>
                <span className="text-foreground">{dispute.buyer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Kode Pesanan</span>
                <span className="text-foreground font-mono">#{dispute.order_code || dispute.order_id.slice(0,8)}</span>
              </div>
              
              <hr className="border-border/30" />
              
              <div className="space-y-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Status Alur Kasus</p>
                {dispute.status === 'submitted' && (
                  <p className="text-[11px] font-medium leading-relaxed">
                    Menunggu distributor meninjau keluhan Anda dan memberikan tanggapan resmi.
                  </p>
                )}
                {dispute.status === 'awaiting_distributor_response' && (
                  <p className="text-[11px] font-medium leading-relaxed">
                    Pesanan berada dalam tenggang waktu respon distributor untuk verifikasi.
                  </p>
                )}
                {dispute.status === 'under_admin_review' && (
                  <p className="text-[11px] font-medium leading-relaxed text-amber-500">
                    Kasus telah diajukan ke admin sistem untuk arbitrase dan penentuan keputusan final pengembalian dana atau penggantian barang.
                  </p>
                )}
                {dispute.status === 'approved' && (
                  <p className="text-[11px] font-medium leading-relaxed text-emerald-500">
                    Pengajuan komplain Anda disetujui. Dana refund akan ditransfer ke rekening terdaftar.
                  </p>
                )}
                {dispute.status === 'rejected' && (
                  <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                    Tuntutan komplain ditolak setelah peninjauan menyeluruh terhadap bukti-bukti dari kedua belah pihak.
                  </p>
                )}
                {dispute.status === 'resolved' && (
                  <p className="text-[11px] font-medium leading-relaxed text-emerald-500">
                    Sengketa ditutup secara resmi dengan resolusi yang disepakati.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
