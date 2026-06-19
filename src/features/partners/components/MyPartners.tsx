import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  MapPin, 
  MessageSquareText, 
  ArrowRight, 
  TrendingUp, 
  Building2 
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ReputationBadge } from '../../../components/common/ReputationBadge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/use-auth-store';
import { partnerService, Partnership } from '../services/partnerService';

export const MyPartners = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user?.id) return;
      try {
        setIsLoading(true);
        const data = await partnerService.getActivePartners(user.id);
        setPartnerships(data);
      } catch (err) {
        console.error("Gagal memuat daftar mitra:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, [user?.id]);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Kemitraan Saya</h1>
            <p className="text-muted-foreground font-medium">Kelola jaringan distributor grosir aktif Anda.</p>
         </div>
         <Button onClick={() => navigate('/marketplace')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
            <Building2 size={20} className="mr-2" />
            Cari Mitra Baru
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
              <Users size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">{partnerships.length}</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Mitra Aktif</p>
        </div>
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
              <TrendingUp size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">Rp 2.4M</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pengadaan Tahunan</p>
        </div>
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
              <ShieldCheck size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">Elite</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tingkat Kepercayaan UMKM</p>
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl w-fit">
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black bg-white shadow-sm">Semua Mitra</Button>
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black text-muted-foreground">Aktif Negosiasi</Button>
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black text-muted-foreground">Daftar Hitam</Button>
         </div>

         <div className="grid gap-6">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[3rem] font-bold">
                Memuat daftar mitra...
              </div>
            ) : partnerships.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[3rem] font-bold">
                Belum ada kemitraan aktif. Klik "Cari Mitra Baru" untuk berjejaring.
              </div>
            ) : (
              partnerships.map((partner, i) => {
                const isDist = user?.role === 'DISTRIBUTOR';
                const profile = partner.umkm_profile;
                const name = profile?.organization_name || profile?.owner_name || 'Mitra UMKM';
                const initials = name.slice(0, 2).toUpperCase();
                
                return (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 bg-card border border-border/50 rounded-[3rem] shadow-xl flex items-center gap-8 group hover:border-primary/30 transition-all"
                  >
                     <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary font-black text-4xl shadow-inner group-hover:bg-primary group-hover:text-black transition-all">
                        {initials}
                     </div>
                     <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                           <h3 className="text-2xl font-black tracking-tight">{name}</h3>
                           <ReputationBadge score={profile?.reputation_score || 4.5} size="sm" />
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground font-bold text-sm">
                           <span className="flex items-center gap-2"><MapPin size={16} /> Bandung, Jawa Barat</span>
                           <span className="flex items-center gap-2 text-primary uppercase text-[10px] tracking-widest">
                             {isDist ? 'Mitra UMKM' : 'Platinum Partner'}
                           </span>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-12 px-12 border-x border-border/50 text-center">
                        <div>
                           <p className="text-xl font-black">0</p>
                           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pesanan Aktif</p>
                        </div>
                        <div>
                           <p className="text-xl font-black italic">Rp 0</p>
                           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Volume</p>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="outline" className="h-14 w-14 rounded-2xl border-border hover:bg-primary/5">
                           <MessageSquareText size={24} />
                        </Button>
                        <Button 
                          onClick={() => navigate(isDist ? `/partners` : `/distributor/${partner.distributor_id}`)} 
                          className="h-14 px-8 rounded-2xl bg-secondary hover:bg-primary hover:text-black font-black flex gap-2"
                        >
                           Portofolio <ArrowRight size={20} />
                        </Button>
                     </div>
                  </motion.div>
                );
              })
            )}
         </div>
      </div>
    </div>
  );
};
