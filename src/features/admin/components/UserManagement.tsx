import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ShieldCheck, 
  ShieldAlert, 
  Ban, 
  CheckCircle2, 
  Mail, 
  Phone,
  Briefcase,
  Store,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';

const MOCK_USERS = [
  { id: '1', name: 'Budi Santoso', email: 'budi@warungbarokah.com', role: 'UMKM', status: 'ACTIVE', joined: '2024-01-15', location: 'Jakarta', turnover: 'Rp 45M' },
  { id: '2', name: 'Siti Aminah', email: 'siti@distrimaju.co.id', role: 'DISTRIBUTOR', status: 'PENDING_VERIFICATION', joined: '2024-03-10', location: 'Surabaya', turnover: 'N/A' },
  { id: '3', name: 'Agus Pratama', email: 'agus@sembakomurah.id', role: 'DISTRIBUTOR', status: 'ACTIVE', joined: '2023-11-20', location: 'Bandung', turnover: 'Rp 820M' },
  { id: '4', name: 'Dewi Lestari', email: 'dewi@kioshijau.com', role: 'UMKM', status: 'SUSPENDED', joined: '2024-02-05', location: 'Medan', turnover: 'Rp 12M' },
  { id: '5', name: 'Hendra Wijaya', email: 'hendra@indofood.com', role: 'DISTRIBUTOR', status: 'ACTIVE', joined: '2024-04-01', location: 'Jakarta', turnover: 'Rp 4.2B' },
  { id: '6', name: 'Lia Rahma', email: 'lia@tokokelontong.id', role: 'UMKM', status: 'ACTIVE', joined: '2024-03-25', location: 'Semarang', turnover: 'Rp 28M' },
];

export const UserManagement = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filteredUsers = MOCK_USERS.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || u.role === filter || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">User Directory</h1>
            <p className="text-muted-foreground font-medium">Manage ecosystem participants and security credentials.</p>
         </div>
         <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
            <Download size={20} className="mr-2" />
            Export User Data
         </Button>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-card border border-border/50 p-6 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 shadow-xl sticky top-28 z-30 backdrop-blur-3xl bg-card/80">
         <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or company name..." 
              className="w-full h-14 bg-muted/40 border border-border/30 focus:border-primary/40 px-16 rounded-2xl text-sm font-bold outline-none transition-all"
            />
         </div>
         <div className="flex gap-4">
            <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/30">
               {['ALL', 'UMKM', 'DISTRIBUTOR'].map(f => (
                 <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-6 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-white/10"
                  )}
                 >
                   {f}
                 </button>
               ))}
            </div>
            <Button variant="outline" className="h-14 w-14 rounded-2xl border-border bg-card">
               <Filter size={20} />
            </Button>
         </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-border/50 bg-muted/10">
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ecosystem Member</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Classification</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume/Mo</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Joined At</th>
                     <th className="px-10 py-6 text-right"></th>
                  </tr>
               </thead>
               <tbody>
                  {filteredUsers.map((user, i) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group hover:bg-primary/5 transition-all border-b border-border/30 last:border-none"
                    >
                       <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                {user.name[0]}
                             </div>
                             <div className="flex flex-col">
                                <span className="font-black text-lg group-hover:text-primary transition-colors">{user.name}</span>
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                   <Mail size={12} /> {user.email}
                                </span>
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-8">
                          <div className={cn(
                            "flex items-center gap-2 w-fit px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border",
                            user.role === 'DISTRIBUTOR' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                             {user.role === 'DISTRIBUTOR' ? <Briefcase size={12} /> : <Store size={12} />}
                             {user.role}
                          </div>
                       </td>
                       <td className="px-10 py-8">
                          <StatusBadge 
                            type={user.status === 'ACTIVE' ? 'success' : user.status === 'PENDING_VERIFICATION' ? 'warning' : 'danger'} 
                            label={user.status.replace('_', ' ')}
                          />
                       </td>
                       <td className="px-10 py-8 font-black font-mono text-sm uppercase">
                          {user.turnover}
                       </td>
                       <td className="px-10 py-8 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {new Date(user.joined).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                       </td>
                       <td className="px-10 py-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                                <Eye size={18} />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-amber-500/10 hover:text-amber-500">
                                {user.status === 'SUSPENDED' ? <Unlock size={18} /> : <Lock size={18} />}
                             </Button>
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500">
                                <Trash2 size={18} />
                             </Button>
                          </div>
                       </td>
                    </motion.tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         {/* Table Pagination Overlay */}
         <div className="p-8 border-t border-border/50 bg-muted/5 flex items-center justify-between">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
               Displaying <span className="text-foreground">{filteredUsers.length}</span> of 842 ecosystem members
            </p>
            <div className="flex items-center gap-4">
               <Button variant="outline" className="h-12 w-12 rounded-xl border-border bg-card">
                  <ChevronLeft size={20} />
               </Button>
               <div className="flex gap-2">
                  {[1, 2, 3, '...', 12].map((p, i) => (
                    <Button 
                      key={i} 
                      variant="ghost" 
                      className={cn("h-12 w-12 rounded-xl font-black", p === 1 ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground")}
                    >
                       {p}
                    </Button>
                  ))}
               </div>
               <Button variant="outline" className="h-12 w-12 rounded-xl border-border bg-card">
                  <ChevronRight size={20} />
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
