import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Download,
  MoreVertical,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

const DOCUMENTS = [
  { id: 1, name: 'SIUP (Surat Izin Usaha Perdagangan)', status: 'Verified', date: 'Oct 12, 2024', expiry: 'Lifetime' },
  { id: 2, name: 'NIB (Nomor Induk Berusaha)', status: 'Verified', date: 'Oct 12, 2024', expiry: 'Lifetime' },
  { id: 3, name: 'NPWP Perusahaan', status: 'Verified', date: 'Oct 12, 2024', expiry: 'N/A' },
  { id: 4, name: 'Distributor Certificate (Indofood)', status: 'Expiring Soon', date: 'Jan 05, 2023', expiry: 'Jun 20, 2026' },
];

export const LegalDocuments = () => {
  return (
    <div className="space-y-12 pb-20 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-6 border-b-2 border-border/50">
        <div className="space-y-2">
           <div className="flex items-center gap-3 text-emerald-500">
              <ShieldCheck size={28} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Identity & Verification</span>
           </div>
           <h1 className="text-4xl font-black tracking-tighter">Legal Compliance Portfolio</h1>
           <p className="text-muted-foreground font-medium text-lg">Maintain your verification status to access premium enterprise deals.</p>
        </div>
        <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-500/20">
              98%
           </div>
           <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Compliance Score</p>
              <p className="text-lg font-black tracking-tight text-foreground">Tier 1 Verified</p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Active Verifications</h3>
              <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20">
                 <Upload size={18} className="mr-2" />
                 Upload New Document
              </Button>
           </div>

           <div className="grid gap-4">
              {DOCUMENTS.map((doc) => (
                <motion.div 
                  key={doc.id}
                  whileHover={{ x: 4 }}
                  className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex items-center justify-between group hover:border-primary/30 transition-all shadow-xl"
                >
                   <div className="flex items-center gap-8">
                      <div className={cn(
                        "w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-inner",
                        doc.status === 'Verified' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                         <FileText size={28} />
                      </div>
                      <div>
                         <p className="text-xl font-black group-hover:text-primary transition-colors">{doc.name}</p>
                         <div className="flex items-center gap-6 mt-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Added {doc.date}</span>
                            <span className="text-xs font-black text-muted-foreground/30">•</span>
                            <span className={cn(
                              "text-xs font-black uppercase tracking-widest",
                              doc.status === 'Verified' ? "text-emerald-500" : "text-amber-500"
                            )}>{doc.expiry !== 'Lifetime' ? `Expires ${doc.expiry}` : 'Permanent'}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        doc.status === 'Verified' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                         {doc.status === 'Verified' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                         {doc.status}
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5">
                         <Download size={20} className="text-muted-foreground" />
                      </Button>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        <div className="space-y-8">
           <div className="p-10 bg-[#06110B] border border-primary/20 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                    <ShieldCheck size={28} />
                 </div>
                 <div>
                    <h4 className="text-2xl font-black tracking-tighter text-white leading-tight">Privilege Status: <span className="text-primary italic">Distributor Pro</span></h4>
                 </div>
                 <div className="space-y-4">
                    {[
                      'Access to Elite Market',
                      'Credit Term Transactions',
                      'Verified Badge on Search',
                      'Direct Chat with Big Retailers'
                    ].map((perk, i) => (
                      <div key={i} className="flex items-center gap-4 text-white/70 text-sm font-medium">
                         <CheckCircle2 size={16} className="text-primary" />
                         {perk}
                      </div>
                    ))}
                 </div>
              </div>
              <ShieldCheck className="absolute -bottom-10 -right-10 text-primary/5 w-64 h-64 transform rotate-12" />
           </div>

           <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-4">
                 <HelpCircle className="text-muted-foreground" />
                 <h4 className="font-black text-lg">Why Verify?</h4>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                 Verified distributors receive <span className="text-foreground font-bold">4.5x more network requests</span> from reliable UMKM partners and are eligible for our B2B Export programs.
              </p>
              <Button variant="link" className="text-primary font-black p-0 h-auto">Learn about compliance</Button>
           </div>
        </div>
      </div>
    </div>
  );
};
