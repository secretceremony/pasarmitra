import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Percent, 
  Settings2, 
  Save, 
  History, 
  Plus, 
  RefreshCw, 
  Search, 
  Info,
  Briefcase,
  X,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { toast } from 'sonner';

export const CommissionManagement = () => {
  const [tiers, setTiers] = useState<any[]>([]);
  const [globalBaseline, setGlobalBaseline] = useState<number>(1.375);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuthStore();

  const DEFAULT_FEES = {
    DISTRIBUTOR: 1.5,
    "Strategic Enterprise": 1.0,
    "Local Farmers": 0.5,
    "Sembako Wholesale": 1.25
  };

  const fetchCommissionData = async () => {
    try {
      setIsLoading(true);
      
      const globalDoc = await getDoc(doc(db, 'settings', 'commission'));
      if (globalDoc.exists()) {
        setGlobalBaseline(globalDoc.data().globalBaseline || 1.375);
      } else {
        await setDoc(doc(db, 'settings', 'commission'), { globalBaseline: 1.375 });
      }

      const qSnap = await getDocs(collection(db, 'commission_tiers'));
      const list: any[] = [];
      qSnap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          partnerType: data.partnerType || 'DISTRIBUTOR',
          partnersActive: data.partnersActive || 0,
          platformFee: typeof data.platformFee === 'number' ? data.platformFee : (DEFAULT_FEES[data.partnerType as keyof typeof DEFAULT_FEES] ?? 0),
          description: data.description || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
          updatedAt: data.updatedAt || null
        });
      });

      if (list.length === 0) {
        const fallback = Object.entries(DEFAULT_FEES).map(([partner, fee]) => ({
          id: `${partner}-fallback`,
          name: partner,
          partnerType: partner,
          partnersActive: 0,
          platformFee: fee,
          description: '',
          isActive: true,
          updatedAt: null
        }));
        setTiers(fallback);
      } else {
        list.sort((a, b) => a.id.localeCompare(b.id));
        setTiers(list);
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan komisi:", err);
      toast.error('Gagal memuat data komisi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const handleStartEdit = (tier: any) => {
    setEditingTierId(tier.id);
    setEditRate(tier.platformFee.toString());
  };

  const handleSaveRate = async (tierId: string) => {
    const rateNum = parseFloat(editRate);
    if (!editRate.trim() || isNaN(rateNum)) {
      toast.error('Platform Fee harus berupa angka.');
      return;
    }
    if (rateNum < 0) {
      toast.error('Platform Fee tidak boleh bernilai negatif.');
      return;
    }
    if (rateNum > 10.0) {
      const confirmAboveTen = window.confirm('Nilai Platform Fee di atas 10.0% tidak realistis untuk ekosistem B2B PasarMitra. Apakah Anda yakin ingin menetapkan nilai ini?');
      if (!confirmAboveTen) return;
    }

    setIsSaving(true);
    try {
      const tier = tiers.find(t => t.id === tierId);
      const oldRate = tier?.platformFee;
      
      const docRef = doc(db, 'commission_tiers', tierId);
      await updateDoc(docRef, { 
        platformFee: rateNum,
        updatedAt: new Date()
      });
      
      setTiers(prev => prev.map(t => t.id === tierId ? { ...t, platformFee: rateNum } : t));
      setEditingTierId(null);

      await createAuditLog({
        event: 'KOMISI_TIER_DIUBAH',
        status: 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Mengubah Platform Fee tier ${tier?.name || ''} dari ${oldRate}% menjadi ${rateNum}%`,
        targetCollection: 'commission_tiers',
        targetId: tierId
      });

      toast.success(`Platform Fee ${tier?.name} berhasil diperbarui!`);
      fetchCommissionData();
    } catch (err) {
      console.error("Gagal menyimpan Platform Fee:", err);
      toast.error('Gagal menyimpan Platform Fee');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTiers = tiers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between flex-wrap gap-6">
         <div className="space-y-1 border-l-4 border-[#FFB162] pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Mesin Komisi Platform</h1>
            <p className="text-muted-foreground font-medium">Atur pemotongan komisi platform global maupun spesifik per kategori mitra distributor.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black" disabled={isLoading || isSaving}>
               <History size={20} className="mr-2" />
               Riwayat Versi
            </Button>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Menyelaraskan Parameter Pajak...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-12">
           <div className="bg-[#1B2632] rounded-[4rem] p-12 text-[#EEE9DF] shadow-3xl space-y-10 flex flex-col justify-between">
              <div className="space-y-6">
                 <div className="w-16 h-16 bg-[#FFB162]/20 rounded-2xl flex items-center justify-center text-[#FFB162]">
                    <Percent size={32} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tighter italic text-[#FFB162]">Biaya Baseline Global</h3>
                    <p className="text-white/40 font-medium text-sm leading-relaxed">Tarif komisi ini berlaku bagi semua transaksi distributor yang tidak terpetakan dalam skema tier khusus.</p>
                 </div>
              </div>
              
              <div className="space-y-8">
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                       <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Baseline Aktif</p>
                       <div className="flex items-end gap-3">
                          <span className="text-6xl font-black text-[#FFB162] tracking-tighter">{globalBaseline}%</span>
                       </div>
                    </div>
                    <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 group-hover:text-[#FFB162]/10 transition-colors" />
                 </div>

                 <div className="space-y-6">
                 </div>
              </div>
           </div>

           <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-card border border-border/50 p-6 rounded-[2.5rem] shadow-xl gap-4">
                 <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/30 h-14 w-full sm:w-auto">
                    <Button variant="ghost" className="h-full px-8 rounded-xl bg-white shadow-sm font-black text-[10px] uppercase tracking-widest">Berdasarkan Klasifikasi</Button>
                 </div>
                 <div className="relative w-full sm:w-64 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari tier..." 
                      className="w-full h-12 bg-muted/40 border border-border/30 rounded-xl px-12 text-xs font-bold outline-none" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
              </div>

              <div className="grid gap-6">
                 {filteredTiers.length === 0 ? (
                    <div className="text-center py-20 bg-card border border-dashed border-border/50 rounded-[2.5rem] space-y-4">
                       <p className="text-muted-foreground font-black text-lg">Belum ada data komisi.</p>
                       <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">Database `commission_tiers` di Firestore kosong. Harap tambahkan data tingkatan komisi melalui console Firestore.</p>
                    </div>
                 ) : (
                    filteredTiers.map((tier) => (
                      <motion.div
                        key={tier.id}
                        layout
                        className="p-8 bg-card border border-border/50 rounded-[3rem] shadow-xl hover:border-primary/30 transition-all group relative"
                      >
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex items-center gap-6">
                               <div className="w-16 h-16 bg-muted rounded-[2rem] flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                                  <Briefcase size={28} />
                               </div>
                               <div>
                                  <h4 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{tier.name}</h4>
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{tier.partnersActive} Mitra Aktif</p>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-8 self-end sm:self-auto">
                               {editingTierId === tier.id ? (
                                 <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-border">
                                   <input 
                                     type="number" 
                                     step="0.1"
                                     min="0"
                                     max="100"
                                     className="w-16 bg-transparent border-none text-right font-black text-lg focus:outline-none focus:ring-0"
                                     value={editRate}
                                     onChange={(e) => setEditRate(e.target.value)}
                                     autoFocus
                                   />
                                   <span className="font-black text-sm text-muted-foreground">%</span>
                                   <Button 
                                     size="icon" 
                                     className="h-10 w-10 bg-primary text-primary-foreground rounded-xl"
                                     onClick={() => handleSaveRate(tier.id)}
                                     disabled={isSaving}
                                   >
                                     <Save size={16} />
                                   </Button>
                                   <Button 
                                     variant="ghost"
                                     size="icon" 
                                     className="h-10 w-10 text-rose-500 rounded-xl hover:bg-rose-500/10"
                                     onClick={() => setEditingTierId(null)}
                                   >
                                     <X size={16} />
                                   </Button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-8">
                                    <div className="text-right">
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Platform Fee</p>
                                       <p className="text-3xl font-black italic">{tier.platformFee}%</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      className="h-14 w-14 rounded-2xl border-border bg-card shadow-sm hover:scale-110 transition-transform p-0 flex items-center justify-center animate-pulse-slow"
                                      onClick={() => handleStartEdit(tier)}
                                    >
                                       <Settings2 size={24} className="text-muted-foreground" />
                                    </Button>
                                  </div>
                               )}
                            </div>
                         </div>
                       </motion.div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
