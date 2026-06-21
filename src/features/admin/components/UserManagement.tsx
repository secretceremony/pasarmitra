import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Mail, 
  Briefcase, 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Trash2, 
  Lock, 
  Unlock,
  ShieldCheck,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
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

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({
    full_name: '',
    phone: '',
    organization_name: '',
    address: '',
    description: '',
    role: 'UMKM',
    is_active: true,
    is_suspended: false,
    is_verified: false,
    verification_status: '',
    business_district: '',
    business_type: '',
    business_address: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleOpenEditModal = async (targetUser: any) => {
    // If it is another Admin, block it
    if (targetUser.role === 'ADMIN' && targetUser.id !== currentUser?.id) {
      toast.error('Tidak dapat mengubah data Admin lain.');
      return;
    }

    setProcessingUserId(targetUser.id);
    try {
      // Fetch latest document from Firebase to avoid stale data
      const docRef = doc(db, 'profiles', targetUser.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        toast.error('Data profil pengguna tidak ditemukan di database.');
        return;
      }
      const data = docSnap.data();
      
      const userDetails = {
        id: targetUser.id,
        email: data.email || targetUser.email || '',
        full_name: data.full_name || data.fullName || '',
        phone: data.phone || '',
        organization_name: data.organization_name || data.organizationName || '',
        address: data.address || '',
        description: data.description || '',
        role: getNormalizedRole(data.role),
        is_active: data.is_active !== false,
        is_suspended: !!data.is_suspended,
        is_verified: !!data.is_verified,
        verification_status: data.verification_status || '',
        business_district: data.business_district || '',
        business_type: data.business_type || '',
        business_address: data.business_address || ''
      };

      setSelectedEditUser(userDetails);
      setEditFormData({
        full_name: userDetails.full_name,
        phone: userDetails.phone,
        organization_name: userDetails.organization_name,
        address: userDetails.address,
        description: userDetails.description,
        role: userDetails.role,
        is_active: userDetails.is_active,
        is_suspended: userDetails.is_suspended,
        is_verified: userDetails.is_verified,
        verification_status: userDetails.verification_status,
        business_district: userDetails.business_district,
        business_type: userDetails.business_type,
        business_address: userDetails.business_address
      });
      setIsEditModalOpen(true);
    } catch (err) {
      console.error("Gagal mengambil rincian profil:", err);
      toast.error('Gagal mengambil rincian data profil pengguna.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;

    const isEditingSelf = selectedEditUser.id === currentUser?.id;
    
    // Validation
    if (!editFormData.full_name.trim()) {
      toast.error('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (editFormData.phone && !/^\d{8,15}$/.test(editFormData.phone.trim())) {
      toast.error('Nomor telepon harus berupa angka antara 8 sampai 15 digit.');
      return;
    }

    const targetRole = editFormData.role;
    if ((targetRole === 'UMKM' || targetRole === 'DISTRIBUTOR') && !editFormData.organization_name.trim()) {
      toast.error(targetRole === 'UMKM' ? 'Nama toko tidak boleh kosong.' : 'Nama bisnis tidak boleh kosong.');
      return;
    }

    // Role and Status change validations
    const hasRoleChanged = targetRole !== selectedEditUser.role;
    const hasActiveChanged = editFormData.is_active !== selectedEditUser.is_active;
    const hasSuspendedChanged = editFormData.is_suspended !== selectedEditUser.is_suspended;
    const hasVerifiedChanged = editFormData.is_verified !== selectedEditUser.is_verified || editFormData.verification_status !== selectedEditUser.verification_status;

    if (selectedEditUser.role === 'ADMIN' && !isEditingSelf) {
      toast.error('Tidak dapat mengubah data profil pengguna Admin lain.');
      return;
    }

    if (isEditingSelf) {
      if (hasRoleChanged || hasActiveChanged || hasSuspendedChanged || hasVerifiedChanged) {
        toast.error('Anda tidak dapat mengubah status, peran, verifikasi, atau penangguhan akun Anda sendiri.');
        return;
      }
    }

    let confirmMsg = 'Apakah Anda yakin ingin menyimpan perubahan data profil ini?';
    if (hasRoleChanged || hasActiveChanged || hasSuspendedChanged || hasVerifiedChanged) {
      confirmMsg = 'Anda mengubah peran/status akun pengguna ini. Apakah Anda yakin ingin melanjutkan?';
    }

    if (!window.confirm(confirmMsg)) return;

    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'profiles', selectedEditUser.id);
      
      const timestamp = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        full_name: editFormData.full_name.trim(),
        phone: editFormData.phone.trim(),
        updated_at: timestamp,
        updated_by: currentUser?.email || currentUser?.id || 'System Admin'
      };

      if (!isEditingSelf) {
        updatePayload.role = targetRole;
        updatePayload.is_active = editFormData.is_active;
        updatePayload.is_suspended = editFormData.is_suspended;
        
        if (targetRole === 'DISTRIBUTOR' || targetRole === 'UMKM') {
          updatePayload.verification_status = editFormData.verification_status;
          if (editFormData.verification_status === 'VERIFIED') {
            updatePayload.is_verified = true;
          } else if (
            editFormData.verification_status === 'REJECTED' ||
            editFormData.verification_status === 'PENDING' ||
            editFormData.verification_status === 'PENDING_REVIEW' ||
            editFormData.verification_status === 'NEEDS_REVISION' ||
            editFormData.verification_status === ''
          ) {
            updatePayload.is_verified = false;
          } else {
            updatePayload.is_verified = editFormData.is_verified;
          }
        } else {
          updatePayload.is_verified = editFormData.is_verified;
        }
      }

      if (targetRole === 'UMKM' || targetRole === 'DISTRIBUTOR') {
        updatePayload.organization_name = editFormData.organization_name.trim();
        updatePayload.address = editFormData.address.trim();
        updatePayload.description = editFormData.description.trim();
        updatePayload.business_district = editFormData.business_district.trim();
        updatePayload.business_type = editFormData.business_type.trim();
        updatePayload.business_address = editFormData.business_address.trim();
      }

      const diffs: string[] = [];
      if (editFormData.full_name.trim() !== selectedEditUser.full_name) {
        diffs.push(`Nama lengkap: "${selectedEditUser.full_name}" -> "${editFormData.full_name.trim()}"`);
      }
      if (editFormData.phone.trim() !== selectedEditUser.phone) {
        diffs.push(`No telepon: "${selectedEditUser.phone}" -> "${editFormData.phone.trim()}"`);
      }
      if (!isEditingSelf) {
        if (targetRole !== selectedEditUser.role) {
          diffs.push(`Peran: "${selectedEditUser.role}" -> "${targetRole}"`);
        }
        if (editFormData.is_active !== selectedEditUser.is_active) {
          diffs.push(`Aktif: "${selectedEditUser.is_active}" -> "${editFormData.is_active}"`);
        }
        if (editFormData.is_suspended !== selectedEditUser.is_suspended) {
          diffs.push(`Ditangguhkan: "${selectedEditUser.is_suspended}" -> "${editFormData.is_suspended}"`);
        }
        if (targetRole === 'DISTRIBUTOR' || targetRole === 'UMKM') {
          if (editFormData.verification_status !== selectedEditUser.verification_status) {
            diffs.push(`Status Verifikasi: "${selectedEditUser.verification_status}" -> "${editFormData.verification_status}"`);
          }
          const newIsVerified = editFormData.verification_status === 'VERIFIED';
          const oldIsVerified = selectedEditUser.verification_status === 'VERIFIED';
          if (newIsVerified !== oldIsVerified) {
            diffs.push(`Terverifikasi: "${oldIsVerified}" -> "${newIsVerified}"`);
          }
        }
      }
      if (targetRole === 'UMKM' || targetRole === 'DISTRIBUTOR') {
        if (editFormData.organization_name.trim() !== selectedEditUser.organization_name) {
          diffs.push(`Nama Bisnis/Toko: "${selectedEditUser.organization_name}" -> "${editFormData.organization_name.trim()}"`);
        }
        if (editFormData.address.trim() !== selectedEditUser.address) {
          diffs.push(`Alamat: "${selectedEditUser.address}" -> "${editFormData.address.trim()}"`);
        }
        if (editFormData.description.trim() !== selectedEditUser.description) {
          diffs.push(`Deskripsi: "${selectedEditUser.description}" -> "${editFormData.description.trim()}"`);
        }
        if (editFormData.business_district.trim() !== (selectedEditUser.business_district || '')) {
          diffs.push(`Kecamatan Usaha: "${selectedEditUser.business_district || ''}" -> "${editFormData.business_district.trim()}"`);
        }
        if (editFormData.business_type.trim() !== (selectedEditUser.business_type || '')) {
          diffs.push(`Tipe Usaha: "${selectedEditUser.business_type || ''}" -> "${editFormData.business_type.trim()}"`);
        }
        if (editFormData.business_address.trim() !== (selectedEditUser.business_address || '')) {
          diffs.push(`Alamat Detail Usaha: "${selectedEditUser.business_address || ''}" -> "${editFormData.business_address.trim()}"`);
        }
      }

      await updateDoc(userRef, updatePayload);

      if (diffs.length > 0) {
        await createAuditLog({
          event: 'USER_PROFILE_UPDATED',
          status: 'SUCCESS',
          user: currentUser?.email || 'System Admin',
          details: `Admin ${currentUser?.email || 'System Admin'} memperbarui profil pengguna ${selectedEditUser.full_name || ''} (ID: ${selectedEditUser.id}, Email: ${selectedEditUser.email || ''}). Perubahan: ${diffs.join(', ')}`,
          targetCollection: 'profiles',
          targetId: selectedEditUser.id
        });
      }

      toast.success('Data pengguna berhasil diperbarui.');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Gagal memperbarui profil pengguna:", err);
      toast.error(err.message || 'Gagal memperbarui data pengguna.');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
          location: 'Balikpapan, Kalimantan Timur',
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
      toast.error('Tidak dapat mengubah data profil pengguna Admin lain.');
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
      toast.error('Tidak dapat mengubah data profil pengguna Admin lain.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter">Direktori Pengguna</h1>
            <p className="text-muted-foreground font-medium text-xs sm:text-sm">Kelola anggota ekosistem dan status verifikasi mereka.</p>
         </div>
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
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center w-full">
         <div className="relative w-full lg:flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Cari berdasarkan nama, email, atau peran..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-2 flex-wrap w-full lg:w-auto">
            {['ALL', 'ADMIN', 'DISTRIBUTOR', 'UMKM', 'PENDING_VERIFICATION'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="h-14 px-6 rounded-2xl font-bold uppercase text-xs cursor-pointer transition-all flex-1 sm:flex-initial text-center justify-center"
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
                                         {/* Ubah Data (Edit Profile) */}
                                         <Button
                                            size="sm"
                                            variant="outline"
                                            className={cn(
                                               "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border-border/80 text-foreground hover:bg-muted"
                                            )}
                                            onClick={() => handleOpenEditModal(user)}
                                            disabled={user.role === 'ADMIN' && user.id !== currentUser?.id}
                                            title={user.role === 'ADMIN' && user.id !== currentUser?.id ? "Tidak dapat mengubah data Admin lain" : "Ubah data profil pengguna"}
                                         >
                                            Ubah Data
                                         </Button>

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

        {/* Edit User Modal */}
        <AnimatePresence>
         {isEditModalOpen && selectedEditUser && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
           >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-fade-in" onClick={() => setIsEditModalOpen(false)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="relative bg-card border border-border w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-xl flex flex-col overflow-hidden z-10 text-left"
              >
                 <form onSubmit={handleSaveProfile} className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-5 md:p-6 border-b border-border flex justify-between items-center bg-card">
                       <div>
                          <h2 className="text-lg md:text-xl font-bold tracking-tight">Ubah Data Pengguna</h2>
                          <p className="text-muted-foreground text-xs font-medium">Ubah rincian profil, peran, atau status akun untuk {selectedEditUser.email}</p>
                       </div>
                       <button 
                         type="button" 
                         onClick={() => setIsEditModalOpen(false)} 
                         className="p-2 bg-muted/40 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer"
                       >
                          <X size={18} />
                       </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
                       {/* Helper Notice for Passwords */}
                       <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-amber-700/90 leading-relaxed">
                             Perubahan kata sandi tidak dapat dilakukan oleh admin. Minta pengguna menggunakan fitur Lupa Sandi di halaman masuk.
                          </p>
                       </div>

                       {/* Section 1: Basic Info */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Nama Lengkap</label>
                             <input 
                               required 
                               type="text" 
                               placeholder="mis. John Doe" 
                               className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" 
                               value={editFormData.full_name} 
                               onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })} 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Nomor Telepon</label>
                             <input 
                               type="text" 
                               placeholder="mis. 08123456789" 
                               className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" 
                               value={editFormData.phone} 
                               onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} 
                             />
                          </div>
                       </div>

                       {/* Section 2: Organization / Business Info (only for UMKM and Distributor) */}
                       {(editFormData.role === 'UMKM' || editFormData.role === 'DISTRIBUTOR') && (
                          <div className="space-y-4 pt-2 border-t border-border/40">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">
                                      {editFormData.role === 'UMKM' ? 'Nama Toko / UMKM' : 'Nama Bisnis / Perusahaan'}
                                   </label>
                                   <input 
                                     required 
                                     type="text" 
                                     placeholder={editFormData.role === 'UMKM' ? 'mis. Toko Kelontong Maju' : 'mis. PT Sembako Jaya'} 
                                     className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" 
                                     value={editFormData.organization_name} 
                                     onChange={e => setEditFormData({ ...editFormData, organization_name: e.target.value })} 
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Tipe Usaha</label>
                                   <select
                                     required
                                     className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none"
                                     value={editFormData.business_type}
                                     onChange={e => setEditFormData({ ...editFormData, business_type: e.target.value })}
                                   >
                                      <option value="">Pilih Tipe Usaha</option>
                                      {editFormData.role === 'UMKM' ? (
                                        <>
                                          <option value="Warung">Warung</option>
                                          <option value="Toko Kelontong">Toko Kelontong</option>
                                          <option value="Kafe / F&B">Kafe / F&B</option>
                                          <option value="Catering">Catering</option>
                                          <option value="Retail kecil">Retail kecil</option>
                                          <option value="Lainnya">Lainnya</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="Sembako">Sembako</option>
                                          <option value="F&B">F&B</option>
                                          <option value="Sayur & Buah">Sayur & Buah</option>
                                          <option value="Daging / Protein">Daging / Protein</option>
                                          <option value="Frozen Food">Frozen Food</option>
                                          <option value="Perlengkapan Usaha">Perlengkapan Usaha</option>
                                          <option value="Lainnya">Lainnya</option>
                                        </>
                                      )}
                                   </select>
                                </div>
                                <div className="space-y-1 col-span-1 md:col-span-2">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Kecamatan di Balikpapan</label>
                                   <select
                                     required
                                     className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none"
                                     value={editFormData.business_district}
                                     onChange={e => setEditFormData({ ...editFormData, business_district: e.target.value })}
                                   >
                                      <option value="">Pilih Kecamatan</option>
                                      <option value="Balikpapan Kota">Balikpapan Kota</option>
                                      <option value="Balikpapan Selatan">Balikpapan Selatan</option>
                                      <option value="Balikpapan Tengah">Balikpapan Tengah</option>
                                      <option value="Balikpapan Utara">Balikpapan Utara</option>
                                      <option value="Balikpapan Barat">Balikpapan Barat</option>
                                      <option value="Balikpapan Timur">Balikpapan Timur</option>
                                   </select>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Alamat Detail Usaha</label>
                                <textarea 
                                  rows={2}
                                  placeholder="Masukkan alamat detail lengkap di Balikpapan..." 
                                  className="w-full bg-muted/30 border border-border rounded-lg p-3 text-xs font-semibold focus:border-primary focus:outline-none resize-none" 
                                  value={editFormData.business_address} 
                                  onChange={e => setEditFormData({ ...editFormData, business_address: e.target.value })} 
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Deskripsi Usaha</label>
                                <textarea 
                                  rows={2}
                                  placeholder="Masukkan penjelasan singkat produk atau usaha..." 
                                  className="w-full bg-muted/30 border border-border rounded-lg p-3 text-xs font-semibold focus:border-primary focus:outline-none resize-none" 
                                  value={editFormData.description} 
                                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} 
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Alamat Umum / Legacy Address</label>
                                <textarea 
                                  rows={2}
                                  placeholder="Alamat profil umum..." 
                                  className="w-full bg-muted/30 border border-border rounded-lg p-3 text-xs font-semibold focus:border-primary focus:outline-none resize-none" 
                                  value={editFormData.address} 
                                  onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} 
                                />
                             </div>
                          </div>
                       )}

                       {/* Section 3: Admin & Account Status Fields (disabled if self-editing) */}
                       <div className="space-y-4 pt-2 border-t border-border/40">
                          <h3 className="text-xs font-bold text-foreground">Pengaturan Akun & Akses</h3>
                          
                          {selectedEditUser.id === currentUser?.id && (
                             <p className="text-[11px] font-bold text-rose-500">
                                * Anda sedang mengedit akun Anda sendiri. Perubahan peran, status, atau verifikasi dinonaktifkan demi keselamatan.
                             </p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Peran Akun (Role)</label>
                                <select 
                                  disabled={selectedEditUser.id === currentUser?.id}
                                  className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none disabled:opacity-60" 
                                  value={editFormData.role} 
                                  onChange={e => setEditFormData({ ...editFormData, role: e.target.value as any })}
                                >
                                   <option value="UMKM">UMKM</option>
                                   <option value="DISTRIBUTOR">Distributor</option>
                                   <option value="ADMIN">Admin</option>
                                </select>
                             </div>

                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Status Keaktifan</label>
                                <select 
                                  disabled={selectedEditUser.id === currentUser?.id}
                                  className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none disabled:opacity-60" 
                                  value={editFormData.is_active ? "active" : "inactive"} 
                                  onChange={e => setEditFormData({ ...editFormData, is_active: e.target.value === "active" })}
                                >
                                   <option value="active">Aktif</option>
                                   <option value="inactive">Nonaktif (Dihapus)</option>
                                </select>
                             </div>

                             <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Status Penangguhan (Suspended)</label>
                                <select 
                                  disabled={selectedEditUser.id === currentUser?.id}
                                  className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none disabled:opacity-60" 
                                  value={editFormData.is_suspended ? "suspended" : "normal"} 
                                  onChange={e => setEditFormData({ ...editFormData, is_suspended: e.target.value === "suspended" })}
                                >
                                   <option value="normal">Normal</option>
                                   <option value="suspended">Ditangguhkan (Suspended)</option>
                                </select>
                             </div>

                              {(editFormData.role === 'DISTRIBUTOR' || editFormData.role === 'UMKM') && (
                                 <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">
                                       {editFormData.role === 'UMKM' ? 'Status Verifikasi UMKM (Usaha)' : 'Status Verifikasi NIB/NPWP'}
                                    </label>
                                    <select
                                      disabled={selectedEditUser.id === currentUser?.id}
                                      className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none disabled:opacity-60"
                                      value={editFormData.verification_status}
                                      onChange={e => setEditFormData({ ...editFormData, verification_status: e.target.value })}
                                    >
                                       <option value="">Belum Mengajukan</option>
                                       <option value="PENDING_REVIEW">Menunggu Review</option>
                                       <option value="VERIFIED">Terverifikasi ✓</option>
                                       <option value="NEEDS_REVISION">Perlu Revisi</option>
                                       <option value="REJECTED">Ditolak ✗</option>
                                    </select>
                                    <p className="text-[10px] text-muted-foreground ml-2 mt-1">
                                       {editFormData.verification_status === 'VERIFIED'
                                         ? '✓ Pengguna ini dapat melakukan pembelian/transaksi.'
                                         : editFormData.verification_status === 'REJECTED'
                                           ? '✗ Akses pembelian diblokir. Pengguna harus mengajukan ulang.'
                                           : editFormData.verification_status === 'NEEDS_REVISION'
                                             ? '⚠ Pengguna diminta melengkapi dokumen verifikasi.'
                                             : editFormData.verification_status === 'PENDING_REVIEW'
                                               ? '⏳ Pengajuan verifikasi sedang dalam proses tinjauan Admin.'
                                               : 'Pengguna belum mengajukan verifikasi usaha.'}
                                    </p>
                                 </div>
                              )}
                          </div>
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 md:p-6 border-t border-border bg-muted/10 flex gap-4">
                       <Button 
                         type="button" 
                         variant="ghost" 
                         className="h-10 flex-1 rounded-lg font-bold text-sm cursor-pointer" 
                         onClick={() => setIsEditModalOpen(false)} 
                         disabled={isSavingProfile}
                       >
                          Batal
                       </Button>
                       <Button 
                         type="submit" 
                         disabled={isSavingProfile} 
                         className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/30 flex items-center justify-center cursor-pointer"
                       >
                          {isSavingProfile ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            'Simpan Perubahan'
                          )}
                       </Button>
                    </div>
                 </form>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};
