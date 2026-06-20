import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Box, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Search, 
  AlertTriangle,
  Trash2,
  User,
  Clock,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export const ModerationSystem = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS_PENDING' | 'PRODUCTS_REPORTED' | 'REVIEWS_REPORTED'>('ALL');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const { user: currentUser } = useAuthStore();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchModerationItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const qSnap = await getDocs(collection(db, 'moderation_items'));
      const list: any[] = [];
      qSnap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setItems(list);
    } catch (err) {
      console.error('Gagal memuat item moderasi:', err);
      setError('Gagal memuat data moderasi. Hubungi administrator.');
      toast.error('Gagal memuat data moderasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationItems();
  }, []);

  const handleApproveProduct = async (itemId: string) => {
    if (!window.confirm("Yakin ingin menyetujui produk ini?")) return;
    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const productId = item?.targetId ?? item?.id;
      
      // Update moderation item
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'approved',
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Update product visibility in DB
      if (productId) {
        await updateDoc(doc(db, 'products', productId), { is_active: true });
      }

      await createAuditLog({
        event: 'PRODUCT_APPROVED',
        status: 'SUCCESS',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menyetujui pendaftaran produk ${item?.title || ''} (ID: ${productId}).`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.success('Produk disetujui dan aktif.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal menyetujui produk:', err);
      toast.error('Gagal menyetujui produk');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectProduct = async (itemId: string) => {
    if (!window.confirm("Yakin ingin menolak produk ini?")) return;
    
    const note = window.prompt("Catatan alasan penolakan (wajib):");
    if (note === null) return; // Abort
    if (!note.trim()) {
      toast.error("Catatan moderasi wajib diisi untuk tindakan ini.");
      return;
    }

    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const productId = item?.targetId ?? item?.id;
      
      // Update moderation item
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'rejected',
        note: note,
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Update product visibility in DB
      if (productId) {
        await updateDoc(doc(db, 'products', productId), { is_active: false });
      }

      await createAuditLog({
        event: 'PRODUCT_REJECTED',
        status: 'BLOCK',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menolak pendaftaran produk ${item?.title || ''} (ID: ${productId}). Alasan: ${note}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.error('Pendaftaran produk ditolak.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal menolak produk:', err);
      toast.error('Gagal menolak produk');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleHideProduct = async (itemId: string) => {
    if (!window.confirm("Yakin ingin menyembunyikan produk ini dari marketplace?")) return;
    
    const note = window.prompt("Catatan alasan penyembunyian produk (wajib):");
    if (note === null) return; // Abort
    if (!note.trim()) {
      toast.error("Catatan moderasi wajib diisi untuk tindakan ini.");
      return;
    }

    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const productId = item?.targetId ?? item?.id;
      
      // Update moderation item status
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'rejected',
        note: note,
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Deactivate product visibility in DB
      if (productId) {
        await updateDoc(doc(db, 'products', productId), { is_active: false });
      }

      await createAuditLog({
        event: 'PRODUCT_HIDDEN',
        status: 'BLOCK',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menyembunyikan produk ${item?.title || ''} (ID: ${productId}). Alasan: ${note}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.error('Produk disembunyikan dari marketplace.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal menyembunyikan produk:', err);
      toast.error('Gagal menyembunyikan produk');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleHideReview = async (itemId: string) => {
    if (!window.confirm("Yakin ingin menyembunyikan ulasan ini?")) return;
    
    const note = window.prompt("Catatan alasan penyembunyian ulasan (wajib):");
    if (note === null) return; // Abort
    if (!note.trim()) {
      toast.error("Catatan moderasi wajib diisi untuk tindakan ini.");
      return;
    }

    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const reviewId = item?.targetId ?? item?.id;
      
      // Update moderation item status
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'rejected',
        note: note,
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Hide review in DB
      if (reviewId) {
        await updateDoc(doc(db, 'reviews', reviewId), { is_hidden: true });
      }

      await createAuditLog({
        event: 'REVIEW_HIDDEN',
        status: 'BLOCK',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menyembunyikan ulasan (ID: ${reviewId}). Alasan: ${note}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.error('Ulasan disembunyikan.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal menyembunyikan ulasan:', err);
      toast.error('Gagal menyembunyikan ulasan');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolveReport = async (itemId: string) => {
    if (!window.confirm("Yakin ingin menandai laporan ini selesai?")) return;
    
    const note = window.prompt("Catatan penyelesaian (opsional):");
    if (note === null) return; // Abort

    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      
      // Update moderation item to 'resolved'
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'resolved',
        note: note || '',
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      await createAuditLog({
        event: 'MODERATION_RESOLVED',
        status: 'SUCCESS',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menyelesaikan laporan ${item?.targetType ?? item?.type} ${item?.title || ''}. Catatan: ${note || '-'}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.success('Laporan ditandai selesai.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal menyelesaikan laporan:', err);
      toast.error('Gagal menyelesaikan laporan');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRestore = async (itemId: string) => {
    if (!window.confirm("Yakin ingin memulihkan item ini?")) return;
    
    const note = window.prompt("Catatan pemulihan (opsional):");
    if (note === null) return; // Abort

    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const isProduct = (item?.targetType ?? item?.type)?.toUpperCase() === 'PRODUCT';
      const targetId = item?.targetId ?? item?.id;
      
      // Update moderation status to approved/resolved
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: isProduct ? 'approved' : 'resolved',
        note: note || '',
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Restore visibility in DB
      if (isProduct) {
        if (targetId) {
          await updateDoc(doc(db, 'products', targetId), { is_active: true });
        }
        await createAuditLog({
          event: 'PRODUCT_RESTORED',
          status: 'SUCCESS',
          user: currentUser?.email || currentUser?.id || 'System Admin',
          details: `Memulihkan produk ${item?.title || ''} (ID: ${targetId}). Catatan: ${note || '-'}`,
          targetCollection: 'moderation_items',
          targetId: itemId,
        });
      } else {
        if (targetId) {
          await updateDoc(doc(db, 'reviews', targetId), { is_hidden: false });
        }
        await createAuditLog({
          event: 'REVIEW_RESTORED',
          status: 'SUCCESS',
          user: currentUser?.email || currentUser?.id || 'System Admin',
          details: `Memulihkan ulasan (ID: ${targetId}). Catatan: ${note || '-'}`,
          targetCollection: 'moderation_items',
          targetId: itemId,
        });
      }

      toast.success('Item berhasil dipulihkan.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal memulihkan item:', err);
      toast.error('Gagal memulihkan item');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReopen = async (itemId: string) => {
    if (!window.confirm("Yakin ingin membuka ulang laporan moderasi ini?")) return;
    
    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const targetId = item?.targetId ?? item?.id;

      // Reset moderation status to pending_moderation
      const docRef = doc(db, 'moderation_items', itemId);
      await updateDoc(docRef, {
        status: 'pending_moderation',
        note: '',
        resolvedAt: null,
        resolvedBy: null,
      });

      await createAuditLog({
        event: 'MODERATION_REOPENED',
        status: 'WARNING',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Membuka ulang kasus moderasi ${item?.targetType ?? item?.type} ${item?.title || ''} (ID: ${targetId}).`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.success('Kasus moderasi dibuka ulang.');
      await fetchModerationItems();
    } catch (err) {
      console.error('Gagal membuka ulang kasus moderasi:', err);
      toast.error('Gagal membuka ulang kasus moderasi');
    } finally {
      setActionInProgress(null);
    }
  };

  // Structured verification logic for safety and clarity (avoiding display text hardcoding)
  const matchStatus = (item: any) => {
    const statusLower = (item.status ?? '').toLowerCase();
    const isPending = statusLower === 'pending' || statusLower === 'pending_moderation' || statusLower === 'needs_review';
    
    if (showResolved) {
      return isPending || statusLower === 'approved' || statusLower === 'rejected' || statusLower === 'resolved';
    }
    return isPending;
  };

  const isProductPendingApproval = (item: any) => {
    const isProduct = (item.targetType ?? item.type)?.toUpperCase() === 'PRODUCT';
    if (!isProduct || !matchStatus(item)) return false;

    // Detect if the item is a report-based violation
    const reasonLower = (item.reason || '').toLowerCase();
    const hasReportReason = reasonLower.includes('mencurigakan') || 
                            reasonLower.includes('dibatasi') || 
                            reasonLower.includes('kasar') || 
                            reasonLower.includes('tidak pantas') ||
                            reasonLower.includes('sara') ||
                            reasonLower.includes('penipuan') ||
                            reasonLower.includes('laporan') ||
                            reasonLower.includes('dilaporkan') ||
                            reasonLower.includes('konten') ||
                            item.severity === 'HIGH' ||
                            item.severity === 'MEDIUM';

    return !hasReportReason;
  };

  const isProductReported = (item: any) => {
    const isProduct = (item.targetType ?? item.type)?.toUpperCase() === 'PRODUCT';
    if (!isProduct || !matchStatus(item)) return false;

    // Detect if the item is a report-based violation
    const reasonLower = (item.reason || '').toLowerCase();
    const hasReportReason = reasonLower.includes('mencurigakan') || 
                            reasonLower.includes('dibatasi') || 
                            reasonLower.includes('kasar') || 
                            reasonLower.includes('tidak pantas') ||
                            reasonLower.includes('sara') ||
                            reasonLower.includes('penipuan') ||
                            reasonLower.includes('laporan') ||
                            reasonLower.includes('dilaporkan') ||
                            reasonLower.includes('konten') ||
                            item.severity === 'HIGH' ||
                            item.severity === 'MEDIUM';

    return hasReportReason;
  };

  const isReviewReported = (item: any) => {
    const isReview = (item.targetType ?? item.type)?.toUpperCase() === 'REVIEW';
    return isReview && matchStatus(item);
  };

  const isItemResolved = (item: any) => {
    const statusLower = (item.status ?? '').toLowerCase();
    return statusLower === 'approved' || statusLower === 'rejected' || statusLower === 'resolved';
  };

  const getStatusLabelInIndonesian = (status: string) => {
    if (!status) return 'Tidak Diketahui';
    const s = status.toUpperCase();
    if (s === 'PENDING' || s === 'PENDING_MODERATION') return 'Menunggu Review';
    if (s === 'APPROVED') return 'Disetujui';
    if (s === 'REJECTED') return 'Ditolak';
    if (s === 'REPORTED') return 'Dilaporkan';
    if (s === 'NEEDS_REVIEW') return 'Perlu Review';
    if (s === 'RESOLVED') return 'Selesai';
    if (s === 'ESCALATED') return 'Dieskalasi';
    return 'Tidak Diketahui';
  };

  const getStatusBadgeType = (status: string) => {
    if (!status) return 'neutral';
    const s = status.toUpperCase();
    if (s === 'PENDING' || s === 'PENDING_MODERATION' || s === 'NEEDS_REVIEW') return 'warning';
    if (s === 'APPROVED' || s === 'RESOLVED') return 'success';
    if (s === 'REJECTED') return 'error';
    return 'neutral';
  };

  const getItemTypeLabel = (item: any) => {
    if (isProductPendingApproval(item)) return 'Produk Pending';
    if (isProductReported(item)) return 'Produk Dilaporkan';
    if (isReviewReported(item)) return 'Ulasan Dilaporkan';
    return 'Moderasi';
  };

  const getItemTypeBadgeType = (item: any) => {
    if (isProductPendingApproval(item)) return 'info';
    if (isProductReported(item)) return 'error';
    if (isReviewReported(item)) return 'warning';
    return 'neutral';
  };

  const filteredItems = items
    .filter(item => {
      // Filter by tab
      if (activeTab === 'PRODUCTS_PENDING') return isProductPendingApproval(item);
      if (activeTab === 'PRODUCTS_REPORTED') return isProductReported(item);
      if (activeTab === 'REVIEWS_REPORTED') return isReviewReported(item);
      
      // 'ALL' shows all active pending items
      return isProductPendingApproval(item) || isProductReported(item) || isReviewReported(item);
    })
    .filter(item => {
      // Search keyword filter
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.author && item.author.toLowerCase().includes(term)) ||
        (item.reason && item.reason.toLowerCase().includes(term)) ||
        (item.content && item.content.toLowerCase().includes(term)) ||
        (item.id && item.id.toString().toLowerCase().includes(term)) ||
        (item.targetId && item.targetId.toString().toLowerCase().includes(term))
      );
    });

  // Sort: active pending items first, resolved audit history items at the bottom
  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    const aResolved = isItemResolved(a);
    const bResolved = isItemResolved(b);
    if (!aResolved && bResolved) return -1;
    if (aResolved && !bResolved) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
         <div className="space-y-1 border-l-4 border-rose-500 pl-6 py-1">
            <h1 className="text-3xl font-black tracking-tighter text-foreground">Moderasi Produk</h1>
            <p className="text-muted-foreground text-sm font-medium">Persetujuan produk baru distributor dan pengelolaan ulasan produk marketplace.</p>
         </div>
         
         {/* Moderation Workflow Tabs */}
         <div className="flex bg-muted p-1 rounded-xl border border-border shadow-inner flex-wrap gap-1">
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('ALL')}
              className={cn(
                "h-10 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all", 
                activeTab === 'ALL' ? "bg-white text-black shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semua
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('PRODUCTS_PENDING')}
              className={cn(
                "h-10 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all", 
                activeTab === 'PRODUCTS_PENDING' ? "bg-white text-black shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Produk Pending
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('PRODUCTS_REPORTED')}
              className={cn(
                "h-10 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all", 
                activeTab === 'PRODUCTS_REPORTED' ? "bg-white text-black shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Produk Dilaporkan
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('REVIEWS_REPORTED')}
              className={cn(
                "h-10 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all", 
                activeTab === 'REVIEWS_REPORTED' ? "bg-white text-black shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ulasan Dilaporkan
            </Button>
         </div>
      </div>

      {/* Compact Search & Filter Controls */}
      <div className="bg-card border border-border/50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-lg items-center">
         <div className="flex-1 relative group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama produk, distributor, alasan laporan, atau konten..." 
              className="w-full h-11 bg-muted/40 border border-border/30 pl-12 pr-4 rounded-xl text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all font-sans text-foreground" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-4 items-center shrink-0 w-full md:w-auto justify-between md:justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-muted-foreground hover:text-foreground">
               <input 
                 type="checkbox" 
                 checked={showResolved}
                 onChange={(e) => setShowResolved(e.target.checked)}
                 className="w-4 h-4 rounded border-border/40 text-primary focus:ring-primary/40"
               />
               Tampilkan Riwayat Moderasi
            </label>
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/30 h-11">
               <Button 
                 variant="ghost" 
                 size="icon"
                 className={cn("h-full w-10 rounded-lg transition-all", viewMode === 'GRID' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} 
                 onClick={() => setViewMode('GRID')}
                 title="Tampilan Grid"
                 aria-label="Tampilan Grid"
               >
                 <LayoutGrid size={18} />
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon"
                 className={cn("h-full w-10 rounded-lg transition-all", viewMode === 'LIST' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} 
                 onClick={() => setViewMode('LIST')}
                 title="Tampilan List"
                 aria-label="Tampilan List"
               >
                 <List size={18} />
               </Button>
            </div>
         </div>
      </div>

      {/* Main Moderation Content List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground bg-card border border-border/40 rounded-2xl shadow-sm">
           <Loader2 className="animate-spin text-primary" size={36} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Database Moderasi...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center p-8 py-12 bg-rose-500/5 border border-dashed border-rose-500/25 rounded-2xl max-w-xl mx-auto space-y-4">
           <p className="text-rose-500 font-bold">{error}</p>
           <Button variant="outline" className="rounded-xl" onClick={fetchModerationItems}>Coba Lagi</Button>
        </div>
      ) : sortedFilteredItems.length === 0 ? (
        items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-card border border-dashed border-border/60 rounded-2xl shadow-sm max-w-xl mx-auto">
            <CheckCircle2 className="text-emerald-500/60 mb-4 animate-bounce" size={48} />
            <h3 className="text-lg font-black tracking-tight mb-1">Belum ada item moderasi.</h3>
            <p className="text-muted-foreground text-sm font-medium">Produk baru, laporan produk, dan laporan ulasan akan muncul di sini.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-card border border-dashed border-border/60 rounded-2xl shadow-sm max-w-xl mx-auto">
            <Search className="text-primary/40 mb-4" size={48} />
            <h3 className="text-lg font-black tracking-tight mb-1">
              {search.trim() !== '' ? "Tidak ada item yang sesuai dengan pencarian atau filter." : 
               activeTab === 'PRODUCTS_PENDING' ? "Tidak ada produk yang menunggu persetujuan." :
               activeTab === 'PRODUCTS_REPORTED' ? "Tidak ada produk yang dilaporkan." :
               activeTab === 'REVIEWS_REPORTED' ? "Tidak ada ulasan yang dilaporkan." :
               "Tidak ada item yang sesuai dengan pencarian atau filter."}
            </h3>
            <p className="text-muted-foreground text-sm font-medium">Coba gunakan kata kunci lain atau ubah filter Anda.</p>
          </div>
        )
      ) : (
        viewMode === 'LIST' ? (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
             <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                    <thead>
                       <tr className="border-b border-border/50 bg-muted/20">
                          <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipe</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pengaju/Pelapor</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tanggal</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aksi</th>
                       </tr>
                    </thead>
                   <tbody className="divide-y divide-border/20">
                       {sortedFilteredItems.map((item, i) => {
                         const resolved = isItemResolved(item);
                         const isProduct = (item.targetType ?? item.type)?.toUpperCase() === 'PRODUCT';
                         return (
                           <motion.tr 
                             key={item.id}
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: i * 0.05 }}
                             className={cn(
                               "group transition-all border-b border-border/30 last:border-none",
                               resolved ? "bg-muted/10 opacity-70 hover:opacity-100" : "hover:bg-muted/10"
                             )}
                           >
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                                       {isProduct && item.image ? (
                                         <img src={item.image} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                         isProduct ? (
                                           <Box size={20} className="text-muted-foreground/45" />
                                         ) : (
                                           <MessageSquare size={20} className="text-muted-foreground/45" />
                                         )
                                       )}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-black text-sm text-foreground">{item.title}</span>
                                       {item.content && (
                                         <span className="text-xs text-muted-foreground line-clamp-1 italic">"{item.content}"</span>
                                       )}
                                    </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                 <StatusBadge 
                                   type={getItemTypeBadgeType(item)} 
                                   label={getItemTypeLabel(item)} 
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{item.author}</span>
                                    {item.reason && (
                                      <span className="text-[10px] font-medium text-rose-500">{item.reason}</span>
                                    )}
                                    {item.note && (
                                      <span className="text-[10px] font-medium text-muted-foreground italic mt-0.5">Catatan: {item.note}</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <StatusBadge 
                                   type={getStatusBadgeType(item.status)} 
                                   label={getStatusLabelInIndonesian(item.status)} 
                                 />
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                 {item.timestamp}
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end items-center gap-2">
                                    {resolved ? (
                                       <>
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           className="h-8 px-3 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all"
                                           onClick={() => handleRestore(item.id)}
                                           disabled={actionInProgress !== null}
                                         >
                                           {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-emerald-500 mr-1" /> : null}
                                           Pulihkan
                                         </Button>
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           className="h-8 px-3 rounded-lg text-amber-500 border-amber-500/25 hover:bg-amber-500/5 text-xs font-bold transition-all"
                                           onClick={() => handleReopen(item.id)}
                                           disabled={actionInProgress !== null}
                                         >
                                           {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-amber-500 mr-1" /> : null}
                                           Buka Ulang
                                         </Button>
                                       </>
                                    ) : (
                                       <>
                                         {/* Pending Product approval actions */}
                                         {isProductPendingApproval(item) && (
                                           <>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleApproveProduct(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-emerald-500 mr-1" /> : null}
                                               Setujui Produk
                                             </Button>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleRejectProduct(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-rose-500 mr-1" /> : null}
                                               Tolak Produk
                                             </Button>
                                           </>
                                         )}
                                         
                                         {/* Reported Product actions */}
                                         {isProductReported(item) && (
                                           <>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-primary border-primary/25 hover:bg-primary/5 text-xs font-bold transition-all"
                                               onClick={() => {
                                                 const details = `Detail Laporan Produk:\n\nProduk: ${item.title}\nID: ${item.targetId || item.id}\nPengaju/Distributor: ${item.author}\nAlasan Laporan: ${item.reason}\n\nCatatan Tambahan: ${item.note || '-'}`;
                                                 alert(details);
                                               }}
                                             >
                                               Detail
                                             </Button>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleHideProduct(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-rose-500 mr-1" /> : null}
                                               Sembunyikan Produk
                                             </Button>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleResolveReport(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-emerald-500 mr-1" /> : null}
                                               Tandai Selesai
                                             </Button>
                                           </>
                                         )}

                                         {/* Reported Review actions */}
                                         {isReviewReported(item) && (
                                           <>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-primary border-primary/25 hover:bg-primary/5 text-xs font-bold transition-all"
                                               onClick={() => {
                                                 const details = `Detail Laporan Ulasan:\n\nUlasan untuk: ${item.title}\nID: ${item.targetId || item.id}\nPenulis: ${item.author}\nAlasan Laporan: ${item.reason}\nKonten Ulasan: "${item.content || ''}"`;
                                                 alert(details);
                                               }}
                                             >
                                               Detail
                                             </Button>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleHideReview(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-rose-500 mr-1" /> : null}
                                               Sembunyikan Ulasan
                                             </Button>
                                             <Button 
                                               variant="outline" 
                                               size="sm"
                                               className="h-8 px-3 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all"
                                               onClick={() => handleResolveReport(item.id)}
                                               disabled={actionInProgress !== null}
                                             >
                                               {actionInProgress === item.id ? <Loader2 size={12} className="animate-spin text-emerald-500 mr-1" /> : null}
                                               Tandai Selesai
                                             </Button>
                                           </>
                                         )}
                                       </>
                                    )}
                                 </div>
                              </td>
                           </motion.tr>
                         );
                       })}
                   </tbody>
                </table>
             </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
             {sortedFilteredItems.map((item, i) => {
                const resolved = isItemResolved(item);
                const isProduct = (item.targetType ?? item.type)?.toUpperCase() === 'PRODUCT';
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "bg-card border border-border/50 shadow-md rounded-2xl flex flex-col h-full overflow-hidden relative group hover:border-primary/30 transition-all",
                      resolved ? "bg-muted/10 opacity-70 hover:opacity-100" : ""
                    )}
                  >
                     {/* Severity Indicator Strip */}
                     <div className={cn(
                       "absolute top-0 left-0 w-full h-1.5",
                       item.severity === 'HIGH' ? "bg-rose-500" : "bg-amber-500"
                     )} />

                     {/* Resource Preview */}
                     <div className="relative bg-muted/20 flex items-center justify-center overflow-hidden aspect-video shrink-0">
                        {isProduct ? (
                          item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                               <Box size={32} className="text-muted-foreground/30" />
                               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">No Image</span>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <MessageSquare size={32} className="text-muted-foreground/30" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Konten Ulasan</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                           <StatusBadge type={getItemTypeBadgeType(item)} label={getItemTypeLabel(item)} />
                        </div>
                        <div className="absolute top-3 right-3">
                           <StatusBadge type={getStatusBadgeType(item.status)} label={getStatusLabelInIndonesian(item.status)} />
                        </div>
                     </div>

                     {/* Info Content */}
                     <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base font-black tracking-tight leading-tight text-foreground line-clamp-2">{item.title}</h3>
                           </div>
                           
                           <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/75 flex-wrap">
                              <span className="underline">{item.author}</span>
                              <span>•</span>
                              <span>{item.timestamp}</span>
                           </div>

                           {item.reason && (
                             <div className="text-xs text-rose-500 font-bold bg-rose-500/5 border border-rose-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 w-fit">
                                <AlertTriangle size={12} /> {item.reason}
                             </div>
                           )}

                           {item.note && (
                             <p className="text-xs font-bold text-muted-foreground bg-muted/40 p-2.5 rounded-lg italic">
                               Catatan: {item.note}
                             </p>
                           )}

                           {!isProduct && item.content && (
                             <p className="p-3 bg-muted/20 border border-border/30 rounded-xl text-xs font-medium italic text-muted-foreground leading-relaxed">
                                "{item.content}"
                             </p>
                           )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/30 flex-wrap gap-2 w-full">
                           {resolved ? (
                              <div className="flex gap-2 w-full justify-between">
                                 <Button 
                                   variant="outline" 
                                   className="h-10 px-4 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all flex items-center gap-1.5"
                                   onClick={() => handleRestore(item.id)}
                                   disabled={actionInProgress !== null}
                                 >
                                   {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-emerald-500 mr-1.5" /> : null}
                                   Pulihkan
                                 </Button>
                                 <Button 
                                   variant="outline" 
                                   className="h-10 px-4 rounded-lg text-amber-500 border-amber-500/25 hover:bg-amber-500/5 text-xs font-bold transition-all flex items-center gap-1.5"
                                   onClick={() => handleReopen(item.id)}
                                   disabled={actionInProgress !== null}
                                 >
                                   {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-amber-500 mr-1.5" /> : null}
                                   Buka Ulang
                                 </Button>
                              </div>
                           ) : (
                              <div className="flex flex-col gap-2 w-full">
                                 {/* Pending Product actions */}
                                 {isProductPendingApproval(item) && (
                                    <div className="flex gap-2 justify-between w-full">
                                       <Button 
                                         variant="outline" 
                                         className="h-10 px-4 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all flex-1"
                                         onClick={() => handleApproveProduct(item.id)}
                                         disabled={actionInProgress !== null}
                                       >
                                         {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-emerald-500 mr-1.5" /> : null}
                                         Setujui
                                       </Button>
                                       <Button 
                                         variant="outline" 
                                         className="h-10 px-4 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all flex-1"
                                         onClick={() => handleRejectProduct(item.id)}
                                         disabled={actionInProgress !== null}
                                       >
                                         {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-rose-500 mr-1.5" /> : null}
                                         Tolak
                                       </Button>
                                    </div>
                                 )}

                                 {/* Reported Product actions */}
                                 {isProductReported(item) && (
                                    <div className="flex flex-col gap-2 w-full">
                                       <div className="flex gap-2">
                                          <Button 
                                            variant="outline" 
                                            className="h-10 px-4 rounded-lg text-primary border-primary/25 hover:bg-primary/5 text-xs font-bold transition-all flex-1"
                                            onClick={() => {
                                              const details = `Detail Laporan Produk:\n\nProduk: ${item.title}\nID: ${item.targetId || item.id}\nPengaju/Distributor: ${item.author}\nAlasan Laporan: ${item.reason}\n\nCatatan Tambahan: ${item.note || '-'}`;
                                              alert(details);
                                            }}
                                          >
                                            Detail
                                          </Button>
                                          <Button 
                                            variant="outline" 
                                            className="h-10 px-4 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all flex-1"
                                            onClick={() => handleResolveReport(item.id)}
                                            disabled={actionInProgress !== null}
                                          >
                                            {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-emerald-500 mr-1.5" /> : null}
                                            Selesai
                                          </Button>
                                       </div>
                                       <Button 
                                         variant="outline" 
                                         className="h-10 px-4 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all w-full"
                                         onClick={() => handleHideProduct(item.id)}
                                         disabled={actionInProgress !== null}
                                       >
                                         {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-rose-500 mr-1.5" /> : null}
                                         Sembunyikan Produk
                                       </Button>
                                    </div>
                                 )}

                                 {/* Reported Review actions */}
                                 {isReviewReported(item) && (
                                    <div className="flex flex-col gap-2 w-full">
                                       <div className="flex gap-2">
                                          <Button 
                                            variant="outline" 
                                            className="h-10 px-4 rounded-lg text-primary border-primary/25 hover:bg-primary/5 text-xs font-bold transition-all flex-1"
                                            onClick={() => {
                                              const details = `Detail Laporan Ulasan:\n\nUlasan untuk: ${item.title}\nID: ${item.targetId || item.id}\nPenulis: ${item.author}\nAlasan Laporan: ${item.reason}\nKonten Ulasan: "${item.content || ''}"`;
                                              alert(details);
                                            }}
                                          >
                                            Detail
                                          </Button>
                                          <Button 
                                            variant="outline" 
                                            className="h-10 px-4 rounded-lg text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/5 text-xs font-bold transition-all flex-1"
                                            onClick={() => handleResolveReport(item.id)}
                                            disabled={actionInProgress !== null}
                                          >
                                            {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-emerald-500 mr-1.5" /> : null}
                                            Selesai
                                          </Button>
                                       </div>
                                       <Button 
                                         variant="outline" 
                                         className="h-10 px-4 rounded-lg text-rose-500 border-rose-500/25 hover:bg-rose-500/5 text-xs font-bold transition-all w-full"
                                         onClick={() => handleHideReview(item.id)}
                                         disabled={actionInProgress !== null}
                                       >
                                         {actionInProgress === item.id ? <Loader2 size={14} className="animate-spin text-rose-500 mr-1.5" /> : null}
                                         Sembunyikan Ulasan
                                       </Button>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  </motion.div>
                );
             })}
          </div>
        )
      )}
    </div>
  );
};
