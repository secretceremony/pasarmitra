import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  Star, 
  MapPin, 
  MessageSquareText, 
  ArrowRight,
  TrendingUp,
  Building2
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ReputationBadge, ReputationLevel } from '../../../components/common/ReputationBadge';
import { useNavigate } from 'react-router-dom';

const MOCK_PARTNERS: { id: string, name: string, type: string, location: string, rating: number, activeOrders: number, volume: string, reputation: ReputationLevel }[] = [
  { id: '1', name: 'PT. Indofood Sukses Makmur', type: 'Platinum Partner', location: 'Jakarta', rating: 4.9, activeOrders: 12, volume: 'Rp 420M', reputation: 'elite' },
  { id: '2', name: 'Wings Group Indonesia', type: 'Verified Supplier', location: 'Surabaya', rating: 4.8, activeOrders: 5, volume: 'Rp 125M', reputation: 'trusted' },
  { id: '3', name: 'Mayora Indah Tbk', type: 'Preferred Vendor', location: 'Tangerang', rating: 4.7, activeOrders: 0, volume: 'Rp 88M', reputation: 'neutral' },
];

export const MyPartners = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">My Partnerships</h1>
            <p className="text-muted-foreground font-medium">Manage your active wholesale supplier network.</p>
         </div>
         <Button onClick={() => navigate('/marketplace')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
            <Building2 size={20} className="mr-2" />
            Find New Partners
         </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
              <Users size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">42</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Active Partners</p>
        </div>
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
              <TrendingUp size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">Rp 2.4B</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Annual Procurement</p>
        </div>
        <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
              <ShieldCheck size={24} />
           </div>
           <h3 className="text-3xl font-black tracking-tighter">Elite</h3>
           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">UMKM Trust Level</p>
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl w-fit">
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black bg-white shadow-sm">All Partners</Button>
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black text-muted-foreground">Active Negotiating</Button>
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black text-muted-foreground">Blacklisted</Button>
         </div>

         <div className="grid gap-6">
            {MOCK_PARTNERS.map((partner, i) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-card border border-border/50 rounded-[3rem] shadow-xl flex items-center gap-8 group hover:border-primary/30 transition-all"
              >
                 <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary font-black text-4xl shadow-inner group-hover:bg-primary group-hover:text-black transition-all">
                    {partner.name[0]}
                 </div>
                 <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                       <h3 className="text-2xl font-black tracking-tight">{partner.name}</h3>
                       <ReputationBadge level={partner.reputation} size="sm" />
                    </div>
                    <div className="flex items-center gap-6 text-muted-foreground font-bold text-sm">
                       <span className="flex items-center gap-2"><MapPin size={16} /> {partner.location}</span>
                       <span className="flex items-center gap-2 text-primary uppercase text-[10px] tracking-widest">{partner.type}</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-12 px-12 border-x border-border/50 text-center">
                    <div>
                       <p className="text-xl font-black">{partner.activeOrders}</p>
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Orders</p>
                    </div>
                    <div>
                       <p className="text-xl font-black italic">{partner.volume}</p>
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Volume</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-border hover:bg-primary/5">
                       <MessageSquareText size={24} />
                    </Button>
                    <Button onClick={() => navigate(`/distributor/${partner.id}`)} className="h-14 px-8 rounded-2xl bg-secondary hover:bg-primary hover:text-black font-black flex gap-2">
                       Portfolio <ArrowRight size={20} />
                    </Button>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>
    </div>
  );
};
