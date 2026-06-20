import React, { useState, useEffect } from 'react';
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
  List,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
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
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS' | 'REVIEWS'>('ALL');
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuthStore();

  const fetchModerationItems = async () => {
    try {
      setIsLoading(true);
      const qSnap = await getDocs(collection(db, 'moderation_items'));
      const list: any[] = [];
      qSnap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setItems(list);
    } catch (err) {
      console.error('Gagal memuat item moderasi:', err);
      toast.error('Gagal memuat data moderasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationItems();
  }, []);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (itemId: string) => {
    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const docRef = doc(db, 'moderation_items', itemId);

      // Approve: set status to approved and add resolver fields
      await updateDoc(docRef, {
        status: 'approved',
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      setItems(prev =>
        prev.map(i =>
          i.id === itemId ? { ...i, status: 'approved', resolvedAt: new Date(), resolvedBy: currentUser?.email || currentUser?.id || 'System Admin' } : i
        )
      );

      // Audit log
      await createAuditLog({
        event: 'MODERATION_APPROVED_SAFE',
        status: 'SUCCESS',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menyetujui laporan ${item?.targetType ?? item?.type} ID ${item?.targetId ?? item?.id}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.success('Laporan disetujui.');
    } catch (err) {
      console.error('Gagal menyetujui laporan:', err);
      toast.error('Gagal menyetujui laporan');
    } finally {
      setActionInProgress(null);
      fetchModerationItems();
    }
  };

  const handleReject = async (itemId: string) => {
    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      const docRef = doc(db, 'moderation_items', itemId);

      // Update moderation report status to rejected with resolver fields
      await updateDoc(docRef, {
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Deactivate product or hide review based on targetType
      if (item?.targetType?.toUpperCase() === 'PRODUCT' || item?.type?.toUpperCase() === 'PRODUCT') {
        const productId = item?.targetId ?? item?.id;
        const prodRef = doc(db, 'products', productId);
        await updateDoc(prodRef, { is_active: false });
      } else if (item?.targetType?.toUpperCase() === 'REVIEW' || item?.type?.toUpperCase() === 'REVIEW') {
        const reviewId = item?.targetId ?? item?.id;
        const revRef = doc(db, 'reviews', reviewId);
        await updateDoc(revRef, { is_hidden: true });
      }

      setItems(prev =>
        prev.map(i =>
          i.id === itemId ? { ...i, status: 'rejected', resolvedAt: new Date(), resolvedBy: currentUser?.email || currentUser?.id || 'System Admin' } : i
        )
      );

      // Audit log
      await createAuditLog({
        event: 'MODERATION_CONTENT_BLOCKED',
        status: 'BLOCK',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Menolak laporan ${item?.targetType ?? item?.type} ID ${item?.targetId ?? item?.id}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.error('Laporan ditolak dan konten disembunyikan.');
    } catch (err) {
      console.error('Gagal menolak laporan:', err);
      toast.error('Gagal menolak laporan');
    } finally {
      setActionInProgress(null);
      fetchModerationItems();
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin mengarsipkan laporan moderasi ini?')) return;
    setActionInProgress(itemId);
    try {
      const item = items.find(i => i.id === itemId);
      // Soft delete: update status to 'deleted' and record deletion metadata
      await updateDoc(doc(db, 'moderation_items', itemId), {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: currentUser?.email || currentUser?.id || 'System Admin',
      });

      // Remove from local list
      setItems(prev => prev.filter(i => i.id !== itemId));

      // Audit log
      await createAuditLog({
        event: 'MODERATION_DELETED',
        status: 'WARNING',
        user: currentUser?.email || currentUser?.id || 'System Admin',
        details: `Mengarsipkan laporan moderasi ID ${itemId}`,
        targetCollection: 'moderation_items',
        targetId: itemId,
      });

      toast.success('Laporan moderasi diarsipkan.');
    } catch (err) {
      console.error('Gagal mengarsipkan laporan moderasi:', err);
      toast.error('Gagal mengarsipkan laporan moderasi');
    } finally {
      setActionInProgress(null);
      fetchModerationItems();
    }
  };

  const filteredItems = items
    .filter(item => {
      // Filter tab
      if (activeTab === 'PRODUCTS') return (item.targetType ?? item.type) === 'PRODUCT';
      if (activeTab === 'REVIEWS') return (item.targetType ?? item.type) === 'REVIEW';
      return true;
    })
    .filter(item => {
      // Show only pending reports
      return (item.status ?? '').toLowerCase() === 'pending';
    })
    .filter(item => {
      // Search keyword
      const term = search.toLowerCase();
      return (
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.author && item.author.toLowerCase().includes(term)) ||
        (item.reason && item.reason.toLowerCase().includes(term)) ||
        (item.content && item.content.toLowerCase().includes(term)) ||
        (item.targetId && item.targetId.toString().toLowerCase().includes(term))
      );
    });

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between flex-wrap gap-6">
         <div className="space-y-1 border-l-4 border-rose-500 pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Moderasi Produk</h1>
            <p className="text-muted-foreground font-medium">Persetujuan produk baru distributor dan pengelolaan ulasan produk marketplace.</p>
         </div>
         <div className="flex bg-muted p-1 rounded-2xl border border-border shadow-inner">
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('ALL')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'ALL' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >Semua Laporan</Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('PRODUCTS')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'PRODUCTS' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >Produk</Button>
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('REVIEWS')}
              className={cn("h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest", activeTab === 'REVIEWS' ? "bg-white text-black shadow-lg" : "text-muted-foreground")}
            >Ulasan</Button>
         </div>
      </div>

      <div className="bg-card border border-border/50 p-6 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 shadow-xl sticky top-28 z-30 backdrop-blur-3xl bg-card/80">
         <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input 
              type="text" 
              placeholder="Filter berdasarkan penulis, alasan atau konten..." 
              className="w-full h-14 bg-muted/40 border border-border/30 px-16 rounded-2xl text-sm font-bold outline-none focus:border-primary/40 transition-all font-sans" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-4">
            <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/30 h-14">
               <Button variant="ghost" className={cn("h-full px-4 rounded-xl", viewMode === 'GRID' ? "bg-white shadow-sm" : "")} onClick={() => setViewMode('GRID')}><LayoutGrid size={20} /></Button>
               <Button variant="ghost" className={cn("h-full px-4 rounded-xl", viewMode === 'LIST' ? "bg-white shadow-sm" : "")} onClick={() => setViewMode('LIST')}><List size={20} /></Button>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Database Moderasi...</p>
        </div>
      ) : error ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4 bg-rose-50 border border-dashed border-rose-200 rounded-[3rem] p-6">
           <p className="text-rose-600 font-black text-lg">{error}</p>
           <Button variant="outline" onClick={fetchModerationItems}>Coba Lagi</Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4 bg-muted/10 border border-dashed border-border/50 rounded-[3rem] p-6">
           <p className="text-muted-foreground font-black text-lg">Tidak ada laporan moderasi saat ini.</p>
        </div>
      ) : (
        <div className={cn("grid gap-8", viewMode === 'GRID' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
           {filteredItems.map((item, i) => (
             <motion.div
               key={item.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className={cn(
                 "bg-card border border-border/50 shadow-xl relative overflow-hidden group hover:border-primary/30 transition-all",
                 viewMode === 'LIST' ? "rounded-[3rem] p-10 flex flex-col sm:flex-row items-center gap-10" : "rounded-[2.5rem] flex flex-col h-full"
               )}
             >
                {/* Severity Indicator Strip */}
                <div className={cn(
                  "absolute top-0 left-0 w-2 sm:w-2 sm:h-full h-2 w-full sm:top-0",
                  item.severity === 'HIGH' ? "bg-rose-500" : "bg-amber-500"
                )} />

                {/* Resource Preview */}
                <div className={cn(
                  "relative bg-muted/20 flex items-center justify-center overflow-hidden shrink-0",
                  viewMode === 'LIST' ? "w-full sm:w-48 h-48 rounded-[2rem]" : "w-full aspect-video"
                )}>
                   {item.type === 'PRODUCT' ? (
                     <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   ) : (
                     <div className="flex flex-col items-center gap-3">
                        <MessageSquare size={48} className="text-muted-foreground/30" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Konten Ulasan</span>
                     </div>
                   )}
                   <div className="absolute top-4 left-4">
                      <StatusBadge type={item.type === 'PRODUCT' ? 'info' : 'warning'} label={item.type} />
                   </div>
                </div>

                {/* Info Content */}
                <div className="flex-1 space-y-6 w-full">
                   <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                         <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{item.title}</h3>
                         <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2"><Clock size={12} /> {item.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground flex-wrap">
                         <span className="flex items-center gap-2 italic uppercase tracking-wider underline"><User size={14} /> {item.author}</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-border" />
                         <span className="flex items-center gap-2 text-rose-500"><AlertTriangle size={14} /> {item.reason}</span>
                      </div>
                   </div>

                   {item.type === 'REVIEW' && (
                     <p className="p-6 bg-muted/20 border border-border/30 rounded-2xl text-sm font-medium italic text-muted-foreground leading-relaxed">
                        "{item.content}"
                     </p>
                   )}

                   <div className="flex items-center justify-between pt-4 border-t border-border/30 flex-wrap gap-4">
                      <div className="flex gap-2">
                         <Button 
                           variant="outline" 
                           className="h-12 w-12 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all p-0 flex items-center justify-center"
                           onClick={() => handleApprove(item.id)}
                           title="Setujui Konten"
                           disabled={actionInProgress !== null}
                         >
                            {actionInProgress === item.id ? (
                               <Loader2 size={24} className="animate-spin text-emerald-500" />
                             ) : (
                               <CheckCircle2 size={24} />
                             )}
                         </Button>
                         <Button 
                           variant="outline" 
                           className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all p-0 flex items-center justify-center"
                           onClick={() => handleReject(item.id)}
                           title="Blokir Konten"
                           disabled={actionInProgress !== null}
                         >
                            {actionInProgress === item.id ? (
                               <Loader2 size={24} className="animate-spin text-rose-500" />
                             ) : (
                               <XCircle size={24} />
                             )}
                         </Button>
                      </div>
                      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-rose-500 flex gap-2 items-center"
                           onClick={() => handleDelete(item.id)}
                           disabled={actionInProgress !== null}
                         >
                            {actionInProgress === item.id ? (
                               <Loader2 size={16} className="animate-spin text-rose-500 mr-2" />
                             ) : (
                               <Trash2 size={16} className="mr-2" />
                             )}
                            Hapus Laporan
                         </Button>
                      </div>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      )}
    </div>
  );
};
