import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Box, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Search, 
  Eye, 
  AlertTriangle,
  Flag,
  ThumbsDown,
  Trash2,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';

const PENDING_MODERATION = [
  { 
    id: '1', 
    type: 'PRODUCT', 
    title: 'Minyak Goreng Sawit 2L', 
    author: 'Toko Sembako Jaya', 
    reason: 'Suspicious Pricing (Too Low)', 
    severity: 'MEDIUM',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60',
    timestamp: '10 mins ago'
  },
  { 
    id: '2', 
    type: 'REVIEW', 
    title: 'Review for PT. Indofood', 
    author: 'User_482', 
    reason: 'Profanity/Hate Speech', 
    severity: 'HIGH',
    content: 'This distributor is a scam, they never ship on time and the staff is extremely rude...',
    timestamp: '45 mins ago'
  },
  { 
    id: '3', 
    type: 'PRODUCT', 
    title: 'Pharmaceutical Supplies (Wholesale)', 
    author: 'Medika Global', 
    reason: 'Restricted Item Category', 
    severity: 'HIGH',
    image: 'https://images.unsplash.com/photo-1587854680352-936b22b91030?w=500&auto=format&fit=crop&q=60',
    timestamp: '2 hours ago'
  },
];

export const ModerationSystem = () => {
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS' | 'REVIEWS'>('ALL');

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-rose-500 pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Content Moderation</h1>
            <p className="text-muted-foreground font-medium">Protect ecosystem integrity through selective filtering and report management.</p>
         </div>
         <div className="flex bg-muted p-1 rounded-2xl border border-border shadow-inner">
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('ALL')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'ALL' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >All Reports</Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('PRODUCTS')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'PRODUCTS' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >Products</Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('REVIEWS')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'REVIEWS' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >Reviews</Button>
         </div>
      </div>

      <div className="bg-card border border-border/50 p-6 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 shadow-xl sticky top-28 z-30 backdrop-blur-3xl bg-card/80">
         <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input type="text" placeholder="Filter by author, reason or content..." className="w-full h-14 bg-muted/40 border border-border/30 px-16 rounded-2xl text-sm font-bold outline-none focus:border-primary/40 transition-all font-sans" />
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
               <Filter size={20} className="mr-2" />
               Severity: High
            </Button>
            <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/30 h-14">
               <Button variant="ghost" className={cn("h-full px-4 rounded-xl", viewMode === 'GRID' ? "bg-white shadow-sm" : "")} onClick={() => setViewMode('GRID')}><LayoutGrid size={20} /></Button>
               <Button variant="ghost" className={cn("h-full px-4 rounded-xl", viewMode === 'LIST' ? "bg-white shadow-sm" : "")} onClick={() => setViewMode('LIST')}><List size={20} /></Button>
            </div>
         </div>
      </div>

      <div className={cn("grid gap-8", viewMode === 'GRID' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
         {PENDING_MODERATION.map((item, i) => (
           <motion.div
             key={item.id}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className={cn(
               "bg-card border border-border/50 shadow-xl relative overflow-hidden group hover:border-primary/30 transition-all",
               viewMode === 'LIST' ? "rounded-[3rem] p-10 flex items-center gap-10" : "rounded-[2.5rem] flex flex-col h-full"
             )}
           >
              {/* Severity Indicator Strip */}
              <div className={cn(
                "absolute top-0 left-0 w-2 h-full",
                item.severity === 'HIGH' ? "bg-rose-500" : "bg-amber-500"
              )} />

              {/* Resource Preview */}
              <div className={cn(
                "relative bg-muted/20 flex items-center justify-center overflow-hidden",
                viewMode === 'LIST' ? "w-48 h-48 rounded-[2rem] shrink-0" : "w-full aspect-video"
              )}>
                 {item.type === 'PRODUCT' ? (
                   <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 ) : (
                   <div className="flex flex-col items-center gap-3">
                      <MessageSquare size={48} className="text-muted-foreground/30" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Review Content</span>
                   </div>
                 )}
                 <div className="absolute top-4 left-4">
                    <StatusBadge type={item.type === 'PRODUCT' ? 'info' : 'warning'} label={item.type} />
                 </div>
              </div>

              {/* Info Content */}
              <div className="flex-1 space-y-6">
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <h3 className="text-2xl font-black tracking-tight leading-tight">{item.title}</h3>
                       <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2"><Clock size={12} /> {item.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                       <span className="flex items-center gap-2 italic uppercase tracking-wider underline "><User size={14} /> {item.author}</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-border" />
                       <span className="flex items-center gap-2 text-rose-500"><AlertTriangle size={14} /> {item.reason}</span>
                    </div>
                 </div>

                 {item.type === 'REVIEW' && (
                   <p className="p-6 bg-muted/20 border border-border/30 rounded-2xl text-sm font-medium italic text-muted-foreground leading-relaxed">
                      "{item.content}"
                   </p>
                 )}

                 <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <div className="flex gap-2">
                       <Button variant="outline" className="h-12 w-12 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all">
                          <CheckCircle2 size={24} />
                       </Button>
                       <Button variant="outline" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
                          <XCircle size={24} />
                       </Button>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest flex gap-2">
                          Inspect <Eye size={16} />
                       </Button>
                       <Button variant="ghost" className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-rose-500 flex gap-2">
                          Delete <Trash2 size={16} />
                       </Button>
                    </div>
                 </div>
              </div>
           </motion.div>
         ))}
      </div>
      
      {/* Platform Integrity Card */}
      <div className="bg-[#1B2632] rounded-[4rem] p-16 text-[#EEE9DF] relative overflow-hidden shadow-3xl flex flex-col lg:flex-row gap-16 items-center">
         <div className="flex-1 space-y-8">
            <h2 className="text-5xl font-black tracking-tighter leading-tight">Ecosystem <br /><span className="text-[#FFB162]">AI Safeguard.</span></h2>
            <p className="text-white/60 font-medium text-lg leading-relaxed max-w-lg">Our moderation logic uses advanced NLP to flag suspicious behavior, pricing anomalies, and non-corporate content before it reaches the main market.</p>
            <div className="flex gap-6">
               <div className="px-8 py-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-4xl font-black text-[#FFB162]">84%</p>
                  <p className="text-[10px] font-black uppercase text-white/40 mt-1">Auto-Filtered</p>
               </div>
               <div className="px-8 py-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-4xl font-black text-[#FFB162]">0.2s</p>
                  <p className="text-[10px] font-black uppercase text-white/40 mt-1">Latency</p>
               </div>
            </div>
         </div>
         <div className="w-full lg:w-1/3 bg-white/5 p-10 rounded-[3rem] border border-white/10 space-y-6">
            <h4 className="text-xl font-black tracking-tight flex items-center gap-3">
               <Flag className="text-[#FFB162]" />
               Moderator Log
            </h4>
            <div className="space-y-4">
               {[
                 { action: 'Product Deleted', target: 'SKU-4829', mod: 'AI-Guard' },
                 { action: 'Review Flagged', target: 'Indo-482', mod: 'Budi.S' },
                 { action: 'Company Ban', target: 'Maju Jaya', mod: 'Lead.Admin' }
               ].map((log, i) => (
                 <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl text-xs font-bold border border-white/5">
                    <div className="flex flex-col">
                       <span className="text-[#FFB162]">{log.action}</span>
                       <span className="opacity-40">{log.target}</span>
                    </div>
                    <span className="px-3 py-1 bg-white/10 rounded-full">{log.mod}</span>
                 </div>
               ))}
            </div>
            <Button className="w-full h-12 bg-[#FFB162] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all">Audit Logs</Button>
         </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
