import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Handshake, 
  AlertCircle, 
  MessageSquareText, 
  Gavel, 
  Scale, 
  ShieldAlert,
  ArrowRight,
  Clock,
  User,
  Building2,
  Package,
  CreditCard,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { disputeService } from '../../orders/services/disputeService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { formatDateTime } from '../../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../../components/common/Pagination';

export const DisputeManagement = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Decision states
  const [actionType, setActionType] = useState<'refund' | 'reject' | 'mediation' | 'replacement' | null>(null);
  const [refundAmountVal, setRefundAmountVal] = useState('');
  const [refundNoteVal, setRefundNoteVal] = useState('');
  const [rejectionReasonVal, setRejectionReasonVal] = useState('');
  const [adminNoteVal, setAdminNoteVal] = useState('');

  const fetchDisputes = async () => {
    try {
      setIsLoading(true);
      const qSnap = await getDocs(collection(db, 'disputes'));
      const dList: any[] = [];
      qSnap.forEach((docSnap) => {
        dList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDisputes(dList);
    } catch (err) {
      console.error("Gagal memuat sengketa:", err);
      toast.error('Gagal memuat sengketa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  // Reset forms when switching disputes
  useEffect(() => {
    setActionType(null);
    setRefundAmountVal('');
    setRefundNoteVal('');
    setRejectionReasonVal('');
    setAdminNoteVal('');
  }, [selectedId]);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const amountNum = parseFloat(refundAmountVal);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Jumlah refund harus berupa angka valid di atas 0.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menyetujui refund dana sebesar Rp ${amountNum.toLocaleString()} untuk sengketa ini?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await disputeService.resolveDispute(selectedId, {
        decision: 'approve_refund',
        refund_amount: amountNum,
        notes: refundNoteVal,
        decided_by: currentUser?.email || 'admin@example.com'
      });

      toast.success('Persetujuan refund berhasil dikirim.');
      setActionType(null);
      await fetchDisputes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memproses pengembalian dana');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!rejectionReasonVal.trim()) {
      toast.error('Alasan penolakan tidak boleh kosong.');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menolak klaim sengketa ini?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await disputeService.resolveDispute(selectedId, {
        decision: 'reject_claim',
        notes: rejectionReasonVal.trim(),
        decided_by: currentUser?.email || 'admin@example.com'
      });

      toast.success('Klaim sengketa ditolak.');
      setActionType(null);
      await fetchDisputes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menolak klaim sengketa');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMediationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    if (!window.confirm('Apakah Anda yakin ingin memindahkan sengketa ini ke mediator internal?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await disputeService.resolveDispute(selectedId, {
        decision: 'mediation',
        notes: adminNoteVal.trim(),
        decided_by: currentUser?.email || 'admin@example.com'
      });

      toast.success('Sengketa ditransfer ke mediator internal.');
      setActionType(null);
      await fetchDisputes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal mentransfer sengketa');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!adminNoteVal.trim()) {
      toast.error('Catatan instruksi penggantian barang wajib diisi.');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin mewajibkan penggantian barang untuk komplain ini?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await disputeService.resolveDispute(selectedId, {
        decision: 'replacement_required',
        notes: adminNoteVal.trim(),
        decided_by: currentUser?.email || 'admin@example.com'
      });

      toast.success('Keputusan penggantian barang berhasil disimpan.');
      setActionType(null);
      await fetchDisputes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan keputusan');
    } finally {
      setIsProcessing(false);
    }
  };

  const selected = disputes.find(d => d.id === selectedId);

  const filteredDisputes = disputes.filter(d => {
    const term = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(term) ||
      (d.claimant || d.buyer_name || '').toLowerCase().includes(term) ||
      (d.defendant || d.distributor_name || '').toLowerCase().includes(term) ||
      (d.reason || '').toLowerCase().includes(term)
    );
  });
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const getDisputeStatusLabel = (dispute: any) => {
    const statusStr = (dispute.status || '').toLowerCase();
    
    switch (statusStr) {
      case 'submitted':
        return 'Diajukan';
      case 'awaiting_distributor_response':
        return 'Menunggu Respon';
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
      case 'open':
        return 'Terbuka';
      case 'in_mediation':
        return 'Mediasi';
      default:
        // fallback legacy check
        const statusUpper = (dispute.status || '').toUpperCase();
        const resType = (dispute.resolution_type || '').toUpperCase();
        if (statusUpper === 'RESOLVED') {
          if (resType === 'REFUNDED') return 'REFUNDED';
          if (resType === 'REJECTED') return 'DITOLAK';
          return 'SELESAI';
        }
        if (statusUpper === 'IN_MEDIATION') return 'MEDIASI';
        return dispute.status || 'TERBUKA';
    }
  };

  const getDisputeStatusType = (dispute: any) => {
    const statusStr = (dispute.status || '').toLowerCase();
    
    switch (statusStr) {
      case 'submitted':
        return 'info';
      case 'awaiting_distributor_response':
      case 'under_admin_review':
      case 'in_mediation':
        return 'warning';
      case 'approved':
      case 'resolved':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'danger';
      default:
        const statusUpper = (dispute.status || '').toUpperCase();
        const resType = (dispute.resolution_type || '').toUpperCase();
        if (statusUpper === 'RESOLVED') {
          if (resType === 'REFUNDED') return 'success';
          if (resType === 'REJECTED') return 'danger';
          return 'success';
        }
        if (statusUpper === 'IN_MEDIATION') return 'info';
        return 'danger';
    }
  };

  // Replaced by shared formatDateTime from dateUtils — handles Firestore Timestamp, ISO string, and nulls
  const formatDisputeDate = (dispute: any) => formatDateTime(dispute.created_at || dispute.created);

  return (
    <div className="space-y-12 w-full max-w-full min-w-0 overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Sengketa</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 min-w-0">
         <div className="space-y-1 border-l-4 border-[#A35139] pl-4 sm:pl-8 py-2 min-w-0 flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter break-words">Resolusi Konflik</h1>
            <p className="text-muted-foreground font-medium text-xs sm:text-sm break-words">Arbitrase dan mediasi untuk perselisihan transaksi dalam ekosistem PasarMitra.</p>
         </div>
         <div className="flex gap-4 shrink-0 w-full lg:w-auto">
            <div className="px-6 py-3 sm:px-8 sm:py-4 bg-[#A35139]/10 rounded-2xl border border-[#A35139]/20 flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
               <Scale className="text-[#A35139]" size={28} />
               <div>
                  <p className="text-xs font-black uppercase text-[#A35139] tracking-widest">Tingkat Resolusi</p>
                  <p className="text-lg font-black italic">94.2%</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
         {/* Dispute List */}
         <div className="lg:col-span-2 space-y-6">
            <div className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Cari kasus berdasarkan ID atau entitas..." 
                 className="w-full h-14 bg-card border border-border/50 rounded-2xl px-14 text-sm font-bold outline-none focus:border-primary/40 transition-all shadow-sm" 
               />
            </div>

            <div className="space-y-4">
                {isLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="font-black text-xs uppercase tracking-widest">Memuat Sengketa...</p>
                   </div>
                ) : filteredDisputes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-card border border-dashed border-border/50 rounded-[2.5rem]">
                       <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
                         <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                       </div>
                       <div className="space-y-1.5 max-w-xs">
                         <p className="text-sm font-black text-foreground">Belum ada sengketa untuk ditinjau.</p>
                         <p className="text-xs font-medium text-muted-foreground">Laporan sengketa dan permintaan refund dari transaksi akan muncul di sini.</p>
                       </div>
                    </div>
                ) : (
                    <>
                       {paginatedDisputes.map((dispute) => (
                          <motion.div
                            key={dispute.id}
                            onClick={() => setSelectedId(dispute.id)}
                            className={cn(
                              "p-5 sm:p-8 bg-card border rounded-2xl sm:rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.01] shadow-xl relative overflow-hidden group w-full min-w-0 max-w-full",
                              selectedId === dispute.id ? "border-[#A35139] ring-2 ring-[#A35139]/20" : "border-border/50 hover:border-[#A35139]/30"
                            )}
                          >
                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6 min-w-0">
                                <div className="shrink-0">
                                  <StatusBadge 
                                   type={getDisputeStatusType(dispute)} 
                                   label={getDisputeStatusLabel(dispute)} 
                                  />
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest break-all">{dispute.id}</span>
                             </div>
                             <div className="space-y-4 min-w-0">
                                <h4 className="text-lg sm:text-xl font-black tracking-tight leading-tight group-hover:text-[#A35139] transition-colors break-words">{dispute.reason}</h4>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-bold text-muted-foreground min-w-0">
                                   <span className="flex items-center gap-1 min-w-0 truncate"><User size={12} className="shrink-0" /> <span className="truncate">{dispute.claimant || dispute.buyer_name || '-'}</span></span>
                                   <ArrowRight size={12} className="text-border shrink-0 rotate-90 sm:rotate-0" />
                                   <span className="flex items-center gap-1 min-w-0 truncate"><Building2 size={12} className="shrink-0" /> <span className="truncate">{dispute.defendant || dispute.distributor_name || '-'}</span></span>
                                </div>
                             </div>
                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-border/30 min-w-0">
                                <span className="text-lg font-black italic">{dispute.amount || '-'}</span>
                                <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2 shrink-0"><Clock size={12} /> {formatDisputeDate(dispute)}</span>
                             </div>
                          </motion.div>
                       ))}
                       <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                          totalItems={filteredDisputes.length}
                          itemsPerPage={itemsPerPage}
                       />
                    </>
                 )}
            </div>
         </div>

         {/* Arbitration Center */}
         <div className="lg:col-span-3 min-w-0 w-full">
            <AnimatePresence mode="wait">
               {selected ? (
                 <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-card border border-border/50 rounded-2xl sm:rounded-[3.5rem] p-5 sm:p-8 lg:p-12 shadow-2xl space-y-6 sm:space-y-12 h-fit lg:sticky lg:top-10 w-full min-w-0 max-w-full"
                 >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                       <div className="space-y-2 sm:space-y-4 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                             <h2 className="text-2xl sm:text-4xl font-black tracking-tighter break-words">Pusat Arbitrase</h2>
                             <StatusBadge 
                               type={getDisputeStatusType(selected)} 
                               label={getDisputeStatusLabel(selected)} 
                             />
                          </div>
                          <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-lg break-words">Penyelidikan atas ketidaksesuaian produk dan kegagalan logistik.</p>
                       </div>
                       <div className="flex gap-3 shrink-0">
                          <Button variant="outline" className="h-12 w-12 rounded-xl border-border hover:bg-[#A35139]/10 hover:text-[#A35139]">
                             <ShieldAlert size={24} />
                          </Button>
                          <Button className="h-12 w-12 rounded-xl bg-[#A35139] text-white">
                             <Gavel size={24} />
                          </Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                       <div className="p-5 sm:p-8 bg-muted/20 border border-border/30 rounded-2xl sm:rounded-[2.5rem] space-y-4 min-w-0 w-full max-w-full overflow-hidden">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Penggugat</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black italic animate-pulse-slow shrink-0">
                                {selected.claimant || selected.buyer_name ? (selected.claimant || selected.buyer_name)[0] : 'P'}
                             </div>
                             <div className="min-w-0">
                                <p className="font-black text-sm sm:text-base truncate">{selected.claimant || selected.buyer_name || '-'}</p>
                                <p className="text-xs font-bold text-muted-foreground truncate">Mitra Terverifikasi</p>
                             </div>
                          </div>
                          <Button variant="ghost" className="w-full h-10 bg-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2">Hubungi Penggugat <MessageSquareText size={14} /></Button>
                       </div>
                       <div className="p-5 sm:p-8 bg-muted/20 border border-border/30 rounded-2xl sm:rounded-[2.5rem] space-y-4 min-w-0 w-full max-w-full overflow-hidden">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Tergugat</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 font-black italic animate-pulse-slow shrink-0">
                                {selected.defendant || selected.distributor_name ? (selected.defendant || selected.distributor_name)[0] : 'T'}
                             </div>
                             <div className="min-w-0">
                                <p className="font-black text-sm sm:text-base truncate">{selected.defendant || selected.distributor_name || '-'}</p>
                                <p className="text-xs font-bold text-muted-foreground truncate">Distributor Enterprise</p>
                             </div>
                          </div>
                          <Button variant="ghost" className="w-full h-10 bg-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2">Hubungi Tergugat <MessageSquareText size={14} /></Button>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-xl font-black flex items-center gap-3">
                          <AlertCircle className="text-[#A35139]" size={20} />
                          Detail Permasalahan
                       </h3>
                       <div className="p-5 sm:p-8 bg-muted/20 border border-border/30 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm font-bold text-muted-foreground space-y-3 sm:space-y-4 leading-relaxed w-full min-w-0 max-w-full break-words">
                          {selected.title && (
                            <p className="text-foreground">Judul Komplain: <span className="font-black break-words">{selected.title}</span></p>
                          )}
                          <p>Tipe Kendala: <span className="text-foreground font-black break-words">
                            {selected.type === 'damaged_item' ? 'Barang Rusak' :
                             selected.type === 'wrong_item' ? 'Barang Tidak Sesuai' :
                             selected.type === 'missing_quantity' ? 'Jumlah Kurang' :
                             selected.type === 'not_received' ? 'Barang Tidak Diterima' :
                             selected.type === 'late_delivery' ? 'Keterlambatan Pengiriman' : 'Lainnya'}
                          </span></p>
                          <p className="text-foreground break-words">Alasan / Kronologi: {selected.description || selected.reason}</p>
                          {selected.buyer_notes && (
                            <p className="break-words">Catatan Tambahan Pembeli: {selected.buyer_notes}</p>
                          )}
                          {selected.requested_resolution && (
                            <p>Resolusi Diharapkan: <span className="text-[#A35139] capitalize font-black break-words">
                              {selected.requested_resolution === 'full_refund' ? 'Refund Penuh' : 
                               selected.requested_resolution === 'partial_refund' ? 'Refund Sebagian' : 
                               selected.requested_resolution === 'replacement' ? 'Penggantian Barang' : 
                               selected.requested_resolution === 'discussion' ? 'Diskusi dengan Distributor' : 
                               selected.requested_resolution === 'refund' ? 'Refund Dana' : 'Tinjauan Admin'}
                            </span></p>
                          )}
                          {selected.requested_refund_amount ? (
                            <p>Jumlah Refund Diminta: <span className="text-[#A35139] font-black break-words">Rp {selected.requested_refund_amount.toLocaleString('id-ID')}</span></p>
                          ) : null}
                          {(selected.order_code || selected.order_id || selected.orderId) && (
                            <p>ID Pesanan: <span className="text-foreground font-black break-all">#{selected.order_code || selected.order_id || selected.orderId}</span></p>
                          )}
                       </div>
                    </div>

                    {((selected.evidence_urls && selected.evidence_urls.length > 0) || selected.evidence_url || selected.evidence_note) ? (
                        <div className="space-y-6">
                           <h3 className="text-xl font-black flex items-center gap-3">
                              <FileText className="text-[#A35139]" />
                              Bukti & Dokumen Pendukung
                           </h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selected.evidence_urls && selected.evidence_urls.map((url: string, idx: number) => {
                                const isImg = url.match(/\.(jpeg|jpg|gif|png)/i) || url.includes('image') || !url.includes('.pdf');
                                return (
                                  <div key={idx} className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex flex-col gap-3 min-w-0 w-full max-w-full overflow-hidden">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2 truncate">
                                        <FileText className="text-primary shrink-0" size={20} />
                                        <span className="text-xs font-bold truncate">Bukti {idx + 1}</span>
                                      </div>
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-black rounded-lg transition-all shrink-0"
                                      >
                                        Buka Link
                                      </a>
                                    </div>
                                    {isImg && (
                                      <div className="border border-border/30 rounded-xl overflow-hidden aspect-video bg-muted shrink-0">
                                        <img src={url} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {!selected.evidence_urls && selected.evidence_url && (
                                <div className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex flex-col gap-3 sm:col-span-2 min-w-0 w-full max-w-full overflow-hidden">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="text-primary shrink-0" size={20} />
                                      <span className="text-xs font-bold truncate">File Bukti Pengajuan</span>
                                    </div>
                                    <a 
                                      href={selected.evidence_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-black rounded-lg transition-all shrink-0"
                                    >
                                      Buka Link
                                    </a>
                                  </div>
                                  {selected.evidence_url.match(/\.(jpeg|jpg|gif|png)/i) && (
                                    <div className="border border-border/30 rounded-xl overflow-hidden max-w-md bg-muted shrink-0">
                                      <img src={selected.evidence_url} alt="Bukti" className="w-full object-cover" />
                                    </div>
                                  )}
                                </div>
                              )}
                           </div>
                        </div>
                     ) : (
                        <div className="p-5 sm:p-8 text-center bg-muted/10 border border-dashed border-border/50 rounded-2xl text-xs font-bold text-muted-foreground w-full">
                          Tidak ada lampiran file bukti.
                        </div>
                     )}

                     {/* Tanggapan Distributor */}
                     {selected.distributor_response && (
                       <div className="space-y-4 pt-4 border-t border-border/30">
                         <h3 className="text-xl font-black flex items-center gap-3">
                           <Building2 className="text-[#A35139]" size={20} />
                           Respon Distributor
                         </h3>
                         <div className="p-5 sm:p-8 bg-muted/20 border border-border/30 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm font-bold text-muted-foreground space-y-3 sm:space-y-4 leading-relaxed text-left w-full min-w-0 max-w-full break-words">
                           <p>
                             Keputusan Distributor: <span className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-full border ${
                               selected.distributor_response.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                               selected.distributor_response.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                               'bg-blue-500/10 text-blue-500 border-blue-500/20'
                             }`}>
                               {selected.distributor_response.status === 'accepted' ? 'Menerima Komplain' :
                                selected.distributor_response.status === 'rejected' ? 'Menolak Komplain' :
                                'Tinjauan Admin'}
                             </span>
                           </p>
                           <p className="text-foreground break-words">Pesan / Alasan: {selected.distributor_response.message}</p>
                           <p className="text-[10px] text-muted-foreground font-normal break-words">
                             Ditanggapi oleh: {selected.distributor_response.responded_by} pada {formatDateTime(selected.distributor_response.responded_at)}
                           </p>

                           {selected.distributor_response.evidence_urls && selected.distributor_response.evidence_urls.length > 0 && (
                             <div className="space-y-2 pt-2 min-w-0 w-full max-w-full">
                               <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Bukti Distributor</p>
                               <div className="grid grid-cols-2 gap-2">
                                 {selected.distributor_response.evidence_urls.map((url: string, idx: number) => (
                                   <a 
                                     key={idx} 
                                     href={url} 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     className="p-2 bg-card hover:bg-muted border border-border/50 rounded-xl text-[10px] font-bold text-center block truncate text-primary"
                                   >
                                     Bukti {idx + 1}
                                   </a>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                    {selected.status === 'RESOLVED' ? (
                       <div className="p-5 sm:p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 w-full min-w-0 max-w-full break-words">
                          <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
                             <CheckCircle2 className="text-emerald-500 shrink-0" size={32} />
                             <div className="min-w-0">
                                <p className="font-black text-emerald-500 text-base sm:text-lg break-words">
                                  {selected.resolution_type === 'REFUNDED' ? 'Refund Disetujui' : 
                                   selected.resolution_type === 'REJECTED' ? 'Klaim Ditolak' : 'Kasus Selesai'}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground font-medium break-words">Perselisihan ini telah diselesaikan secara resmi oleh administrator.</p>
                             </div>
                          </div>
                          
                          <div className="border-t border-emerald-500/20 pt-4 space-y-3 text-xs sm:text-sm font-bold text-muted-foreground break-words">
                             {selected.resolution_type === 'REFUNDED' && (
                               <>
                                 <p className="text-foreground break-words">Jumlah Refund: <span className="text-emerald-500 font-black">Rp {(selected.refund_amount || 0).toLocaleString()}</span></p>
                                 {selected.refund_note && <p className="break-words">Catatan Refund: {selected.refund_note}</p>}
                               </>
                             )}
                             {selected.resolution_type === 'REJECTED' && selected.rejection_reason && (
                               <p className="text-rose-500 break-words">Alasan Penolakan: {selected.rejection_reason}</p>
                             )}
                             {selected.admin_note && (
                               <p className="break-words">Catatan Admin: {selected.admin_note}</p>
                             )}
                             <p className="text-[10px] text-muted-foreground font-normal break-words">Ditinjau oleh: {selected.reviewed_by || 'Admin'} pada {formatDateTime(selected.reviewed_at)}</p>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-6 sm:space-y-8 pt-6 sm:pt-8 border-t border-border/30">
                          <h3 className="text-xl sm:text-2xl font-black tracking-tight">Keputusan Akhir</h3>

                          {actionType === null ? (
                             <div className="space-y-4 sm:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                   <Button 
                                     onClick={() => {
                                       setActionType('refund');
                                       const rawAmount = selected.amount ? parseFloat(selected.amount.replace(/[^0-9]/g, '')) : 0;
                                       setRefundAmountVal(rawAmount ? rawAmount.toString() : '');
                                       setRefundNoteVal('');
                                     }}
                                     className="h-16 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-lg shadow-xl shadow-emerald-500/20 flex gap-3 cursor-pointer items-center justify-center animate-hover"
                                     disabled={isProcessing}
                                   >
                                      <CheckCircle2 size={24} className="shrink-0" />
                                      Setujui Pengembalian
                                   </Button>
                                   <Button 
                                     onClick={() => {
                                       setActionType('reject');
                                       setRejectionReasonVal('');
                                     }}
                                     className="h-16 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-lg shadow-xl shadow-rose-500/20 flex gap-3 cursor-pointer items-center justify-center animate-hover"
                                     disabled={isProcessing}
                                   >
                                      <XCircle size={24} className="shrink-0" />
                                      Tolak Klaim
                                   </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  <Button 
                                    onClick={() => {
                                      setActionType('replacement');
                                      setAdminNoteVal('');
                                    }}
                                    className="h-14 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 flex gap-3 cursor-pointer items-center justify-center animate-hover"
                                    disabled={isProcessing}
                                  >
                                     <Package size={20} className="shrink-0" />
                                     Wajibkan Ganti Barang
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      setActionType('mediation');
                                      setAdminNoteVal('');
                                    }}
                                    className="h-14 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-500/20 flex gap-3 cursor-pointer items-center justify-center animate-hover"
                                    disabled={isProcessing}
                                  >
                                     <MessageSquareText size={20} className="shrink-0" />
                                     Lanjut Mediasi
                                  </Button>
                                </div>
                             </div>
                          ) : actionType === 'refund' ? (
                             <form onSubmit={handleRefundSubmit} className="p-5 sm:p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
                                <h4 className="text-base sm:text-lg font-black text-emerald-500 flex items-center gap-2">
                                  <CheckCircle2 size={20} /> Form Persetujuan Refund
                                </h4>
                                
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Jumlah Pengembalian Dana (IDR) <span className="text-rose-500">*</span>
                                  </label>
                                  <input 
                                    type="number"
                                    required
                                    value={refundAmountVal}
                                    onChange={(e) => setRefundAmountVal(e.target.value)}
                                    placeholder="Contoh: 150000"
                                    className="w-full h-14 bg-card border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Catatan Persetujuan Refund
                                  </label>
                                  <textarea 
                                    value={refundNoteVal}
                                    onChange={(e) => setRefundNoteVal(e.target.value)}
                                    placeholder="Jelaskan alasan persetujuan atau catatan transfer dana..."
                                    rows={3}
                                    className="w-full bg-card border border-border/60 rounded-[1.25rem] p-4 sm:p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                                  />
                                </div>

                                <div className="flex gap-4">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => setActionType(null)}
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl border-border font-bold uppercase text-xs tracking-wider"
                                  >
                                    Batal
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-wider flex gap-2 items-center justify-center shadow-lg shadow-emerald-500/10"
                                  >
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Kirim Refund'}
                                  </Button>
                                </div>
                             </form>
                          ) : actionType === 'reject' ? (
                             <form onSubmit={handleRejectSubmit} className="p-5 sm:p-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
                                <h4 className="text-base sm:text-lg font-black text-rose-500 flex items-center gap-2">
                                  <XCircle size={20} /> Form Penolakan Klaim
                                </h4>
                                
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Alasan Penolakan <span className="text-rose-500">*</span>
                                  </label>
                                  <textarea 
                                    required
                                    value={rejectionReasonVal}
                                    onChange={(e) => setRejectionReasonVal(e.target.value)}
                                    placeholder="Jelaskan secara detail mengapa klaim sengketa ditolak..."
                                    rows={4}
                                    className="w-full bg-card border border-border/60 rounded-[1.25rem] p-4 sm:p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                                  />
                                </div>

                                <div className="flex gap-4">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => setActionType(null)}
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl border-border font-bold uppercase text-xs tracking-wider"
                                  >
                                    Batal
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-xs tracking-wider flex gap-2 items-center justify-center shadow-lg shadow-rose-500/10"
                                  >
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Kirim Penolakan'}
                                  </Button>
                                </div>
                             </form>
                          ) : actionType === 'replacement' ? (
                             <form onSubmit={handleReplacementSubmit} className="p-5 sm:p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
                                <h4 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2">
                                  <Package size={20} /> Form Keputusan Ganti Barang
                                </h4>
                                
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Instruksi / Catatan Penggantian Barang <span className="text-rose-500">*</span>
                                  </label>
                                  <textarea 
                                    required
                                    value={adminNoteVal}
                                    onChange={(e) => setAdminNoteVal(e.target.value)}
                                    placeholder="Jelaskan instruksi pengembalian barang rusak dan pengiriman produk pengganti..."
                                    rows={4}
                                    className="w-full bg-card border border-border/60 rounded-[1.25rem] p-4 sm:p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                                  />
                                </div>

                                <div className="flex gap-4">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => setActionType(null)}
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl border-border font-bold uppercase text-xs tracking-wider"
                                  >
                                    Batal
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-xs tracking-wider flex gap-2 items-center justify-center shadow-lg shadow-amber-500/10"
                                  >
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Kirim Keputusan'}
                                  </Button>
                                </div>
                             </form>
                          ) : (
                             <form onSubmit={handleMediationSubmit} className="p-5 sm:p-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
                                <h4 className="text-base sm:text-lg font-black text-blue-500 flex items-center gap-2">
                                  <MessageSquareText size={20} /> Transfer ke Mediator Internal
                                </h4>
                                
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Catatan Internal Admin / Instruksi Mediasi
                                  </label>
                                  <textarea 
                                    value={adminNoteVal}
                                    onChange={(e) => setAdminNoteVal(e.target.value)}
                                    placeholder="Tambahkan catatan khusus untuk mediator..."
                                    rows={4}
                                    className="w-full bg-card border border-border/60 rounded-[1.25rem] p-4 sm:p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                                  />
                                </div>

                                <div className="flex gap-4">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => setActionType(null)}
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl border-border font-bold uppercase text-xs tracking-wider"
                                  >
                                    Batal
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs tracking-wider flex gap-2 items-center justify-center shadow-lg shadow-blue-500/10"
                                  >
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Kirim ke Mediator'}
                                  </Button>
                                </div>
                             </form>
                          )}
                       </div>
                    )}
                 </motion.div>
               ) : (
                 <div className="h-[300px] sm:h-[600px] bg-muted/5 border border-dashed border-border/50 rounded-2xl sm:rounded-[4rem] flex flex-col items-center justify-center text-center space-y-4 p-6 w-full">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-muted/30 rounded-full flex items-center justify-center text-muted-foreground opacity-30 shrink-0">
                       <Gavel size={32} className="sm:size-[48px]" />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                       <h3 className="text-xl sm:text-2xl font-black italic">Pilih Kasus</h3>
                       <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-sm px-4">Pilih salah satu sengketa aktif di panel kiri untuk membuka Konsol Arbitrase dan memulai proses penyelidikan.</p>
                    </div>
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};
