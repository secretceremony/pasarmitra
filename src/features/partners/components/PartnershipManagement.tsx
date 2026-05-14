import React from 'react';
import { 
  Users, 
  Handshake, 
  CheckCircle2, 
  XCircle, 
  Search, 
  MapPin, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Phone
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { ReputationBadge } from '../../../components/common/ReputationBadge';
import { cn } from '../../../lib/utils';

const MOCK_REQUESTS = [
  { 
    id: 'REQ-101', 
    name: 'Warung Barokah H. Jaja', 
    location: 'Bandung, Jawa Barat', 
    type: 'Retailer', 
    reputation: 4.8, 
    time: '2 hours ago', 
    verified: true,
    initials: 'WB'
  },
  { 
    id: 'REQ-102', 
    name: 'Toko Kelontong Makmur', 
    location: 'Cirebon, Jawa Barat', 
    type: 'Wholesaler Middle', 
    reputation: 4.2, 
    time: '5 hours ago', 
    verified: false,
    initials: 'TM'
  },
];

const ACTIVE_PARTNERS = [
  { id: 'P-001', name: 'Minimarket Sejahtera', volume: 'Rp 450M / Mo', since: 'Oct 2024', status: 'Gold', rating: 4.9 },
  { id: 'P-002', name: 'Koperasi Karyawan Abadi', volume: 'Rp 1.2B / Mo', since: 'Jan 2024', status: 'Elite', rating: 5.0 },
  { id: 'P-003', name: 'Mitra Sembako Garut', volume: 'Rp 120M / Mo', since: 'Feb 2025', status: 'Silver', rating: 4.5 },
];

export const PartnershipManagement = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 border-l-4 border-primary pl-8 py-2">
          <h1 className="text-4xl font-black tracking-tighter">B2B Network & Partners</h1>
          <p className="text-muted-foreground font-medium text-lg">Scale your distribution reach through verified UMKM partnerships.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              Partnership Settings
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-[#06110B] text-primary font-black shadow-xl shadow-primary/10 border border-primary/20">
              Invite Partner
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left: Pending Requests */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-4">
                 Partner Requests
                 <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs">{MOCK_REQUESTS.length}</span>
              </h3>
              <Button variant="link" className="text-muted-foreground font-bold">Request History</Button>
           </div>

           <div className="grid gap-6">
              {MOCK_REQUESTS.map((req) => (
                <motion.div 
                  key={req.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-card border border-border/50 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-xl group hover:border-primary/30 transition-all relative overflow-hidden"
                >
                   {/* Verification Glow */}
                   {req.verified && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px]" />}
                   
                   <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all font-black text-4xl shadow-inner shrink-0">
                      {req.initials}
                   </div>

                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                         <h4 className="font-black text-2xl tracking-tight leading-none">{req.name}</h4>
                         {req.verified && <ShieldCheck size={20} className="text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-bold text-sm uppercase tracking-widest">
                         <span className="flex items-center gap-2"><MapPin size={16} className="text-primary" /> {req.location}</span>
                         <span className="flex items-center gap-2"><Users size={16} className="text-primary" /> {req.type}</span>
                         <span className="flex items-center gap-2"><Clock size={16} className="text-primary" /> {req.time}</span>
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <ReputationBadge score={req.reputation} size="md" verifications={1} />
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full">VERY RELIABLE</span>
                      </div>
                   </div>

                   <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                      <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20">Accept Partner</Button>
                      <Button variant="outline" className="h-12 px-8 rounded-xl font-black border-border hover:bg-rose-500/10 hover:text-rose-500">Decline</Button>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Right: Active Partners List */}
        <div className="space-y-8">
           <h3 className="text-2xl font-black tracking-tight">Active Partners</h3>
           <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 space-y-6">
                 {ACTIVE_PARTNERS.map((partner) => (
                   <div key={partner.id} className="flex items-center justify-between group p-6 hover:bg-primary/5 rounded-[2rem] transition-all cursor-pointer">
                      <div className="space-y-1">
                         <p className="font-black text-lg group-hover:text-primary transition-colors">{partner.name}</p>
                         <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-muted-foreground">{partner.volume}</span>
                            <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 rounded-full">{partner.status}</span>
                         </div>
                      </div>
                      <ChevronRight size={24} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                   </div>
                 ))}
              </div>
              <div className="p-8 border-t border-border bg-muted/20">
                 <Button variant="outline" className="w-full h-12 rounded-2xl border-border bg-card font-black uppercase tracking-widest text-xs">Manage All Partners</Button>
              </div>
           </div>

           {/* Network Growth Card */}
           <div className="bg-gradient-to-br from-primary via-emerald-600 to-emerald-800 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <TrendingUp size={28} />
                 </div>
                 <div>
                    <p className="text-4xl font-black tracking-tighter">+12.5%</p>
                    <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-1">Network Growth This Quarter</p>
                 </div>
                 <p className="text-sm font-medium leading-relaxed opacity-80">
                    Your distribution reach has expanded to 3 new regions in Central Java.
                 </p>
                 <Button className="w-full h-12 bg-white text-emerald-900 font-black rounded-2xl hover:bg-white/90 shadow-xl">
                    View Network Map
                 </Button>
              </div>
              <Handshake className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64 transform rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
           </div>
        </div>
      </div>
    </div>
  );
};
