import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Handshake, 
  Search, 
  MapPin, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { ReputationBadge } from '../../../components/common/ReputationBadge';
import { cn } from '../../../lib/utils';
import { partnerService, Partnership } from '../services/partnerService';
import { useAuthStore } from '../../../store/use-auth-store';

export const PartnershipManagement = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Partnership[]>([]);
  const [activePartners, setActivePartners] = useState<Partnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [reqData, activeData] = await Promise.all([
        partnerService.getPartnershipRequests(user.id),
        partnerService.getActivePartners(user.id),
      ]);
      setRequests(reqData);
      setActivePartners(activeData);
    } catch (err) {
      console.error("Gagal memuat data kemitraan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleStatusUpdate = async (id: string, status: 'active' | 'rejected') => {
    try {
      const updated = await partnerService.updatePartnershipStatus(id, status);
      // Remove from requests list
      setRequests(prev => prev.filter(r => r.id !== id));
      // If active, add to active partners list
      if (status === 'active') {
        setActivePartners(prev => [updated, ...prev]);
      }
    } catch (err) {
      console.error("Gagal memperbarui status kemitraan:", err);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 border-l-4 border-primary pl-8 py-2">
          <h1 className="text-4xl font-black tracking-tighter">Jaringan & Mitra B2B</h1>
          <p className="text-muted-foreground font-medium text-lg">Tingkatkan jangkauan distribusi Anda melalui kemitraan UMKM yang terverifikasi.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              Pengaturan Kemitraan
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-[#06110B] text-primary font-black shadow-xl shadow-primary/10 border border-primary/20">
              Undang Mitra
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left: Pending Requests */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-4">
                 Permintaan Kemitraan
                 <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs">
                   {isLoading ? '...' : requests.length}
                 </span>
              </h3>
              <Button variant="link" className="text-muted-foreground font-bold">Riwayat Permintaan</Button>
           </div>

           <div className="grid gap-6">
              {isLoading ? (
                <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[3rem] font-bold">
                  Memuat permintaan...
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center bg-card border border-dashed border-border/60 rounded-[3rem]">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
                    <Handshake size={26} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-black text-foreground">Tidak ada permintaan kemitraan tertunda.</p>
                    <p className="text-xs font-medium text-muted-foreground">Permintaan baru dari UMKM akan muncul di sini setelah mereka mengunjungi profil distributor Anda.</p>
                  </div>
                </div>
              ) : (
                requests.map((req) => {
                  const umkm = req.umkm_profile;
                  const name = umkm?.organization_name || 'Mitra UMKM';
                  const initials = name.slice(0, 2).toUpperCase();
                  const location = (umkm as any)?.address || 'Balikpapan, Kalimantan Timur';
                  
                  return (
                    <motion.div 
                      key={req.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-card border border-border/50 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-xl group hover:border-primary/30 transition-all relative overflow-hidden"
                    >
                       {/* Verification Glow */}
                       {umkm?.is_verified && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px]" />}
                       
                       <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all font-black text-4xl shadow-inner shrink-0">
                          {initials}
                       </div>

                       <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                             <h4 className="font-black text-2xl tracking-tight leading-none">{name}</h4>
                             {umkm?.is_verified && <ShieldCheck size={20} className="text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />}
                          </div>
                          <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-bold text-sm uppercase tracking-widest">
                             <span className="flex items-center gap-2"><MapPin size={16} className="text-primary" /> {location}</span>
                             <span className="flex items-center gap-2"><Users size={16} className="text-primary" /> Pengecer</span>
                             <span className="flex items-center gap-2"><Clock size={16} className="text-primary" /> {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex items-center gap-4 pt-2">
                            <ReputationBadge score={umkm?.reputation_score || 0} size="md" verifications={1} />
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                              {(umkm?.reputation_score || 0) >= 4.5 ? 'SANGAT TERPERCAYA' : 'TERPERCAYA'}
                            </span>
                          </div>
                       </div>

                       <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                          <Button 
                            onClick={() => handleStatusUpdate(req.id, 'active')}
                            className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20"
                          >
                            Terima Mitra
                          </Button>
                          <Button 
                            onClick={() => handleStatusUpdate(req.id, 'rejected')}
                            variant="outline" 
                            className="h-12 px-8 rounded-xl font-black border-border hover:bg-rose-500/10 hover:text-rose-500"
                          >
                            Tolak
                          </Button>
                       </div>
                    </motion.div>
                  );
                })
              )}
           </div>
        </div>

        {/* Right: Active Partners List */}
        <div className="space-y-8">
           <h3 className="text-2xl font-black tracking-tight">Mitra Aktif</h3>
           <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 space-y-6">
                 {isLoading ? (
                   <p className="text-sm text-center text-muted-foreground font-bold">Memuat mitra...</p>
                 ) : activePartners.length === 0 ? (
                   <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                     <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
                       <Users size={22} strokeWidth={1.5} />
                     </div>
                     <div className="space-y-1">
                       <p className="text-sm font-black text-foreground">Belum ada mitra aktif.</p>
                       <p className="text-xs font-medium text-muted-foreground">Terima permintaan kemitraan dari daftar di atas untuk memulai.</p>
                     </div>
                   </div>
                 ) : (
                   activePartners.map((partner) => {
                     const umkm = partner.umkm_profile;
                     const name = umkm?.organization_name || 'Mitra UMKM';
                     
                     return (
                       <div key={partner.id} className="flex items-center justify-between group p-6 hover:bg-primary/5 rounded-[2rem] transition-all cursor-pointer">
                          <div className="space-y-1">
                             <p className="font-black text-lg group-hover:text-primary transition-colors">{name}</p>
                             <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-muted-foreground">Mitra Aktif</span>
                                <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 rounded-full">
                                  {umkm?.reputation_score ? `${umkm.reputation_score} ★` : 'Aktif'}
                                </span>
                             </div>
                          </div>
                          <ChevronRight size={24} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                       </div>
                     );
                   })
                 )}
              </div>
              <div className="p-8 border-t border-border bg-muted/20">
                 <Button variant="outline" className="w-full h-12 rounded-2xl border-border bg-card font-black uppercase tracking-widest text-xs">Kelola Semua Mitra</Button>
              </div>
           </div>

           {/* Network Growth Card */}
           <div className="bg-gradient-to-br from-primary via-emerald-600 to-emerald-800 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                     <p className="text-4xl font-black tracking-tighter">+{activePartners.length > 0 ? (activePartners.length * 15).toFixed(1) : 0}%</p>
                     <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-1">Pertumbuhan Jaringan Kuartal Ini</p>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-80">
                     Jangkauan distribusi Anda berkembang secara dinamis melalui kemitraan UMKM yang terverifikasi.
                  </p>
                  <Button className="w-full h-12 bg-white text-emerald-900 font-black rounded-2xl hover:bg-white/90 shadow-xl">
                     Lihat Peta Jaringan
                  </Button>
               </div>
               <Handshake className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64 transform rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
            </div>
         </div>
      </div>
    </div>
  );
};
