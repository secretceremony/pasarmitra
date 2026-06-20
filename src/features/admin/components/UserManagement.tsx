import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Mail, 
  Briefcase, 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Eye, 
  Trash2, 
  Lock, 
  Unlock,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../../lib/dateUtils';

const getNormalizedRole = (roleStr: string): 'ADMIN' | 'DISTRIBUTOR' | 'UMKM' => {
  const r = (roleStr || '').trim().toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'DISTRIBUTOR') return 'DISTRIBUTOR';
  return 'UMKM'; // default fallback role
};

const getRoleConfig = (role: 'ADMIN' | 'DISTRIBUTOR' | 'UMKM') => {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Admin',
        icon: ShieldCheck,
        avatarClass: 'bg-purple-500/10 text-purple-600 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white',
        chipClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
      };
    case 'DISTRIBUTOR':
      return {
        label: 'Distributor',
        icon: Briefcase,
        avatarClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white',
        chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      };
    case 'UMKM':
    default:
      return {
        label: 'UMKM',
        icon: Store,
        avatarClass: 'bg-blue-500/10 text-blue-600 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white',
        chipClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      };
  }
};

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const { user: currentUser } = useAuthStore();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, 'profiles'));
      const uList: any[] = [];

      // Fetch orders safely
      let ordersList: any[] = [];
      try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        ordersSnapshot.forEach((d) => {
          ordersList.push({ id: d.id, ...d.data() });
        });
      } catch (err) {
        console.error("Gagal memuat orders:", err);
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      querySnapshot.forEach((document) => {
        const data = document.data();
        const userId = document.id;
        const role = getNormalizedRole(data.role);

        // Calculate monthly activity from orders (completed / delivered in current calendar month)
        let activityValue = 0;
        const currentMonthCompletedOrders = ordersList.filter(o => {
          if (o.status !== 'delivered') return false;
          const dateStr = o.created_at || o.timestamp;
          if (!dateStr) return false;
          try {
            const d = new Date(dateStr);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
          } catch {
            return false;
          }
        });

        if (role === 'DISTRIBUTOR') {
          activityValue = currentMonthCompletedOrders
            .filter(o => o.distributor_id === userId)
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        } else if (role === 'UMKM') {
          activityValue = currentMonthCompletedOrders
            .filter(o => o.buyer_id === userId)
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        }

        uList.push({
          id: userId,
          name: data.full_name || data.fullName || 'Tanpa Nama',
          email: data.email || '',
          role: role,
          is_active: data.is_active !== false,
          is_suspended: !!data.is_suspended,
          is_verified: !!data.is_verified,
          verification_status: data.verification_status || '',
          joined: data.created_at || null,
          location: 'Indonesia',
          activityValue: activityValue
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
    const confirmMsg = isSuspending 
      ? 'Yakin ingin menangguhkan pengguna ini?' 
      : 'Yakin ingin mengaktifkan kembali pengguna ini?';
    
    if (!window.confirm(confirmMsg)) return;

    const targetUser = users.find(u => u.id === userId);
    
    // Safety check: protect Admin rows
    if (targetUser?.role === 'ADMIN') {
      toast.error('Tidak dapat menangguhkan/mengaktifkan pengguna Admin.');
      return;
    }

    // Safety check: do not reactivate users that are soft-deleted or intentionally inactive
    if (!isSuspending && (targetUser?.is_active === false || targetUser?.is_inactive || targetUser?.status === 'INACTIVE')) {
      toast.error('Tidak dapat mengaktifkan kembali pengguna yang sudah dinonaktifkan secara permanen.');
      return;
    }
    
    setProcessingUserId(userId);
    try {
      const userRef = doc(db, 'profiles', userId);
      // Explicit boolean update
      await updateDoc(userRef, { is_suspended: isSuspending ? true : false });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: isSuspending } : u));

      // Catat Log Audit dengan actor & target detail jika fungsi tersedia
      await createAuditLog({
        event: isSuspending ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        status: isSuspending ? 'WARNING' : 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Admin ${currentUser?.email || 'System Admin'} ${isSuspending ? 'menangguhkan' : 'mengaktifkan kembali'} pengguna ${targetUser?.name || ''} (ID: ${userId}, Email: ${targetUser?.email || ''})`,
        targetCollection: 'profiles',
        targetId: userId
      });

      toast.success(isSuspending ? 'Pengguna berhasil ditangguhkan' : 'Pengguna berhasil diaktifkan kembali');
    } catch (err) {
      console.error("Gagal memperbarui status pengguna:", err);
      toast.error('Gagal memperbarui status pengguna');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    
    // Safety check: protect Admin rows
    if (targetUser?.role === 'ADMIN') {
      toast.error('Tidak dapat menghapus/menonaktifkan pengguna Admin.');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menonaktifkan pengguna ini? (Pengguna akan dinonaktifkan secara permanen)')) return;
    
    setProcessingUserId(userId);
    try {
      const userRef = doc(db, 'profiles', userId);
      // Soft delete: update is_active to false and mark suspended
      await updateDoc(userRef, { 
        is_active: false, 
        is_suspended: true,
        deletedAt: new Date(),
        deletedBy: currentUser?.email || 'System Admin'
      });

      setUsers(prev => prev.filter(u => u.id !== userId));

      // Catat Log Audit
      await createAuditLog({
        event: 'USER_SOFT_DELETED',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Menonaktifkan (soft-delete) pengguna ${targetUser?.name || ''} (${targetUser?.email || ''})`,
        targetCollection: 'profiles',
        targetId: userId
      });

      toast.success('Pengguna berhasil dinonaktifkan.');
    } catch (err) {
      console.error("Gagal menonaktifkan pengguna:", err);
      toast.error('Gagal menonaktifkan pengguna');
    } finally {
      setProcessingUserId(null);
    }
  };

  const getAccountStatusLabel = (user: any) => {
    if (user.is_active === false) return 'Dihapus';
    if (user.is_suspended) return 'Ditangguhkan';
    if (user.is_inactive || user.status === 'INACTIVE') return 'Nonaktif';
    return 'Aktif';
  };

  const getVerificationStatusLabel = (user: any) => {
    if (user.role !== 'DISTRIBUTOR') return '-';
    
    const status = (user.verification_status || '').toUpperCase();
    if (status === 'VERIFIED' || user.is_verified) return 'Terverifikasi';
    if (status === 'PENDING_REVIEW' || status === 'PENDING') return 'Menunggu Review';
    if (status === 'REJECTED') return 'Ditolak';
    return 'Belum Mengajukan';
  };

  // Replaced by shared formatDateTime from dateUtils — handles null/invalid gracefully
  const formatDate = (dateStr: any) => formatDateTime(dateStr);

  const formatActivity = (user: any) => {
    if (user.role === 'ADMIN') return '-';
    
    const amountStr = `Rp ${(user.activityValue || 0).toLocaleString('id-ID')}`;
    if (user.role === 'DISTRIBUTOR') {
      return `${amountStr} omzet`;
    }
    if (user.role === 'UMKM') {
      return `${amountStr} belanja`;
    }
    return '-';
  };

  const filteredUsers = users.filter(u => {
    const sTerm = search.trim().toLowerCase();
    
    // Check role terms
    const roleIndonesian = u.role === 'DISTRIBUTOR' ? 'distributor' : u.role === 'UMKM' ? 'umkm' : 'admin';
    
    // Status mappings
    const accStatus = getAccountStatusLabel(u).toLowerCase();
    const verStatus = getVerificationStatusLabel(u).toLowerCase();
    
    // Safe exact/token-based status search to avoid false substrings (like "aktif" matching "nonaktif")
    let matchesStatus = false;
    if (sTerm === 'aktif') {
      matchesStatus = accStatus === 'aktif';
    } else if (sTerm === 'nonaktif' || sTerm === 'non-aktif') {
      matchesStatus = accStatus === 'nonaktif';
    } else if (sTerm === 'ditangguhkan') {
      matchesStatus = accStatus === 'ditangguhkan';
    } else if (sTerm === 'dihapus') {
      matchesStatus = accStatus === 'dihapus';
    } else if (sTerm === 'terverifikasi') {
      matchesStatus = verStatus === 'terverifikasi';
    } else if (sTerm === 'menunggu review' || sTerm === 'menunggu') {
      matchesStatus = verStatus === 'menunggu review';
    } else if (sTerm === 'ditolak') {
      matchesStatus = verStatus === 'ditolak';
    } else if (sTerm === 'belum mengajukan') {
      matchesStatus = verStatus === 'belum mengajukan';
    } else if (sTerm !== '') {
      // Substring check for general text search on status labels
      matchesStatus = accStatus.includes(sTerm) || verStatus.includes(sTerm);
    }
    
    const matchesSearch = 
      u.name.toLowerCase().includes(sTerm) || 
      u.email.toLowerCase().includes(sTerm) ||
      roleIndonesian.includes(sTerm) ||
      u.role.toLowerCase().includes(sTerm) ||
      matchesStatus;

    let matchesFilter = true;
    if (filter === 'ADMIN') {
      matchesFilter = u.role === 'ADMIN';
    } else if (filter === 'DISTRIBUTOR') {
      matchesFilter = u.role === 'DISTRIBUTOR';
    } else if (filter === 'UMKM') {
      matchesFilter = u.role === 'UMKM';
    } else if (filter === 'PENDING_VERIFICATION') {
      const vStatus = (u.verification_status || '').toUpperCase();
      matchesFilter = u.role === 'DISTRIBUTOR' && (vStatus === 'PENDING_REVIEW' || vStatus === 'PENDING');
    }
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Direktori Pengguna</h1>
            <p className="text-muted-foreground font-medium">Kelola anggota ekosistem dan status verifikasi mereka.</p>
         </div>
          <Button 
            className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 cursor-pointer"
            onClick={() => toast.success('Fitur ekspor data akan segera tersedia.')}
          >
             <Download size={20} className="mr-2" />
             Ekspor Data Pengguna
          </Button>
      </div>

      {/* Compact Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         {[
           { label: 'Total Pengguna', value: users.length, color: 'text-primary' },
           { label: 'Distributor', value: users.filter(u => u.role === 'DISTRIBUTOR').length, color: 'text-amber-500' },
           { label: 'UMKM', value: users.filter(u => u.role === 'UMKM').length, color: 'text-blue-500' },
           { label: 'Admin', value: users.filter(u => u.role === 'ADMIN').length, color: 'text-purple-500' },
           { label: 'Butuh Verifikasi', value: users.filter(u => u.role === 'DISTRIBUTOR' && ((u.verification_status || '').toUpperCase() === 'PENDING' || (u.verification_status || '').toUpperCase() === 'PENDING_REVIEW')).length, color: 'text-rose-500' },
           { label: 'Ditangguhkan', value: users.filter(u => u.is_suspended).length, color: 'text-red-500' }
         ].map((stat, idx) => (
            <div key={idx} className="bg-card border border-border/40 p-4 rounded-xl flex items-center justify-between shadow-sm hover:border-primary/20 transition-all">
               <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className={cn("text-xl font-black", stat.color)}>{stat.value}</p>
               </div>
            </div>
         ))}
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Cari berdasarkan nama, email, atau peran..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-2 flex-wrap">
            {['ALL', 'ADMIN', 'DISTRIBUTOR', 'UMKM', 'PENDING_VERIFICATION'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="h-14 px-6 rounded-2xl font-bold uppercase text-xs cursor-pointer transition-all"
              >
                {f === 'ALL' ? 'Semua' : f === 'ADMIN' ? 'Admin' : f === 'DISTRIBUTOR' ? 'Distributor' : f === 'UMKM' ? 'UMKM' : 'Butuh Verifikasi'}
              </Button>
            ))}
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
                 <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pengguna</th>
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peran</th>
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Akun</th>
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Verifikasi</th>
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aktivitas Bulanan</th>
                       <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bergabung</th>
                       <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aksi</th>
                    </tr>
                 </thead>
                <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-muted-foreground font-bold">
                          Memuat data pengguna...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                       <tr>
                         <td colSpan={7} className="py-20 text-center text-muted-foreground">
                           <div className="flex flex-col items-center justify-center space-y-3">
                             <Users className="text-muted-foreground/30 animate-pulse" size={48} />
                             <div>
                               <p className="font-black text-sm text-foreground">Belum ada pengguna terdaftar.</p>
                               <p className="text-xs text-muted-foreground/60 mt-1">Data pengguna akan muncul setelah registrasi baru dilakukan.</p>
                             </div>
                           </div>
                         </td>
                       </tr>
                     ) : filteredUsers.length === 0 ? (
                       <tr>
                         <td colSpan={7} className="py-20 text-center text-muted-foreground">
                           <div className="flex flex-col items-center justify-center space-y-3">
                             <Search className="text-muted-foreground/30" size={48} />
                             <div>
                               <p className="font-black text-sm text-foreground">Tidak ada pengguna yang sesuai dengan pencarian atau filter.</p>
                               <p className="text-xs text-muted-foreground/60 mt-1">Coba gunakan kata kunci lain atau ubah filter Anda.</p>
                             </div>
                           </div>
                         </td>
                       </tr>
                    ) : (
                     filteredUsers.map((user, i) => {
                       const roleConfig = getRoleConfig(user.role);
                       const RoleIcon = roleConfig.icon;
                       return (
                         <motion.tr 
                           key={user.id}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="group hover:bg-primary/5 transition-all border-b border-border/30 last:border-none"
                         >
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-6">
                                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-300", roleConfig.avatarClass)}>
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
                                 "flex items-center gap-2 w-fit px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                 roleConfig.chipClass
                               )}>
                                  <RoleIcon size={12} />
                                  {roleConfig.label}
                               </div>
                            </td>
                            <td className="px-10 py-8">
                                <StatusBadge 
                                   type={
                                     getAccountStatusLabel(user) === 'Aktif' ? 'success' :
                                     getAccountStatusLabel(user) === 'Nonaktif' ? 'neutral' :
                                     getAccountStatusLabel(user) === 'Ditangguhkan' ? 'warning' : 'error'
                                   } 
                                   label={getAccountStatusLabel(user)}
                                />
                             </td>
                             <td className="px-10 py-8">
                                <StatusBadge 
                                   type={
                                     getVerificationStatusLabel(user) === 'Terverifikasi' ? 'success' :
                                     getVerificationStatusLabel(user) === 'Menunggu Review' ? 'warning' :
                                     getVerificationStatusLabel(user) === 'Ditolak' ? 'error' : 'neutral'
                                   } 
                                   label={getVerificationStatusLabel(user)}
                                   dot={getVerificationStatusLabel(user) !== '-'}
                                />
                             </td>
                             <td className="px-10 py-8 font-black text-sm">
                                {formatActivity(user)}
                             </td>
                             <td className="px-10 py-8 text-xs font-bold text-muted-foreground">
                                {formatDate(user.joined)}
                             </td>
                             <td className="px-10 py-8 text-right">
                                <div className="flex justify-end items-center gap-2 flex-wrap">
                                   {processingUserId === user.id ? (
                                      <Loader2 size={18} className="animate-spin text-primary" />
                                   ) : (
                                      <>
                                         {/* Tinjau Verifikasi */}
                                         {user.role === 'DISTRIBUTOR' && 
                                          ((user.verification_status || '').toUpperCase() === 'PENDING' || 
                                           (user.verification_status || '').toUpperCase() === 'PENDING_REVIEW') && (
                                             <Button
                                                size="sm"
                                                className="h-8 px-3 rounded-lg bg-[#FFB162] hover:bg-[#FFB162]/90 text-primary-foreground text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                                onClick={() => navigate(`/admin/verifications?userId=${user.id}`)}
                                             >
                                                Tinjau Verifikasi
                                             </Button>
                                          )}
   
                                         {/* Suspend / Aktifkan Kembali (for non-admin users only) */}
                                         {user.role !== 'ADMIN' && (
                                            <Button
                                               size="sm"
                                               variant="outline"
                                               className={cn(
                                                  "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer",
                                                  user.is_suspended 
                                                     ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" 
                                                     : "border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                                               )}
                                               onClick={() => handleToggleStatus(user.id, user.is_suspended ? 'SUSPENDED' : 'ACTIVE')}
                                               disabled={processingUserId !== null}
                                            >
                                               {user.is_suspended ? 'Aktifkan Kembali' : 'Suspend'}
                                            </Button>
                                         )}
   
                                         {/* Transaksi (distributors and UMKM) */}
                                         {user.role !== 'ADMIN' && (
                                            <Button
                                               size="sm"
                                               variant="ghost"
                                               className="h-8 px-3 rounded-lg text-muted-foreground text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                               onClick={() => navigate('/admin/finances')}
                                            >
                                               Transaksi
                                            </Button>
                                         )}
   
                                         {/* For admins: show nothing or a dash label if there is no action */}
                                         {user.role === 'ADMIN' && (
                                            <span className="text-muted-foreground/60 text-xs font-bold mr-4">-</span>
                                         )}
                                      </>
                                   )}
                                </div>
                             </td>
                         </motion.tr>
                       );
                     })
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
