import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Percent, 
  Settings2, 
  Save, 
  History, 
  ArrowUpRight, 
  Info,
  DollarSign,
  Briefcase,
  Store,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const COMMISSION_TIERS = [
  { id: '1', name: 'Standard Distributor', type: 'DISTRIBUTOR', baseRate: '5.0%', activePartners: 420 },
  { id: '2', name: 'Strategic Enterprise', type: 'DISTRIBUTOR', baseRate: '3.5%', activePartners: 12 },
  { id: '3', name: 'Local Farmers (Niche)', type: 'DISTRIBUTOR', baseRate: '2.0%', activePartners: 84 },
  { id: '4', name: 'Sembako Wholesale', type: 'DISTRIBUTOR', baseRate: '4.5%', activePartners: 156 },
];

export const CommissionManagement = () => {
  const [editingTier, setEditingTier] = useState<string | null>(null);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-[#FFB162] pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Commission Engine</h1>
            <p className="text-muted-foreground font-medium">Configure global and tier-specific transaction taxations.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
               <History size={20} className="mr-2" />
               Version History
            </Button>
            <Button className="h-14 px-8 rounded-2xl bg-[#FFB162] text-[#1B2632] font-black shadow-xl shadow-[#FFB162]/20">
               <Plus size={20} className="mr-2" />
               Create Custom Tier
            </Button>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
         {/* Global Config */}
         <div className="bg-[#1B2632] rounded-[4rem] p-12 text-[#EEE9DF] shadow-3xl space-y-10">
            <div className="space-y-4">
               <div className="w-16 h-16 bg-[#FFB162]/20 rounded-2xl flex items-center justify-center text-[#FFB162]">
                  <Percent size={32} />
               </div>
               <h3 className="text-3xl font-black tracking-tighter italic">Global Marketplace Fee</h3>
               <p className="text-white/40 font-medium">This rate applies to all transactions not mapped to a specific tier.</p>
            </div>
            
            <div className="space-y-8">
               <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                  <div className="relative z-10 space-y-4">
                     <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Active Baseline</p>
                     <div className="flex items-end gap-3">
                        <span className="text-6xl font-black text-[#FFB162] tracking-tighter">4.8</span>
                        <span className="text-2xl font-black opacity-40 mb-2">%</span>
                     </div>
                  </div>
                  <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 group-hover:text-[#FFB162]/10 transition-colors" />
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                     <Info size={20} />
                     <p className="text-xs font-bold leading-tight">Changing the global fee will trigger a notifications for all 12,000+ ecosystem members.</p>
                  </div>
                  <Button className="w-full h-16 rounded-2xl bg-[#FFB162] text-black font-black text-xl hover:bg-white transition-all">
                     Recalibrate Baseline
                  </Button>
               </div>
            </div>
         </div>

         {/* Tiers Management */}
         <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between bg-card border border-border/50 p-6 rounded-[2.5rem] shadow-xl">
               <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/30 h-14">
                  <Button variant="ghost" className="h-full px-8 rounded-xl bg-white shadow-sm font-black text-[10px] uppercase tracking-widest">By Entity Type</Button>
                  <Button variant="ghost" className="h-full px-8 rounded-xl text-muted-foreground font-black text-[10px] uppercase tracking-widest">By Volume</Button>
               </div>
               <div className="relative w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input type="text" placeholder="Search tiers..." className="w-full h-12 bg-muted/40 border border-border/30 rounded-xl px-12 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="grid gap-6">
               {COMMISSION_TIERS.map((tier) => (
                 <motion.div
                   key={tier.id}
                   layout
                   className="p-8 bg-card border border-border/50 rounded-[3rem] shadow-xl hover:border-primary/30 transition-all group"
                 >
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-muted rounded-[2rem] flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                             <Briefcase size={28} />
                          </div>
                          <div>
                             <h4 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{tier.name}</h4>
                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{tier.activePartners} Partners Active</p>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-12">
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Fee Rate</p>
                             <p className="text-3xl font-black italic">{tier.baseRate}</p>
                          </div>
                          <Button variant="ghost" className="h-14 w-14 rounded-2xl border-border bg-card shadow-sm hover:scale-110 transition-transform">
                             <Settings2 size={24} />
                          </Button>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
            
            <div className="p-10 bg-primary border-4 border-[#1B2632] rounded-[4rem] text-primary-foreground relative overflow-hidden shadow-2xl flex flex-col items-center text-center gap-6">
               <RefreshCw className="absolute -top-10 -left-10 w-48 h-48 opacity-10 animate-spin-slow" />
               <div className="relative z-10 space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter">Automatic Optimization</h3>
                  <p className="text-sm font-medium opacity-80 max-w-sm">Enable AI-driven commission adjustment based on real-time market liquidity and volume thresholds.</p>
               </div>
               <Button className="bg-[#1B2632] text-white font-black uppercase text-xs tracking-[0.2em] px-10 h-14 rounded-2xl hover:bg-white hover:text-black transition-all">
                  Run Auto-Balancer
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
