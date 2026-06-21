import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Calendar,
  Building,
  User,
  ExternalLink,
  MessageSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  updateDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { useAuthStore } from '../../../store/use-auth-store';
import { Button } from '../../../components/ui/button';
import { createAuditLog } from '../services/adminService';
import { toast } from 'sonner';

export const AdminPayouts = () => {
  const { user: adminUser } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPayoutRequests = async () => {
    try {
      setIsLoading(true);
      const qSnap = await getDocs(collection(db, 'payout_requests'));
      const list: any[] = [];
      qSnap.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          requested_at: data.requested_at?.toDate ? data.requested_at.toDate() : new Date(data.requested_at || Date.now())
        });
      });
      list.sort((a, b) => b.requested_at.getTime() - a.requested_at.getTime());
      setRequests(list);
    } catch (err) {
      console.error("Gagal memuat daftar pencairan:", err);
      toast.error("Gagal memuat daftar pencairan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const handleApprove = async (req: any) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const docRef = doc(db, 'payout_requests', req.id);
      
      await updateDoc(docRef, {
        status: 'approved',
        reviewed_at: serverTimestamp(),
        reviewed_by: adminUser?.email || adminUser?.id || 'admin'
      });

      await createAuditLog({
        event: 'PAYOUT_REQUEST_APPROVED',
        status: 'SUCCESS',
        user: adminUser?.email || 'admin@pasarmitra.com',
        details: `Menyetujui pengajuan pencairan Rp ${req.amount.toLocaleString()} untuk ${req.distributor_name}`,
        targetCollection: 'payout_requests',
        targetId: req.id
      });

      toast.success("Pengajuan pencairan disetujui.");
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (err) {
      console.error("Gagal menyetujui pencairan:", err);
      toast.error("Gagal memperbarui status pencairan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || isProcessing) return;
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan harus diisi.");
      return;
    }

    try {
      setIsProcessing(true);
      const docRef = doc(db, 'payout_requests', selectedRequest.id);
      
      await updateDoc(docRef, {
        status: 'rejected',
        admin_notes: rejectReason.trim(),
        reviewed_at: serverTimestamp(),
        reviewed_by: adminUser?.email || adminUser?.id || 'admin'
      });

      await createAuditLog({
        event: 'PAYOUT_REQUEST_REJECTED',
        status: 'BLOCK',
        user: adminUser?.email || 'admin@pasarmitra.com',
        details: `Menolak pengajuan pencairan Rp ${selectedRequest.amount.toLocaleString()} untuk ${selectedRequest.distributor_name}. Alasan: ${rejectReason}`,
        targetCollection: 'payout_requests',
        targetId: selectedRequest.id
      });

      toast.success("Pengajuan pencairan ditolak.");
      setRejectReason('');
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (err) {
      console.error("Gagal menolak pencairan:", err);
      toast.error("Gagal memperbarui status pencairan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async (req: any) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      
      const docRef = doc(db, 'payout_requests', req.id);
      
      // 1. Write the payout request update
      await updateDoc(docRef, {
        status: 'paid',
        reviewed_at: serverTimestamp(),
        reviewed_by: adminUser?.email || adminUser?.id || 'admin'
      });

      // 2. Write the debit wallet transaction (id: payout_${payoutRequestId})
      const txRef = doc(db, 'wallet_transactions', `payout_${req.id}`);
      await setDoc(txRef, {
        id: `payout_${req.id}`,
        distributor_id: req.distributor_id,
        order_id: '',
        order_code: '',
        type: 'payout',
        direction: 'debit',
        gross_amount: req.amount,
        platform_fee_rate: 0,
        platform_fee_amount: 0,
        net_amount: req.amount,
        status: 'completed',
        created_at: serverTimestamp()
      });

      // 3. Create Audit Log
      await createAuditLog({
        event: 'PAYOUT_MARKED_PAID',
        status: 'SUCCESS',
        user: adminUser?.email || 'admin@pasarmitra.com',
        details: `Menandai pencairan Rp ${req.amount.toLocaleString()} untuk ${req.distributor_name} sebagai sudah dibayar.`,
        targetCollection: 'payout_requests',
        targetId: req.id
      });

      toast.success("Pencairan ditandai sebagai sudah dibayar.");
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (err) {
      console.error("Gagal menandai pembayaran pencairan:", err);
      toast.error("Gagal memproses pembayaran pencairan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-xs sm:text-sm text-muted-foreground break-words min-w-0 font-medium">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-foreground font-black">Pencairan Dana</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Coins className="text-primary h-8 w-8 shrink-0" /> Pengajuan Pencairan Dana
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review, setujui, atau tandai pengajuan pencairan dana dari mitra distributor yang telah diselesaikan.
        </p>
      </div>

      {/* Payout Notice */}
      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-xs font-bold text-foreground">Informasi Pengolahan Pencairan</p>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-relaxed">
            Pastikan transfer dana ke rekening bank penerima distributor telah berhasil dilakukan secara manual sebelum menandai status pengajuan sebagai sudah dibayar.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Semua', val: 'all' },
          { label: 'Menunggu Review', val: 'pending_review' },
          { label: 'Disetujui', val: 'approved' },
          { label: 'Ditolak', val: 'rejected' },
          { label: 'Sudah Dibayar', val: 'paid' }
        ].map(tab => (
          <button
            key={tab.val}
            onClick={() => setFilterStatus(tab.val)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
              filterStatus === tab.val
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10'
                : 'bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-primary/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="p-10 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          <p className="text-xs font-bold">Memuat daftar pencairan...</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground font-bold">
              Tidak ada pengajuan pencairan dalam filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4">Tanggal Pengajuan</th>
                    <th className="p-4">Distributor</th>
                    <th className="p-4">Informasi Rekening</th>
                    <th className="p-4 text-right">Jumlah</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-bold">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/10">
                      <td className="p-4 text-muted-foreground font-mono">
                        {req.requested_at.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-foreground font-black">
                        {req.distributor_name}
                      </td>
                      <td className="p-4 text-foreground text-xs leading-normal">
                        <div className="flex items-center gap-1 font-black text-muted-foreground uppercase text-[10px]">
                          <Building size={10} /> {req.bank_name}
                        </div>
                        <div className="font-mono mt-0.5">{req.bank_account_number}</div>
                        <div className="text-[10px] text-muted-foreground">a.n. {req.bank_account_holder}</div>
                      </td>
                      <td className="p-4 text-right font-mono font-black text-foreground">
                        Rp {req.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                          req.status === 'pending_review' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          req.status === 'approved' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          req.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {req.status === 'pending_review' ? 'Menunggu' :
                           req.status === 'approved' ? 'Disetujui' :
                           req.status === 'paid' ? 'Dibayar' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          onClick={() => setSelectedRequest(req)}
                          className="bg-muted text-foreground hover:bg-muted/80 h-8 px-3 rounded-lg text-xs font-bold"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog Modal */}
      <AnimatePresence>
        {selectedRequest && !isRejectModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/30 flex justify-between items-center">
                <h3 className="font-black text-base text-foreground flex items-center gap-1.5">
                  <Coins size={18} className="text-primary" /> Detail Pengajuan Pencairan
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3 border-b border-border/20 pb-4 text-xs sm:text-sm font-bold text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Mitra Distributor</span>
                    <span className="text-foreground">{selectedRequest.distributor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nominal Pencairan</span>
                    <span className="text-primary font-black font-mono text-base">Rp {selectedRequest.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal Pengajuan</span>
                    <span className="text-foreground font-mono">
                      {selectedRequest.requested_at.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Informasi Bank Penerima</h4>
                  <div className="p-3 bg-muted/40 border border-border/50 rounded-xl space-y-1.5 text-xs font-bold text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="uppercase">{selectedRequest.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nomor Rekening:</span>
                      <span className="font-mono">{selectedRequest.bank_account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pemilik Rekening:</span>
                      <span>{selectedRequest.bank_account_holder}</span>
                    </div>
                  </div>
                </div>

                {selectedRequest.admin_notes && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catatan Admin</h4>
                    <p className="text-xs font-medium text-rose-500 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                      {selectedRequest.admin_notes}
                    </p>
                  </div>
                )}

                {/* Actions Panel */}
                <div className="pt-2 flex flex-col gap-2">
                  {selectedRequest.status === 'pending_review' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setIsRejectModalOpen(true)}
                        disabled={isProcessing}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider h-10 rounded-xl"
                      >
                        Tolak
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedRequest)}
                        disabled={isProcessing}
                        className="bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider h-10 rounded-xl"
                      >
                        Setujui
                      </Button>
                    </div>
                  )}

                  {selectedRequest.status === 'approved' && (
                    <Button
                      onClick={() => handleMarkAsPaid(selectedRequest)}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-lg shadow-emerald-500/10"
                    >
                      Tandai Sudah Dibayar
                    </Button>
                  )}

                  {selectedRequest.status === 'paid' && (
                    <div className="text-center text-xs font-black text-emerald-500 py-2 border border-emerald-500/20 bg-emerald-500/5 rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={16} /> Pencairan Selesai & Dibayarkan
                    </div>
                  )}

                  {selectedRequest.status === 'rejected' && (
                    <div className="text-center text-xs font-black text-rose-500 py-2 border border-rose-500/20 bg-rose-500/5 rounded-xl flex items-center justify-center gap-1.5">
                      <XCircle size={16} /> Pengajuan Ditolak
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Reason input dialog */}
      <AnimatePresence>
        {isRejectModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/80 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/30 flex justify-between items-center">
                <h3 className="font-black text-base text-rose-500 flex items-center gap-1.5">
                  <XCircle size={18} /> Tolak Pengajuan Pencairan
                </h3>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleReject} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Alasan Penolakan
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Masukkan alasan penolakan agar distributor mengetahui alasannya..."
                    required
                    rows={3}
                    className="w-full p-3 border border-border rounded-xl bg-background text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsRejectModalOpen(false)}
                    className="flex-1 bg-muted text-foreground hover:bg-muted/80 h-10 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Tolak'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
