import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2,
  MapPin,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Scale,
  Gavel,
  History,
  Search
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';

const PENDING_VERIFICATIONS = [
  { 
    id: '1', 
    company: 'PT. Distribusi Nusantara', 
    type: 'INDUSTRIAL DISTRIBUTOR', 
    submitted: '2 hours ago', 
    status: 'PENDING_REVIEW',
    documents: [
      { name: 'Business License (NIB)', status: 'VERIFIED' },
      { name: 'Tax Registry (NPWP)', status: 'PENDING' },
      { name: 'Warehouse Permit', status: 'PENDING' }
    ],
    requestedBadge: 'Premium Fast Shipper'
  },
  { 
    id: '2', 
    company: 'Toko Sembako Abadi', 
    type: 'WHOLESALE VENDOR', 
    submitted: '5 hours ago', 
    status: 'IN_PROGRESS',
    documents: [
      { name: 'Business License (NIB)', status: 'VERIFIED' },
      { name: 'Personal ID (KTP)', status: 'VERIFIED' }
    ],
    requestedBadge: 'Verified Local Farm'
  },
];

export const DistributorVerification = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = PENDING_VERIFICATIONS.find(v => v.id === selectedId);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-amber-500 pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Identity Verification</h1>
            <p className="text-muted-foreground font-medium">Review and validate corporate entities for platform entry.</p>
         </div>
         <div className="flex items-center gap-4 bg-amber-500/10 px-6 py-3 rounded-2xl border border-amber-500/20">
            <Clock className="text-amber-500" size={24} />
            <div>
               <p className="text-xs font-black uppercase text-amber-500 tracking-widest">Avg. Review Time</p>
               <p className="text-lg font-black italic">4.2 Hours</p>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* List of Applications */}
        <div className="lg:col-span-2 space-y-6">
           <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input type="text" placeholder="Search applications..." className="w-full h-14 bg-card border border-border/50 rounded-2xl px-14 text-sm font-bold shadow-sm outline-none focus:border-primary/40 transition-all" />
           </div>
           
           <div className="space-y-4">
              {PENDING_VERIFICATIONS.map((app) => (
                <motion.div
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={cn(
                    "p-8 bg-card border rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden group",
                    selectedId === app.id ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/30"
                  )}
                >
                   <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                         <Building2 size={24} />
                      </div>
                      <StatusBadge 
                        type={app.status === 'PENDING_REVIEW' ? 'warning' : 'info'} 
                        label={app.status.replace('_', ' ')} 
                      />
                   </div>
                   <div className="space-y-1">
                      <h4 className="font-black text-xl tracking-tight leading-tight">{app.company}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{app.type}</p>
                   </div>
                   <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30 text-xs font-bold text-muted-foreground">
                      <span className="flex items-center gap-2"><Clock size={14} /> {app.submitted}</span>
                      <ArrowRight size={16} className={cn("transition-transform", selectedId === app.id ? "translate-x-0" : "-translate-x-4 opacity-0")} />
                   </div>
                   {selectedId === app.id && <div className="absolute top-0 right-0 w-2 h-full bg-primary" />}
                </motion.div>
              ))}
           </div>
        </div>

        {/* Details View */}
        <div className="lg:col-span-3">
           <AnimatePresence mode="wait">
              {selectedId ? (
                <motion.div
                  key={selectedId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card border border-border/50 rounded-[3rem] p-12 shadow-2xl space-y-10 sticky top-10"
                >
                   <div className="flex justify-between items-start">
                      <div className="space-y-3">
                         <div className="flex items-center gap-4">
                            <h2 className="text-4xl font-black tracking-tighter">{selected?.company}</h2>
                            <ShieldCheck className="text-primary" size={32} />
                         </div>
                         <div className="flex items-center gap-6 text-muted-foreground font-bold">
                            <span className="flex items-center gap-2"><MapPin size={18} /> Jakarta Utara, ID</span>
                            <span className="flex items-center gap-2"><Clock size={18} /> ID: VERIF-{selected?.id}</span>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <Button variant="outline" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-500/10 border-border">
                            <XCircle size={24} />
                         </Button>
                         <Button className="h-12 w-12 rounded-xl bg-primary text-primary-foreground">
                            <CheckCircle2 size={24} />
                         </Button>
                      </div>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-muted/20 p-8 rounded-[2rem] border border-border/30 space-y-6">
                         <h3 className="text-lg font-black flex items-center gap-3">
                            <FileText className="text-primary" size={20} />
                            Document Checklist
                         </h3>
                         <div className="space-y-4">
                            {selected?.documents.map((doc, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-border/30 group cursor-pointer hover:border-primary/40">
                                 <span className="text-sm font-bold text-muted-foreground">{doc.name}</span>
                                 <div className="flex items-center gap-3">
                                    <StatusBadge type={doc.status === 'VERIFIED' ? 'success' : 'warning'} label={doc.status} />
                                    <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-[#1B2632] p-8 rounded-[2rem] text-[#EEE9DF] space-y-6">
                         <h3 className="text-lg font-black flex items-center gap-3 text-primary">
                            <ShieldCheck size={20} />
                            Badge Assessment
                         </h3>
                         <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                            <p className="text-xs font-black uppercase text-white/40 tracking-widest">Requested Badge:</p>
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                  <ShieldCheck size={24} />
                               </div>
                               <span className="text-lg font-black italic">{selected?.requestedBadge}</span>
                            </div>
                         </div>
                         <Button className="w-full h-12 bg-white/10 hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all">
                            Approve Special Badge
                         </Button>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                         <History className="text-primary" />
                         Internal Audit Note
                      </h3>
                      <textarea 
                        placeholder="Add a reason for approval or rejection (logged)..." 
                        className="w-full h-32 bg-muted/20 border border-border/50 rounded-2xl p-6 text-sm font-medium outline-none focus:border-primary/40 transition-all resize-none"
                      />
                   </div>

                   <div className="flex gap-4">
                      <Button className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-xl shadow-primary/20 flex gap-4">
                         Complete Verification
                         <ShieldCheck size={24} />
                      </Button>
                      <Button variant="outline" className="h-16 px-10 rounded-2xl border-border bg-card font-black">
                         Escalate to Legal
                      </Button>
                   </div>
                </motion.div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-6 bg-muted/10 border border-dashed border-border/50 rounded-[3rem]">
                   <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-20">
                      <Scale size={48} />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black italic">Judiciary Overview</h3>
                      <p className="text-muted-foreground font-medium max-w-sm">Select an application from the side panel to begin identity and document verification procedures.</p>
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
