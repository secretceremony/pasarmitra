import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
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
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const { user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, 'profiles'));
      const uList: any[] = [];
      querySnapshot.forEach((document) => {
        const data = document.data();
        uList.push({
          id: document.id,
          name: data.full_name || 'Tanpa Nama',
          email: data.email || '',
          role: data.role || 'UMKM',
          status: data.is_suspended ? 'SUSPENDED' : (data.is_verified ? 'ACTIVE' : 'PENDING_VERIFICATION'),
          joined: data.created_at || new Date().toISOString(),
          location: 'Indonesia',
          turnover: 'N/A'
        });
      });
      setUsers(uList);
    } catch (err) {
      console.error("Gagal memuat pengguna:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const isSuspending = currentStatus === 'ACTIVE';
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, { is_suspended: isSuspending });
      
      const updatedStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: updatedStatus } : u));

      // Catat Log Audit
      const targetUser = users.find(u => u.id === userId);
      await createAuditLog({
        event: isSuspending ? 'BLOKIR_PENGGUNA' : 'LEPAS_BLOKIR_PENGGUNA',
        status: isSuspending ? 'WARNING' : 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `${isSuspending ? 'Memblokir' : 'Membuka blokir'} pengguna ${targetUser?.name || ''} (${targetUser?.email || ''})`
      });
    } catch (err) {
      console.error("Gagal memperbarui status pengguna:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini dari database?')) return;
    const targetUser = users.find(u => u.id === userId);
    try {
      await deleteDoc(doc(db, 'profiles', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));

      // Catat Log Audit
      await createAuditLog({
        event: 'HAPUS_PENGGUNA',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Menghapus pengguna ${targetUser?.name || ''} (${targetUser?.email || ''})`
      });
    } catch (err) {
      console.error("Gagal menghapus pengguna:", err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || u.role === filter || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'PENDING_VERIFICATION': return 'Menunggu Verifikasi';
      case 'SUSPENDED': return 'Ditangguhkan';
      default: return status;
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Direktori Pengguna</h1>
            <p className="text-muted-foreground font-medium">Kelola anggota ekosistem dan status verifikasi mereka.</p>
         </div>
         <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
            <Download size={20} className="mr-2" />
            Ekspor Data Pengguna
         </Button>
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Cari berdasarkan nama atau email..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
           {['ALL', 'DISTRIBUTOR', 'UMKM', 'PENDING_VERIFICATION'].map((f) => (
             <Button
               key={f}
               variant={filter === f ? 'default' : 'outline'}
               onClick={() => setFilter(f)}
               className="h-14 px-6 rounded-2xl font-bold uppercase text-xs"
             >
               {f === 'ALL' ? 'Semua' : f === 'PENDING_VERIFICATION' ? 'Butuh Verifikasi' : f}
             </Button>
           ))}
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse">
               <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                     <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anggota Ekosistem</th>
                     <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Klasifikasi</th>
                     <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                     <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Omset / Bulan</th>
                     <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tanggal Bergabung</th>
                     <th className="px-10 py-6 text-right"></th>
                  </tr>
               </thead>
               <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground font-bold">
                        Memuat data pengguna...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground font-bold">
                        Tidak ada anggota ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, i) => (
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
                                  {user.name[0]?.toUpperCase()}
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
                              label={getStatusLabel(user.status)}
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
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-10 w-10 rounded-xl hover:bg-amber-500/10 hover:text-amber-500"
                                 onClick={() => handleToggleStatus(user.id, user.status)}
                               >
                                  {user.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500"
                                 onClick={() => handleDeleteUser(user.id)}
                               >
                                  <Trash2 size={18} />
                               </Button>
                            </div>
                         </td>
                      </motion.tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
         
         <div className="p-8 border-t border-border/50 bg-muted/5 flex items-center justify-between">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
               Menampilkan <span className="text-foreground">{filteredUsers.length}</span> dari {users.length} anggota ekosistem
            </p>
         </div>
      </div>
    </div>
  );
};
