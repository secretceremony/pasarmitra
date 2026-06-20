import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  MapPin, 
  Printer,
  Upload,
  AlertTriangle,
  X,
  Check,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { orderService, Order } from '../services/orderService';
import { useAuthStore } from '../../../store/use-auth-store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export const OrderManagement = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});

  // Dispute & Refund states
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidenceNote, setDisputeEvidenceNote] = useState('');
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState('');
  const [disputeResolution, setDisputeResolution] = useState<'refund' | 'replacement' | 'admin_review'>('admin_review');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Simulated file uploader states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // View Dispute details states
  const [isViewDisputeModalOpen, setIsViewDisputeModalOpen] = useState(false);
  const [selectedDisputeForView, setSelectedDisputeForView] = useState<any | null>(null);

  const getDisputeLabel = (dispute: any) => {
    const statusStr = (dispute.status || '').toUpperCase();
    const resType = (dispute.resolution_type || '').toUpperCase();

    if (statusStr === 'RESOLVED') {
      if (resType === 'REFUNDED') return 'Refund Diproses';
      if (resType === 'REJECTED') return 'Ditolak';
      return 'Selesai';
    }
    if (statusStr === 'IN_MEDIATION') return 'Dalam Mediasi';
    if (statusStr === 'UNDER_REVIEW') return 'Sedang Ditinjau';
    return 'Menunggu Review';
  };

  const getDisputeColor = (dispute: any) => {
    const statusStr = (dispute.status || '').toUpperCase();
    const resType = (dispute.resolution_type || '').toUpperCase();

    if (statusStr === 'RESOLVED') {
      if (resType === 'REFUNDED') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      if (resType === 'REJECTED') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (statusStr === 'IN_MEDIATION') return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (statusStr === 'UNDER_REVIEW') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    return 'bg-[#A35139]/10 text-[#A35139] border border-[#A35139]/20';
  };

  const TABS = [
    { key: 'All', label: 'Semua' },
    { key: 'Pending', label: 'Menunggu' },
    { key: 'Processing', label: 'Diproses' },
    { key: 'Shipped', label: 'Dikirim' },
    { key: 'Delivered', label: 'Selesai' }
  ];

  // Redirect admin to finances page
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/finances');
    }
  }, [user?.role, navigate]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    if (user.role === 'ADMIN') {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const ordersPromise = user.role === 'UMKM'
        ? orderService.getBuyerOrders(user.id)
        : orderService.getDistributorOrders(user.id);
        
      const disputesPromise = user.role === 'UMKM'
        ? getDocs(query(collection(db, 'disputes'), where('buyer_id', '==', user.id)))
        : getDocs(query(collection(db, 'disputes'), where('distributor_id', '==', user.id)));

      const [ordersData, disputesSnap] = await Promise.all([
        ordersPromise,
        disputesPromise
      ]);

      setOrders(ordersData);

      if (disputesSnap) {
        const disputesList: any[] = [];
        disputesSnap.forEach((docSnap) => {
          disputesList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDisputes(disputesList);
      }
    } catch (err) {
      console.error("Gagal memuat data pesanan/komplain:", err);
      setError('Gagal memuat pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id, user?.role]);

  const handleStatusUpdate = async (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] | null = null;
    if (currentStatus === 'pending') nextStatus = 'processing';
    else if (currentStatus === 'processing') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'delivered';
    
    if (!nextStatus) return;
    
    setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));
    try {
      const updated = await orderService.updateOrderStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      toast.success(`Status pesanan berhasil diperbarui menjadi ${getStatusLabel(nextStatus)}.`);
    } catch (err: any) {
      console.error("Gagal memperbarui status pesanan:", err);
      toast.error(err.message || "Gagal memperbarui status pesanan.");
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleOpenDisputeModal = (order: Order) => {
    setSelectedOrderForDispute(order);
    setDisputeReason('');
    setDisputeEvidenceNote('');
    setDisputeEvidenceUrl('');
    setDisputeResolution('admin_review');
    setValidationError('');
    setUploadedFileName('');
    setUploadProgress(0);
    setIsDisputeModalOpen(true);
  };

  const handleSimulateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFileName(file.name);

    try {
      // Simulate file upload progress
      for (let p = 10; p <= 100; p += 30) {
        setUploadProgress(Math.min(p, 100));
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      const mockUrl = `https://firebasestorage.googleapis.com/v0/b/pasarmitra/o/disputes%2F${encodeURIComponent(file.name)}`;
      setDisputeEvidenceUrl(mockUrl);
    } catch (err) {
      console.error("Gagal simulasi upload file:", err);
      toast.error('Gagal mengunggah file bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDispute || !user?.id) return;

    // Validation checks
    if (!disputeReason.trim()) {
      setValidationError('Alasan komplain tidak boleh kosong.');
      return;
    }
    if (disputeReason.trim().length < 10) {
      setValidationError('Alasan komplain harus memiliki minimal 10 karakter.');
      return;
    }

    setValidationError('');
    setIsSubmittingDispute(true);

    try {
      const payload = {
        reason: disputeReason,
        evidence_note: disputeEvidenceNote,
        evidence_url: disputeEvidenceUrl,
        requested_resolution: disputeResolution
      };

      const newDispute = await orderService.createDisputeFromOrder(
        selectedOrderForDispute.id,
        user.id,
        payload
      );

      // Optimistically update disputes list in UI
      setDisputes(prev => [...prev, newDispute]);
      setIsDisputeModalOpen(false);
      toast.success('Pengajuan komplain berhasil dikirim.');
    } catch (err: any) {
      console.error("Gagal mengajukan komplain:", err);
      toast.error(err.message || 'Gagal mengirim pengajuan komplain.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'All' || order.status.toLowerCase() === activeTab.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (order.order_code || order.id || '').toLowerCase().includes(searchLower) ||
      (order.buyer_name || '').toLowerCase().includes(searchLower) ||
      (order.buyer_profile?.organization_name || '').toLowerCase().includes(searchLower) ||
      (order.distributor_name || '').toLowerCase().includes(searchLower) ||
      (order.shipping_address || '').toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Menunggu';
      case 'processing': return 'Diproses';
      case 'shipped': return 'Dikirim';
      case 'delivered': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    if (!status) return '-';

    switch (status.toLowerCase()) {
      case 'unpaid': return 'Menunggu Pembayaran';
      case 'paid': return 'Dibayar';
      case 'failed': return 'Gagal';
      case 'refunded': return 'Direfund';
      default: return status;
    }
  };

  const getItemsSummary = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      return 'Tidak ada item';
    }

    const [firstItem, ...restItems] = order.items;
    const firstItemName = firstItem.product_name || firstItem.product_id || 'Produk';
    const quantity = firstItem.quantity ? ` x${firstItem.quantity}` : '';
    const additionalItems = restItems.length > 0 ? ` +${restItems.length} item lainnya` : '';

    return `${firstItemName}${quantity}${additionalItems}`;
  };

  const formatOrderDate = (created_at?: string) => {
    if (!created_at) return '-';
    try {
      const d = new Date(created_at);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">
            {user?.role === 'UMKM' ? 'Pesanan Saya' : 'Pesanan Masuk'}
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            {user?.role === 'UMKM' 
              ? 'Lacak status pengiriman dan riwayat pembelian sembako Anda.' 
              : 'Proses pemenuhan dan lacak pengiriman di seluruh jaringan mitra Anda.'}
          </p>
        </div>
        {user?.role === 'DISTRIBUTOR' && (
          <div className="flex gap-4">
             <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
                Proses Massal
             </Button>
             <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
                <Printer className="mr-2" size={20} />
                Cetak Faktur
             </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-card border border-border/50 rounded-3xl w-fit">
         {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-6 py-3 rounded-2xl text-sm font-black transition-all",
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
         ))}
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder={user?.role === 'UMKM' ? "Cari berdasarkan ID Pesanan, Distributor, atau Alamat..." : "Cari berdasarkan ID Pesanan, Pembeli, atau Alamat..."} 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <Filter size={20} />
            Filter
         </Button>
      </div>

      {/* Orders List */}
      <div className="grid gap-6">
         {isLoading ? (
           <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[2.5rem] font-bold">
             Memuat pesanan...
           </div>
         ) : error ? (
           <div className="p-12 text-center bg-card border border-border/50 rounded-[2.5rem] space-y-2">
             <p className="text-xl font-black">Gagal memuat pesanan.</p>
             <p className="text-sm font-bold text-muted-foreground">Silakan coba buka halaman ini kembali.</p>
           </div>
         ) : filteredOrders.length === 0 ? (
           <div className="p-16 text-center bg-card border border-border/50 rounded-[2.5rem] space-y-4">
             <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center text-muted-foreground/40 mx-auto">
               <ShoppingBag size={32} />
             </div>
             {user?.role === 'UMKM' ? (
               <div className="space-y-1">
                 <p className="text-xl font-black">Belum ada pesanan.</p>
                 <p className="text-sm font-bold text-muted-foreground">Produk yang kamu checkout akan muncul di sini.</p>
               </div>
             ) : (
               <div className="space-y-1">
                 <p className="text-xl font-black">Belum ada pesanan masuk.</p>
                 <p className="text-sm font-bold text-muted-foreground">Pesanan dari UMKM akan muncul setelah checkout berhasil.</p>
               </div>
             )}
           </div>
         ) : (
           filteredOrders.map((order, i) => (
             <motion.div
               key={order.id}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: i * 0.05 }}
               className="bg-card border border-border/50 rounded-[2.5rem] p-10 flex flex-col lg:flex-row lg:items-center gap-10 shadow-xl group hover:border-primary/30 transition-all"
             >
                {/* Order Info */}
                <div className="flex items-center gap-8 lg:w-1/4">
                   <div className={cn(
                     "w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-3xl font-black shadow-inner",
                     order.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                     order.status === 'processing' ? "bg-blue-500/10 text-blue-500" :
                     order.status === 'shipped' ? "bg-emerald-500/10 text-emerald-500" :
                     "bg-muted/40 text-muted-foreground"
                   )}>
                      {(order.order_code || order.id || '').slice(-2).toUpperCase()}
                   </div>
                   <div>
                      <p className="text-2xl font-black tracking-tight">Pesanan #{order.order_code || order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                        {formatOrderDate(order.created_at)}
                      </p>
                   </div>
                </div>

                {/* Buyer & Address */}
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-3">
                      <p className="text-xl font-black group-hover:text-primary transition-colors">
                        {user?.role === 'UMKM'
                          ? (order.distributor_name || 'Distributor tidak diketahui')
                          : (order.buyer_name || order.buyer_profile?.organization_name || 'UMKM tidak diketahui')}
                      </p>
                      <span className="text-xs font-black text-muted-foreground bg-muted/40 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {order.items?.length || 0} Barang
                      </span>
                   </div>
                   <div className="flex items-center gap-3 text-muted-foreground">
                      <ShoppingBag size={16} className="text-primary/60" />
                      <p className="text-sm font-bold truncate max-w-sm">{getItemsSummary(order)}</p>
                   </div>
                    {user?.role === 'DISTRIBUTOR' && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                         <MapPin size={16} className="text-primary/60" />
                         <p className="text-sm font-bold truncate max-w-sm">{order.shipping_address || 'Alamat tidak ditentukan'}</p>
                      </div>
                    )}
                    {(() => {
                      const orderDispute = disputes.find(d => d.order_id === order.id || d.orderId === order.id);
                      if (orderDispute) {
                        return (
                          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs mt-2 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl w-fit">
                            <AlertTriangle size={14} className="animate-pulse shrink-0" />
                            <span>Komplain Aktif: {getDisputeLabel(orderDispute)}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                 </div>

                {/* Amount & Status */}
                <div className="flex items-center justify-between lg:w-1/3 gap-10">
                   <div className="text-right">
                      <p className="text-2xl font-black">
                        {order.total_amount !== undefined && order.total_amount !== null
                          ? `Rp ${order.total_amount.toLocaleString()}`
                          : 'Rp 0'}
                      </p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
                        {getPaymentStatusLabel(order.payment_status)}
                      </p>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className={cn(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                        order.status === 'pending' ? "bg-amber-500/20 text-amber-500" :
                        order.status === 'processing' ? "bg-blue-500/20 text-blue-500" :
                        order.status === 'shipped' ? "bg-emerald-500/20 text-emerald-500" :
                        "bg-muted/20 text-muted-foreground"
                      )}>
                         {getStatusLabel(order.status)}
                      </span>
                      {user?.role === 'DISTRIBUTOR' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button 
                          onClick={() => handleStatusUpdate(order.id, order.status)}
                          disabled={updatingOrders[order.id]}
                          className="h-12 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase"
                        >
                          {updatingOrders[order.id] ? 'Memproses...' : (order.status === 'pending' ? 'Proses' : order.status === 'processing' ? 'Kirim' : 'Selesaikan')}
                        </Button>
                      )}
                      {(() => {
                        const orderDispute = disputes.find(d => d.order_id === order.id || d.orderId === order.id);
                        if (orderDispute) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDisputeForView(orderDispute);
                                setIsViewDisputeModalOpen(true);
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.03] outline-none", 
                                getDisputeColor(orderDispute)
                              )}
                              title="Klik untuk melihat rincian komplain"
                            >
                              Komplain: {getDisputeLabel(orderDispute)}
                            </button>
                          );
                        }

                        // For UMKM only, allow filing a new dispute if eligible
                        if (user?.role === 'UMKM') {
                          const isEligible = order.payment_status === 'paid' && order.status !== 'cancelled';
                          if (isEligible) {
                            return (
                              <Button
                                onClick={() => handleOpenDisputeModal(order)}
                                className="h-12 px-4 rounded-xl bg-card hover:bg-muted text-foreground border border-border font-black text-xs uppercase transition-colors"
                              >
                                Ajukan Komplain / Refund
                              </Button>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                 </div>
              </motion.div>
            ))
          )}
       </div>

       {filteredOrders.length > 0 && !isLoading && !error && (
         <div className="flex justify-center pt-8">
            <Button variant="outline" className="h-14 px-12 rounded-2xl border-border font-black text-muted-foreground hover:text-primary">
               Muat Lebih Banyak Pesanan
            </Button>
         </div>
       )}

       {/* Dispute Modal */}
       <AnimatePresence>
         {isDisputeModalOpen && selectedOrderForDispute && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             {/* Overlay */}
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => !isSubmittingDispute && setIsDisputeModalOpen(false)}
               className="absolute inset-0 bg-background/80 backdrop-blur-sm"
             />

             {/* Modal Content */}
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-2xl bg-card border border-border/85 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden z-10 space-y-8"
             >
               <div className="flex justify-between items-start">
                 <div className="space-y-1.5">
                   <h3 className="text-3xl font-black tracking-tight">Ajukan Komplain Pesanan</h3>
                   <p className="text-sm font-bold text-muted-foreground">
                     Pesanan #{selectedOrderForDispute.order_code || selectedOrderForDispute.id.slice(0, 8).toUpperCase()}
                   </p>
                 </div>
                 <button
                   type="button"
                   onClick={() => !isSubmittingDispute && setIsDisputeModalOpen(false)}
                   className="p-3 bg-muted/40 hover:bg-muted rounded-2xl transition-colors cursor-pointer"
                   disabled={isSubmittingDispute}
                 >
                   <X size={20} />
                 </button>
               </div>

               <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                 Jelaskan masalah pada pesanan ini agar admin dapat meninjau pengajuan Anda.
               </p>

               <form onSubmit={handleDisputeSubmit} className="space-y-6">
                 {/* Resolution Request */}
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                     Solusi yang Diharapkan
                   </label>
                   <div className="grid grid-cols-3 gap-4">
                     {[
                       { value: 'refund', label: 'Refund Dana' },
                       { value: 'replacement', label: 'Ganti Barang' },
                       { value: 'admin_review', label: 'Tinjauan Admin' }
                     ].map((item) => (
                       <button
                         key={item.value}
                         type="button"
                         onClick={() => setDisputeResolution(item.value as any)}
                         disabled={isSubmittingDispute}
                         className={cn(
                           "py-4 px-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer",
                           disputeResolution === item.value 
                             ? "border-primary bg-primary/10 text-primary" 
                             : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground"
                         )}
                       >
                         {item.label}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Reason input */}
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                     Alasan Komplain <span className="text-rose-500">*</span>
                   </label>
                   <input
                     type="text"
                     value={disputeReason}
                     onChange={(e) => setDisputeReason(e.target.value)}
                     disabled={isSubmittingDispute}
                     placeholder="Contoh: Barang pecah, salah ukuran, jumlah kurang..."
                     className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                   />
                 </div>

                 {/* Evidence Note */}
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                     Catatan Detail Bukti (Opsional)
                   </label>
                   <textarea
                     value={disputeEvidenceNote}
                     onChange={(e) => setDisputeEvidenceNote(e.target.value)}
                     disabled={isSubmittingDispute}
                     placeholder="Berikan detail penjelasan tambahan mengenai bukti masalah..."
                     rows={4}
                     className="w-full bg-muted/20 border border-border/60 rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                   />
                 </div>

                 {/* Simulated file upload */}
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                     Dokumen / Foto Bukti (Opsional)
                   </label>
                   <div className="relative border border-dashed border-border/60 rounded-2xl p-6 hover:border-primary/40 transition-colors">
                     <input
                       type="file"
                       onChange={handleSimulateUpload}
                       disabled={isSubmittingDispute || isUploading}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       accept="image/*,application/pdf"
                     />
                     <div className="flex flex-col items-center justify-center text-center gap-2">
                       {isUploading ? (
                         <>
                           <Loader2 className="animate-spin text-primary" size={28} />
                           <p className="text-xs font-bold">Mengunggah file bukti ({uploadProgress}%)</p>
                           <div className="w-1/2 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                             <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                           </div>
                         </>
                       ) : uploadedFileName ? (
                         <>
                           <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                             <Check size={20} />
                           </div>
                           <p className="text-xs font-black text-primary">{uploadedFileName}</p>
                           <p className="text-[10px] text-muted-foreground">Klik atau seret file lain untuk mengganti</p>
                         </>
                       ) : (
                         <>
                           <Upload className="text-muted-foreground" size={28} />
                           <p className="text-xs font-bold">Klik untuk memilih file bukti (Opsional)</p>
                           <p className="text-[10px] text-muted-foreground">Mendukung format gambar dan PDF</p>
                         </>
                       )}
                     </div>
                   </div>
                 </div>

                 {/* Validation message */}
                 {validationError && (
                   <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-bold">
                     <AlertTriangle size={16} />
                     <span>{validationError}</span>
                   </div>
                 )}

                 {/* Action buttons */}
                 <div className="flex gap-4 pt-4">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => setIsDisputeModalOpen(false)}
                     disabled={isSubmittingDispute}
                     className="flex-1 h-14 rounded-2xl border-border font-black text-sm uppercase"
                   >
                     Batal
                   </Button>
                   <Button
                     type="submit"
                     disabled={isSubmittingDispute || isUploading}
                     className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase shadow-xl shadow-primary/20"
                   >
                     {isSubmittingDispute ? 'Mengirim...' : 'Kirim Pengajuan'}
                   </Button>
                 </div>
               </form>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* View Dispute Modal */}
       <AnimatePresence>
         {isViewDisputeModalOpen && selectedDisputeForView && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             {/* Overlay */}
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsViewDisputeModalOpen(false)}
               className="absolute inset-0 bg-background/80 backdrop-blur-sm"
             />

             {/* Modal Content */}
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-xl bg-card border border-border/85 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden z-10 space-y-6"
             >
               <div className="flex justify-between items-start">
                 <div className="space-y-1.5">
                   <h3 className="text-2xl font-black tracking-tight">Detail Komplain</h3>
                   <p className="text-xs font-bold text-muted-foreground">
                     ID Sengketa: {selectedDisputeForView.id}
                   </p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setIsViewDisputeModalOpen(false)}
                   className="p-3 bg-muted/40 hover:bg-muted rounded-2xl transition-colors cursor-pointer"
                 >
                   <X size={20} />
                 </button>
               </div>

               <div className="p-6 bg-muted/20 border border-border/30 rounded-2xl space-y-4 text-sm font-bold text-muted-foreground">
                 <div className="flex justify-between items-center border-b border-border/30 pb-3">
                   <span>Status Komplain:</span>
                   <span className={cn("px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider", getDisputeColor(selectedDisputeForView))}>
                     {getDisputeLabel(selectedDisputeForView)}
                   </span>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Alasan Komplain</p>
                   <p className="text-foreground font-bold">{selectedDisputeForView.reason}</p>
                 </div>
                 {selectedDisputeForView.evidence_note && (
                   <div>
                     <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Catatan Bukti</p>
                     <p className="text-foreground font-medium">{selectedDisputeForView.evidence_note}</p>
                   </div>
                 )}
                 {selectedDisputeForView.requested_resolution && (
                   <div>
                     <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Solusi yang Diharapkan</p>
                     <p className="text-[#A35139] capitalize font-black">
                       {selectedDisputeForView.requested_resolution === 'refund' ? 'Refund Dana' : 
                        selectedDisputeForView.requested_resolution === 'replacement' ? 'Ganti Barang' : 'Tinjauan Admin'}
                     </p>
                   </div>
                 )}
                 {selectedDisputeForView.rejection_reason && (
                   <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                     <p className="text-xs font-black uppercase tracking-widest mb-1">Alasan Penolakan Admin</p>
                     <p className="font-medium text-sm">{selectedDisputeForView.rejection_reason}</p>
                   </div>
                 )}
                 {selectedDisputeForView.refund_amount !== undefined && selectedDisputeForView.refund_amount !== null && (
                   <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
                     <p className="text-xs font-black uppercase tracking-widest mb-1">Informasi Refund</p>
                     <p className="font-bold text-sm">
                       Dana direfund: Rp {selectedDisputeForView.refund_amount.toLocaleString()}
                     </p>
                     {selectedDisputeForView.refund_note && (
                       <p className="text-xs text-muted-foreground font-medium mt-1">
                         Catatan: {selectedDisputeForView.refund_note}
                       </p>
                     )}
                   </div>
                 )}
               </div>

               {/* Evidence Link */}
               {selectedDisputeForView.evidence_url && (
                 <div className="space-y-3">
                   <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lampiran Bukti</p>
                   <div className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                       <FileText size={20} className="text-primary" />
                       <span className="text-xs font-bold truncate max-w-[200px]">Dokumen Bukti</span>
                     </div>
                     <a
                       href={selectedDisputeForView.evidence_url}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black transition-colors"
                     >
                       Lihat Dokumen
                     </a>
                   </div>
                   {selectedDisputeForView.evidence_url.match(/\.(jpeg|jpg|gif|png)/i) && (
                     <div className="max-h-48 border border-border/30 rounded-2xl overflow-hidden shadow-inner">
                       <img src={selectedDisputeForView.evidence_url} alt="Bukti" className="w-full h-full object-cover" />
                     </div>
                   )}
                 </div>
               )}

               <Button
                 onClick={() => setIsViewDisputeModalOpen(false)}
                 className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase"
               >
                 Tutup
               </Button>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
};
