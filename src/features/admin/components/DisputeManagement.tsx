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
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { cn } from '../../../lib/utils';

const DEFAULT_DISPUTES = [
  {
    id: 'dsp-101',
    reason: 'Barang Rusak Saat Pengiriman',
    claimant: 'Toko Kelontong Berkah',
    defendant: 'CV. Sembako Mandiri',
    amount: 'Rp 4.500.000',
    created: '3 jam yang lalu',
    status: 'OPEN',
    description: 'Sebanyak 10 karton minyak goreng bocor dan merusak kemasan beras lainnya saat pengiriman menggunakan truk distributor.',
  },
  {
    id: 'dsp-102',
    reason: 'Keterlambatan Pengiriman 5 Hari',
    claimant: 'Koperasi Tani Makmur',
    defendant: 'PT. Distribusi Logistik Nusantara',
    amount: 'Rp 12.000.000',
    created: '1 hari yang lalu',
    status: 'IN_MEDIATION',
    description: 'Pengiriman pupuk bersubsidi mengalami keterlambatan ekstrim tanpa pemberitahuan, menyebabkan UMKM kehilangan momentum musim tanam.',
  },
  {
    id: 'dsp-103',
    reason: 'Jumlah Pesanan Tidak Sesuai',
    claimant: 'Warung Bu Sri',
    defendant: 'Distributor Sembako Jakarta',
    amount: 'Rp 1.250.000',
    created: '2 hari yang lalu',
    status: 'OPEN',
    description: 'Pesanan tertera 50 dus mi instan, namun yang diterima di lokasi hanya 40 dus. Pihak sopir menolak menandatangani selisih barang.',
  }
];

export const DisputeManagement = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useAuthStore();

  const fetchDisputes = async () => {
    try {
      setIsLoading(true);
      const qSnap = await getDocs(collection(db, 'disputes'));
      if (qSnap.empty) {
        const list: any[] = [];
        for (const item of DEFAULT_DISPUTES) {
          await setDoc(doc(db, 'disputes', item.id), item);
          list.push(item);
        }
        setDisputes(list);
      } else {
        const dList: any[] = [];
        qSnap.forEach((docSnap) => {
          dList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDisputes(dList);
      }
    } catch (err) {
      console.error("Gagal memuat sengketa:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleRefund = async (disputeId: string) => {
    try {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;
      const docRef = doc(db, 'disputes', disputeId);
      
      await updateDoc(docRef, { status: 'RESOLVED' });
      
      setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'RESOLVED' } : d));

      await createAuditLog({
        event: 'DISPUTE_REFUND',
        status: 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Menyetujui pengembalian dana sengketa ${disputeId} senilai ${dispute.amount} untuk ${dispute.claimant}`
      });

      alert('Kasus diselesaikan: Pengembalian dana disetujui.');
      fetchDisputes();
    } catch (err) {
      console.error("Gagal memproses pengembalian dana:", err);
    }
  };

  const handleRejectClaim = async (disputeId: string) => {
    try {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;
      const docRef = doc(db, 'disputes', disputeId);
      
      await updateDoc(docRef, { status: 'RESOLVED' });
      
      setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'RESOLVED' } : d));

      await createAuditLog({
        event: 'DISPUTE_REJECT',
        status: 'BLOCK',
        user: currentUser?.email || 'System Admin',
        details: `Menolak klaim sengketa ${disputeId} yang diajukan oleh ${dispute.claimant}`
      });

      alert('Kasus diselesaikan: Klaim sengketa ditolak.');
      fetchDisputes();
    } catch (err) {
      console.error("Gagal menolak klaim sengketa:", err);
    }
  };

  const handleTransferToMediator = async (disputeId: string) => {
    try {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;
      const docRef = doc(db, 'disputes', disputeId);
      
      await updateDoc(docRef, { status: 'IN_MEDIATION' });
      
      setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'IN_MEDIATION' } : d));

      await createAuditLog({
        event: 'DISPUTE_MEDIATION',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Mentransfer sengketa ${disputeId} ke Mediator Internal`
      });

      alert('Kasus ditransfer ke mediator internal.');
      fetchDisputes();
    } catch (err) {
      console.error("Gagal mentransfer sengketa:", err);
    }
  };

  const selected = disputes.find(d => d.id === selectedId);

  const filteredDisputes = disputes.filter(d => {
    const term = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(term) ||
      (d.claimant || '').toLowerCase().includes(term) ||
      (d.defendant || '').toLowerCase().includes(term) ||
      (d.reason || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-[#A35139] pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Resolusi Konflik</h1>
            <p className="text-muted-foreground font-medium">Arbitrase dan mediasi untuk perselisihan transaksi dalam ekosistem PasarMitra.</p>
         </div>
         <div className="flex gap-4">
            <div className="px-8 py-4 bg-[#A35139]/10 rounded-2xl border border-[#A35139]/20 flex items-center gap-4">
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
                   <div className="text-center py-20 bg-card border border-dashed border-border/50 rounded-[2.5rem] text-sm font-bold text-muted-foreground">
                      Tidak ada kasus perselisihan aktif.
                   </div>
                ) : (
                   filteredDisputes.map((dispute) => (
                     <motion.div
                       key={dispute.id}
                       onClick={() => setSelectedId(dispute.id)}
                       className={cn(
                         "p-8 bg-card border rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.01] shadow-xl relative overflow-hidden group",
                         selectedId === dispute.id ? "border-[#A35139] ring-2 ring-[#A35139]/20" : "border-border/50 hover:border-[#A35139]/30"
                       )}
                     >
                        <div className="flex justify-between items-start mb-6">
                           <StatusBadge 
                            type={dispute.status === 'RESOLVED' ? 'success' : dispute.status === 'IN_MEDIATION' ? 'info' : 'danger'} 
                            label={dispute.status === 'RESOLVED' ? 'SELESAI' : dispute.status === 'IN_MEDIATION' ? 'MEDIASI' : 'TERBUKA'} 
                           />
                           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{dispute.id}</span>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-xl font-black tracking-tight leading-tight group-hover:text-[#A35139] transition-colors">{dispute.reason}</h4>
                           <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                              <span className="flex items-center gap-1"><User size={12} /> {dispute.claimant}</span>
                              <ArrowRight size={12} className="text-border" />
                              <span className="flex items-center gap-1"><Building2 size={12} /> {dispute.defendant}</span>
                           </div>
                        </div>
                        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/30">
                           <span className="text-lg font-black italic">{dispute.amount}</span>
                           <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2"><Clock size={12} /> {dispute.created}</span>
                        </div>
                     </motion.div>
                   ))
                )}
            </div>
         </div>

         {/* Arbitration Center */}
         <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
               {selected ? (
                 <motion.div
                   key={selected.id}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="bg-card border border-border/50 rounded-[3.5rem] p-12 shadow-2xl space-y-12 h-fit sticky top-10"
                 >
                    <div className="flex justify-between items-start">
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <h2 className="text-4xl font-black tracking-tighter">Pusat Arbitrase</h2>
                             <StatusBadge 
                               type={selected.status === 'RESOLVED' ? 'success' : selected.status === 'IN_MEDIATION' ? 'info' : 'danger'} 
                               label={selected.status === 'RESOLVED' ? 'SELESAI' : selected.status === 'IN_MEDIATION' ? 'MEDIASI' : 'TERBUKA'} 
                             />
                          </div>
                          <p className="text-muted-foreground font-medium max-w-lg">Penyelidikan atas ketidaksesuaian produk dan kegagalan logistik.</p>
                       </div>
                       <div className="flex gap-3">
                          <Button variant="outline" className="h-12 w-12 rounded-xl border-border hover:bg-[#A35139]/10 hover:text-[#A35139]">
                             <ShieldAlert size={24} />
                          </Button>
                          <Button className="h-12 w-12 rounded-xl bg-[#A35139] text-white">
                             <Gavel size={24} />
                          </Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="p-8 bg-muted/20 border border-border/30 rounded-[2.5rem] space-y-4">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Penggugat</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black italic animate-pulse-slow">
                                {selected.claimant ? selected.claimant[0] : 'P'}
                             </div>
                             <div>
                                <p className="font-black">{selected.claimant}</p>
                                <p className="text-xs font-bold text-muted-foreground">Mitra Terverifikasi</p>
                             </div>
                          </div>
                          <Button variant="ghost" className="w-full h-10 bg-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2">Hubungi Penggugat <MessageSquareText size={14} /></Button>
                       </div>
                       <div className="p-8 bg-muted/20 border border-border/30 rounded-[2.5rem] space-y-4">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Tergugat</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 font-black italic animate-pulse-slow">
                                {selected.defendant ? selected.defendant[0] : 'T'}
                             </div>
                             <div>
                                <p className="font-black">{selected.defendant}</p>
                                <p className="text-xs font-bold text-muted-foreground">Distributor Enterprise</p>
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
                       <div className="p-8 bg-muted/20 border border-border/30 rounded-[2rem] text-sm font-medium leading-relaxed text-muted-foreground">
                          {selected.description || 'Tidak ada deskripsi detail yang disediakan.'}
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-xl font-black flex items-center gap-3">
                          <FileText className="text-[#A35139]" />
                          Bukti & Dokumen Pendukung
                       </h3>
                       <div className="grid grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map(idx => (
                            <div key={idx} className="aspect-square bg-muted/30 border border-dashed border-border/50 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-[#A35139] transition-all">
                               <Package size={24} className="text-muted-foreground opacity-50 group-hover:text-[#A35139]" />
                            </div>
                          ))}
                       </div>
                    </div>

                    {selected.status === 'RESOLVED' ? (
                       <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] flex items-center gap-6">
                          <CheckCircle2 className="text-emerald-500 shrink-0" size={32} />
                          <div>
                             <p className="font-black text-emerald-500 text-lg">Kasus Telah Selesai</p>
                             <p className="text-sm text-muted-foreground font-medium">Perselisihan ini telah diselesaikan secara damai dan resmi ditutup oleh administrator.</p>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-8 pt-8 border-t border-border/30">
                          <h3 className="text-2xl font-black tracking-tight">Keputusan Akhir</h3>
                          <div className="grid md:grid-cols-2 gap-6">
                             <Button 
                               onClick={() => handleRefund(selected.id)}
                               className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-500/20 flex gap-3 cursor-pointer"
                             >
                                <CheckCircle2 size={24} />
                                Setujui Pengembalian
                             </Button>
                             <Button 
                               onClick={() => handleRejectClaim(selected.id)}
                               className="h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg shadow-xl shadow-rose-500/20 flex gap-3 cursor-pointer"
                             >
                                <XCircle size={24} />
                                Tolak Klaim
                             </Button>
                          </div>
                          <Button 
                            onClick={() => handleTransferToMediator(selected.id)}
                            variant="outline" 
                            className="w-full h-14 rounded-2xl border-border bg-card font-black uppercase text-xs tracking-widest flex gap-3 hover:bg-muted/50 transition-all cursor-pointer"
                          >
                             <MessageSquareText size={18} />
                             Transfer ke Mediator Internal
                          </Button>
                       </div>
                    )}
                 </motion.div>
               ) : (
                 <div className="h-[700px] bg-muted/5 border border-dashed border-border/50 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center text-muted-foreground opacity-30">
                       <Gavel size={48} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black italic">Pilih Kasus</h3>
                       <p className="text-muted-foreground font-medium max-w-sm px-10">Pilih salah satu sengketa aktif di panel kiri untuk membuka Konsol Arbitrase dan memulai proses penyelidikan.</p>
                    </div>
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};
