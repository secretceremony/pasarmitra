import React, { useState } from 'react';
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
  ThumbsDown
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';

const MOCK_DISPUTES = [
  { 
    id: 'DSP-4821', 
    claimant: 'Toko Budi', 
    defendant: 'Wings Group', 
    reason: 'Damaged Goods (Water Ingress)', 
    amount: 'Rp 4,200,000',
    status: 'OPEN',
    priority: 'HIGH',
    evidence: 4,
    created: '2 days ago'
  },
  { 
    id: 'DSP-4822', 
    claimant: 'Warung Barokah', 
    defendant: 'PT. Indofood', 
    reason: 'Partial Shipment (Missing Item)', 
    amount: 'Rp 650,000',
    status: 'IN_MEDIATION',
    priority: 'MEDIUM',
    evidence: 2,
    created: '5 hours ago'
  },
  { 
    id: 'DSP-4823', 
    claimant: 'Kios Hijau', 
    defendant: 'Mayora Indah', 
    reason: 'Pricing Mismatch in Invoice', 
    amount: 'Rp 1,500,000',
    status: 'RESOLVED',
    priority: 'LOW',
    evidence: 1,
    created: '1 week ago'
  },
];

export const DisputeManagement = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = MOCK_DISPUTES.find(d => d.id === selectedId);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-[#A35139] pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Conflict Resolution</h1>
            <p className="text-muted-foreground font-medium">Arbitration and mediation for ecosystem transaction disputes.</p>
         </div>
         <div className="flex gap-4">
            <div className="px-8 py-4 bg-[#A35139]/10 rounded-2xl border border-[#A35139]/20 flex items-center gap-4">
               <Scale className="text-[#A35139]" size={28} />
               <div>
                  <p className="text-xs font-black uppercase text-[#A35139] tracking-widest">Resolution Rate</p>
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
               <input type="text" placeholder="Search by Case ID or entities..." className="w-full h-14 bg-card border border-border/50 rounded-2xl px-14 text-sm font-bold outline-none focus:border-primary/40 transition-all shadow-sm" />
            </div>

            <div className="space-y-4">
               {MOCK_DISPUTES.map((dispute) => (
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
                        label={dispute.status.replace('_', ' ')} 
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
               ))}
            </div>
         </div>

         {/* Arbitration Center */}
         <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
               {selectedId ? (
                 <motion.div
                   key={selectedId}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="bg-card border border-border/50 rounded-[3.5rem] p-12 shadow-2xl space-y-12 h-fit sticky top-10"
                 >
                    <div className="flex justify-between items-start">
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <h2 className="text-4xl font-black tracking-tighter">Arbitration Center</h2>
                             <StatusBadge type="danger" label="Case High Priority" />
                          </div>
                          <p className="text-muted-foreground font-medium max-w-lg">Investigation into product non-conformity and logistics failure during Order #482910.</p>
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
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Claimant Status</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black italic">T</div>
                             <div>
                                <p className="font-black">Toko Budi</p>
                                <p className="text-xs font-bold text-muted-foreground">Certified Partner since 2022</p>
                             </div>
                          </div>
                          <Button variant="ghost" className="w-full h-10 bg-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2">Contact Claimant <MessageSquareText size={14} /></Button>
                       </div>
                       <div className="p-8 bg-muted/20 border border-border/30 rounded-[2.5rem] space-y-4">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Defendant Status</p>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 font-black italic">W</div>
                             <div>
                                <p className="font-black">Wings Group</p>
                                <p className="text-xs font-bold text-muted-foreground">Enterprise Distributor</p>
                             </div>
                          </div>
                          <Button variant="ghost" className="w-full h-10 bg-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2">Contact Defendant <MessageSquareText size={14} /></Button>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-xl font-black flex items-center gap-3">
                          <FileText className="text-[#A35139]" />
                          Evidence & Documents
                       </h3>
                       <div className="grid grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map(idx => (
                            <div key={idx} className="aspect-square bg-muted/30 border border-dashed border-border/50 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-[#A35139] transition-all">
                               <Package size={24} className="text-muted-foreground opactiy-50 group-hover:text-[#A35139]" />
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-8 pt-8 border-t border-border/30">
                       <h3 className="text-2xl font-black tracking-tight">Final Resolution</h3>
                       <div className="grid md:grid-cols-2 gap-6">
                          <Button className="h-16 rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-xl shadow-emerald-500/20 flex gap-3">
                             <CheckCircle2 size={24} />
                             Approve Refund
                          </Button>
                          <Button className="h-16 rounded-2xl bg-rose-600 text-white font-black text-lg shadow-xl shadow-rose-500/20 flex gap-3">
                             <XCircle size={24} />
                             Deny Claim
                          </Button>
                       </div>
                       <Button variant="outline" className="w-full h-14 rounded-2xl border-border bg-card font-black uppercase text-xs tracking-widest flex gap-3">
                          <MessageSquareText size={18} />
                          Transfer to Internal Mediator
                       </Button>
                    </div>
                 </motion.div>
               ) : (
                 <div className="h-[700px] bg-muted/5 border border-dashed border-border/50 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center text-muted-foreground opacity-30">
                       <Gavel size={48} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black italic">Select a Case</h3>
                       <p className="text-muted-foreground font-medium max-w-sm px-10">Choose an active dispute to open the Arbitration Console and begin the investigation process.</p>
                    </div>
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
