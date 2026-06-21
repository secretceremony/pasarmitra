import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  CreditCard, 
  Truck, 
  User, 
  Building2, 
  ShoppingBag, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Package,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { Order, orderService } from '../services/orderService';
import { disputeService } from '../services/disputeService';
import { reviewService } from '../services/reviewService';
import { formatDateTime } from '../../../lib/dateUtils';
import { toast } from 'sonner';

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Menunggu Konfirmasi';
    case 'processing':
      return 'Sedang Diproses';
    case 'shipped':
      return 'Sedang Dikirim';
    case 'delivered':
      return 'Selesai';
    case 'cancelled':
      return 'Dibatalkan';
    default:
      return status;
  }
};

const getPaymentStatusLabel = (status?: string) => {
  if (!status) return '-';
  switch (status.toLowerCase()) {
    case 'unpaid':
      return 'Belum Dibayar';
    case 'pending':
      return 'Menunggu Konfirmasi';
    case 'paid':
      return 'Sudah Dibayar';
    case 'failed':
      return 'Pembayaran Gagal';
    case 'refunded':
      return 'Dana Dikembalikan (Refunded)';
    default:
      return status;
  }
};

const getPaymentMethodLabel = (method?: string) => {
  if (!method) return 'Escrow Transfer Bank';
  switch (method.toLowerCase()) {
    case 'bank_transfer':
      return 'Transfer Bank (BCA/Mandiri)';
    case 'qris':
      return 'QRIS';
    case 'cod':
      return 'Bayar di Tempat (COD)';
    case 'manual':
      return 'Transfer Bank Manual';
    default:
      return method;
  }
};

const getNextStatus = (status: Order['status']): Order['status'] | null => {
  if (status === 'pending') return 'processing';
  if (status === 'processing') return 'shipped';
  if (status === 'shipped') return 'delivered';
  return null;
};

const getActionLabel = (status: Order['status']) => {
  if (status === 'pending') return 'Proses Pesanan';
  if (status === 'processing') return 'Kirim Pesanan';
  if (status === 'shipped') return 'Selesaikan Pesanan';
  return '';
};

export const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dispute, setDispute] = useState<any | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Dispute Form fields
  const [disputeType, setDisputeType] = useState<string>('');
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeResolution, setDisputeResolution] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(['']);
  const [buyerNotes, setBuyerNotes] = useState('');

  // Review Form & State
  const [reviewedProductIds, setReviewedProductIds] = useState<Record<string, boolean>>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewProduct, setSelectedReviewProduct] = useState<{ id: string; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchOrderDetail = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await orderService.getOrderById(orderId);
      if (data) {
        setOrder(data);
        const disputeData = await disputeService.getDisputeByOrderId(orderId);
        setDispute(disputeData);
        // Fetch reviews
        const reviewsData = await reviewService.getReviewsForOrder(orderId);
        const reviewedMap: Record<string, boolean> = {};
        reviewsData.forEach(r => {
          reviewedMap[r.product_id] = true;
        });
        setReviewedProductIds(reviewedMap);
      } else {
        setError('Pesanan tidak ditemukan.');
      }
    } catch (err) {
      console.error('Gagal mengambil detail pesanan:', err);
      setError('Gagal memuat detail pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleStatusUpdate = async () => {
    if (!order || isUpdating) return;
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus || user?.role !== 'DISTRIBUTOR') return;

    try {
      setIsUpdating(true);
      const updated = await orderService.updateOrderStatus(order.id, nextStatus);
      setOrder(updated);
      toast.success(`Status pesanan diperbarui menjadi ${getStatusLabel(nextStatus)}.`);
    } catch (err: any) {
      console.error('Gagal memperbarui status pesanan:', err);
      toast.error(err.message || 'Gagal memperbarui status pesanan.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order || isConfirmingPayment) return;
    try {
      setIsConfirmingPayment(true);
      const updated = await orderService.confirmOrderPayment(order.id, user?.email || 'user@pasarmitra.com');
      setOrder(updated);
      toast.success("Pembayaran berhasil dikonfirmasi!");
    } catch (err: any) {
      console.error("Gagal mengonfirmasi pembayaran:", err);
      toast.error(err.message || "Gagal mengonfirmasi pembayaran.");
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user) return;

    if (!disputeType) {
      toast.error('Tipe komplain harus dipilih.');
      return;
    }
    if (!disputeTitle.trim()) {
      toast.error('Subjek komplain tidak boleh kosong.');
      return;
    }
    if (!disputeDescription.trim()) {
      toast.error('Deskripsi / kronologi harus diisi.');
      return;
    }
    if (!disputeResolution) {
      toast.error('Pilihan resolusi harus dipilih.');
      return;
    }

    const isRefundRelated = disputeResolution === 'full_refund' || disputeResolution === 'partial_refund';
    const amountNum = parseFloat(refundAmount);

    if (isRefundRelated) {
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error('Jumlah pengembalian dana harus berupa angka valid di atas 0.');
        return;
      }
      if (amountNum > order.total_amount) {
        toast.error('Jumlah pengembalian dana tidak boleh melebihi total pembayaran pesanan.');
        return;
      }
    }

    setIsSubmittingDispute(true);
    try {
      const filteredUrls = evidenceUrls.filter(url => url.trim() !== '');

      const newDispute = await disputeService.createDispute({
        order_id: order.id,
        buyer_id: user.id,
        buyer_name: user.full_name || user.organization_name || user.email || 'UMKM Buyer',
        type: disputeType as any,
        title: disputeTitle,
        description: disputeDescription,
        requested_resolution: disputeResolution as any,
        requested_refund_amount: isRefundRelated ? amountNum : undefined,
        evidence_urls: filteredUrls,
        buyer_notes: buyerNotes
      });

      toast.success('Komplain berhasil diajukan.');
      setDispute(newDispute);
      setIsDisputeModalOpen(false);

      // Reset
      setDisputeType('');
      setDisputeTitle('');
      setDisputeDescription('');
      setDisputeResolution('');
      setRefundAmount('');
      setEvidenceUrls(['']);
      setBuyerNotes('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal mengajukan komplain.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user || !selectedReviewProduct) return;

    if (!reviewRating) {
      toast.error('Silakan tentukan rating bintang.');
      return;
    }
    if (!reviewComment.trim()) {
      toast.error('Silakan tulis ulasan Anda.');
      return;
    }
    if (reviewComment.trim().length < 10) {
      toast.error('Ulasan terlalu pendek. Tulis minimal 10 karakter.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      await reviewService.createReview({
        order_id: order.id,
        product_id: selectedReviewProduct.id,
        distributor_id: order.distributor_id,
        buyer_id: user.id,
        buyer_name: user.organization_name || user.full_name || 'UMKM Buyer',
        rating: reviewRating,
        comment: reviewComment.trim()
      });

      toast.success('Ulasan berhasil dikirim.');
      
      // Update reviewed state map locally
      setReviewedProductIds(prev => ({
        ...prev,
        [selectedReviewProduct.id]: true
      }));

      setIsReviewModalOpen(false);
      setReviewComment('');
      setReviewRating(5);
      setSelectedReviewProduct(null);
    } catch (err: any) {
      console.error('Gagal mengirim ulasan:', err);
      toast.error(err.message || 'Gagal mengirim ulasan.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddEvidenceUrl = () => {
    setEvidenceUrls([...evidenceUrls, '']);
  };

  const handleRemoveEvidenceUrl = (index: number) => {
    const next = [...evidenceUrls];
    next.splice(index, 1);
    setEvidenceUrls(next.length === 0 ? [''] : next);
  };

  const handleEvidenceUrlChange = (index: number, val: string) => {
    const next = [...evidenceUrls];
    next[index] = val;
    setEvidenceUrls(next);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black text-xs uppercase tracking-widest">Memuat Detail Pesanan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">{error || 'Pesanan Tidak Ditemukan'}</h2>
          <p className="text-muted-foreground font-medium">Pastikan URL pesanan benar atau hubungi dukungan jika masalah berlanjut.</p>
        </div>
        <Button 
          onClick={() => navigate('/orders')}
          className="h-12 px-8 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform"
        >
          <ArrowLeft size={16} className="mr-2" />
          Kembali ke Daftar Pesanan
        </Button>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status);
  const isDistributor = user?.role === 'DISTRIBUTOR';
  
  // Timeline steps: Menunggu -> Diproses -> Dikirim -> Selesai / Batal
  const getTimelineSteps = () => {
    if (order.status === 'cancelled') {
      return [
        { label: 'Menunggu', completed: true, active: false },
        { label: 'Dibatalkan', completed: true, active: true, isError: true }
      ];
    }
    return [
      { label: 'Menunggu', completed: ['pending', 'processing', 'shipped', 'delivered'].includes(order.status), active: order.status === 'pending' },
      { label: 'Diproses', completed: ['processing', 'shipped', 'delivered'].includes(order.status), active: order.status === 'processing' },
      { label: 'Dikirim', completed: ['shipped', 'delivered'].includes(order.status), active: order.status === 'shipped' },
      { label: 'Selesai', completed: order.status === 'delivered', active: order.status === 'delivered' }
    ];
  };

  const steps = getTimelineSteps();

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-16 px-4 sm:px-0 w-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/orders')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Pesanan
        </button>
        <span>/</span>
        <span className="text-foreground">Detail Pesanan</span>
      </div>

      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Daftar Pesanan</span>
        </button>
        <span className="font-mono text-xs text-muted-foreground font-bold">
          ID: {order.id}
        </span>
      </div>

      {/* Header Banner: Status Bar */}
      <div className={cn(
        "p-5 sm:p-6 rounded-2xl border text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl relative overflow-hidden",
        order.status === 'pending' ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-500/20' :
        order.status === 'processing' ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500/20' :
        order.status === 'shipped' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500/20' :
        order.status === 'delivered' ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-border/50' :
        'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-500/20'
      )}>
        <div className="space-y-1 z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Status Transaksi</p>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{getStatusLabel(order.status)}</h2>
          <p className="text-xs text-white/80 font-medium">
            Pembaruan terakhir: {formatDateTime(order.updated_at || order.created_at)}
          </p>
        </div>
        <div className="z-10 shrink-0 text-left sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Kode Pesanan</p>
          <p className="text-lg sm:text-xl font-black tracking-tighter">
            #{order.order_code || order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Timeline progress bar */}
      <div className="p-4 sm:p-5 bg-card border border-border/50 rounded-2xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-3 relative">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-3 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-xs transition-all shadow-inner",
                  step.isError 
                    ? "bg-rose-500/10 border-rose-500 text-rose-500"
                    : step.active 
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                      : step.completed 
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted border-muted-foreground/20 text-muted-foreground"
                )}>
                  {step.isError ? '!' : step.completed && !step.active ? <CheckCircle2 size={14} /> : idx + 1}
                </div>
                <div>
                  <p className={cn(
                    "text-xs sm:text-sm font-black tracking-tight",
                    step.isError ? "text-rose-500" : step.active || step.completed ? "text-foreground" : "text-muted-foreground"
                  )}>{step.label}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {step.active ? 'Status Saat Ini' : step.completed ? 'Selesai' : 'Belum Mulai'}
                  </p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:block h-0.5 flex-1 bg-border relative mx-1">
                  <div className={cn(
                    "absolute top-0 left-0 h-full bg-primary transition-all duration-500",
                    step.completed && steps[idx+1].completed ? "w-full" : "w-0"
                  )} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* Left Column: Order Items, Pricing details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Ordered Products Card */}
          <div className="bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/10 flex items-center gap-3">
              <ShoppingBag className="text-primary shrink-0" size={18} />
              <h3 className="font-black text-base tracking-tight">Daftar Produk Dipesan</h3>
            </div>
            
            <div className="divide-y divide-border/30">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => {
                  const price = item.price || item.price_per_unit || 0;
                  const qty = item.quantity || 1;
                  const subtotal = item.subtotal || item.total_price || (price * qty);
                  
                  return (
                    <div key={item.id} className="p-4 sm:p-5 flex gap-4 sm:gap-5 group items-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                        <img 
                          src={item.image_url || '/assets/fallback-product.png'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          alt={item.product_name} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs sm:text-sm truncate group-hover:text-primary transition-colors leading-snug">{item.product_name}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                          Kuantitas: {qty} {item.unit || 'Box'}
                        </p>
                        {user?.role === 'UMKM' && order.status === 'delivered' && (
                          <div className="mt-2">
                            {reviewedProductIds[item.product_id || item.id] ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 size={10} /> Ulasan Dikirim
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 rounded-lg border-primary/30 hover:border-primary/50 text-[10px] font-black uppercase tracking-wider text-primary bg-card/50"
                                onClick={() => {
                                  setSelectedReviewProduct({ 
                                    id: item.product_id || item.id, 
                                    name: item.product_name 
                                  });
                                  setIsReviewModalOpen(true);
                                }}
                              >
                                Beri Ulasan
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-xs font-mono">Rp {price.toLocaleString('id-ID')}</p>
                        <p className="font-black text-xs sm:text-sm text-primary font-mono mt-0.5">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground italic font-medium">
                  Tidak ada item produk.
                </div>
              )}
            </div>
          </div>

          {/* Pricing breakdown Summary */}
          <div className="p-4 sm:p-5 bg-card border border-border/50 rounded-2xl shadow-lg space-y-3">
            <h3 className="font-black text-base tracking-tight border-b border-border/30 pb-2">Rincian Pembayaran</h3>
            
            <div className="space-y-2 text-xs sm:text-sm font-bold text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span className="text-foreground font-mono">Rp {(order.subtotal || (order.total_amount - (order.shipping_cost || 0))).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Pengiriman</span>
                <span className="text-foreground font-mono">Rp {(order.shipping_cost || 0).toLocaleString('id-ID')}</span>
              </div>
              {(order.service_fee || order.platform_fee) ? (
                <div className="flex justify-between">
                  <span>Biaya Layanan Platform</span>
                  <span className="text-foreground font-mono">Rp {(order.service_fee || order.platform_fee || 0).toLocaleString('id-ID')}</span>
                </div>
              ) : null}
              
              <div className="pt-3 border-t border-border/30 flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Pembayaran</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground tracking-tighter">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border shrink-0",
                  order.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  order.payment_status === 'unpaid' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                )}>
                  {getPaymentStatusLabel(order.payment_status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Address, logistics, partners, actions */}
        <div className="space-y-4 sm:space-y-6">
          {/* Logistics & Address Info */}
          <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-lg space-y-4">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={12} /> Alamat Pengiriman
              </h4>
              <p className="text-xs sm:text-sm font-bold leading-relaxed text-foreground/80 break-words">
                {order.shipping_address || 'Tidak ada alamat ditentukan.'}
              </p>
            </div>
            
            <hr className="border-border/30" />

            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Truck size={12} /> Informasi Pengiriman
              </h4>
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-muted-foreground">Metode</span>
                <span className="text-foreground">Pengiriman Standar B2B</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-muted-foreground">Biaya</span>
                <span className="text-foreground font-mono">Rp {(order.shipping_cost || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            <hr className="border-border/30" />

            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard size={12} /> Metode Pembayaran
              </h4>
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-muted-foreground">Pembayaran</span>
                <span className="text-foreground">{getPaymentMethodLabel(order.payment_method)}</span>
              </div>
              
              {order.escrow_status && (
                <div className="flex justify-between items-center text-xs sm:text-sm font-bold pt-1">
                  <span className="text-muted-foreground">Status Escrow</span>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border",
                    order.escrow_status === 'released' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    order.escrow_status === 'held' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    order.escrow_status === 'refunded' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-muted text-muted-foreground border-border'
                  )}>
                    {
                      order.escrow_status === 'released' ? 'Dilepas' :
                      order.escrow_status === 'held' ? 'Ditahan' :
                      order.escrow_status === 'refunded' ? 'Refunded' :
                      'Tidak Ada'
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Financial Details (Distributor & Admin only) */}
            {(user?.role === 'DISTRIBUTOR' || user?.role === 'ADMIN') && order.platform_fee_rate !== undefined && (
              <>
                <hr className="border-border/30" />
                <div className="space-y-1.5 text-xs sm:text-sm font-bold text-muted-foreground">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <TrendingUp size={12} /> Rincian Keuangan
                  </h4>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-foreground font-mono">Rp {(order.subtotal || order.total_amount - (order.shipping_cost || 0)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fee Platform ({order.platform_fee_rate}%)</span>
                    <span className="text-foreground font-mono">Rp {(order.platform_fee_amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-dashed border-border/40 text-foreground">
                    <span>Pendapatan Bersih</span>
                    <span className="text-primary font-black font-mono">Rp {(order.distributor_net_amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Partner Details */}
          <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-lg space-y-4">
            <h3 className="font-black text-xs text-muted-foreground uppercase tracking-widest">Detail Kemitraan</h3>
            
            <div className="space-y-3">
              {/* UMKM Info */}
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Pembeli (UMKM)</p>
                  <p className="font-black text-xs sm:text-sm truncate leading-tight text-foreground">{order.buyer_name || order.buyer_profile?.organization_name || 'Pembeli UMKM'}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">{order.buyer_email || order.buyer_profile?.email || '-'}</p>
                </div>
              </div>

              {/* Distributor Info */}
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                  <Building2 size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Penjual (Distributor)</p>
                  <p className="font-black text-xs sm:text-sm truncate leading-tight text-foreground">{order.distributor_name || 'Mitra Penjual'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role-based action controls */}
          {(user?.role === 'UMKM' || user?.role === 'ADMIN') && (order.payment_status === 'pending' || order.payment_status === 'unpaid') && (
            <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl shadow-md space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-orange-500 tracking-widest flex items-center gap-1.5">
                  <CreditCard size={14} /> Konfirmasi Pembayaran
                </h4>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Konfirmasi pembayaran transfer manual untuk pesanan ini.
                </p>
              </div>
              <Button
                onClick={handleConfirmPayment}
                disabled={isConfirmingPayment}
                className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/10 flex items-center justify-center cursor-pointer"
              >
                {isConfirmingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Konfirmasi Pembayaran'
                )}
              </Button>
            </div>
          )}

          {isDistributor && nextStatus ? (
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl shadow-md space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Konsol Tindakan
                </h4>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Perbarui status pemenuhan pesanan ini ke tahap berikutnya.
                </p>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating}
                className="w-full h-10 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  getActionLabel(order.status)
                )}
              </Button>
            </div>
          ) : null}

          {/* Dispute Status Card */}
          {dispute && (
            <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl shadow-md space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-rose-500 tracking-widest flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Komplain & Sengketa
                </h4>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Ada pengajuan komplain aktif untuk pesanan ini.
                </p>
              </div>
              <div className="p-3 bg-card border border-border/50 rounded-xl space-y-2 text-xs font-bold text-muted-foreground">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-rose-500 uppercase font-black">{
                    dispute.status === 'submitted' ? 'Diajukan' :
                    dispute.status === 'awaiting_distributor_response' ? 'Menunggu Respon Distributor' :
                    dispute.status === 'under_admin_review' ? 'Ditinjau Admin' :
                    dispute.status === 'approved' ? 'Disetujui' :
                    dispute.status === 'rejected' ? 'Ditolak' :
                    dispute.status === 'resolved' ? 'Selesai' :
                    dispute.status === 'cancelled' ? 'Dibatalkan' : 
                    dispute.status === 'OPEN' ? 'Terbuka' :
                    dispute.status === 'IN_MEDIATION' ? 'Mediasi Admin' :
                    dispute.status === 'RESOLVED' ? 'Selesai' : dispute.status
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipe:</span>
                  <span className="text-foreground">{
                    dispute.type === 'damaged_item' ? 'Barang Rusak' :
                    dispute.type === 'wrong_item' ? 'Barang Tidak Sesuai' :
                    dispute.type === 'missing_quantity' ? 'Jumlah Kurang' :
                    dispute.type === 'not_received' ? 'Barang Tidak Diterima' :
                    dispute.type === 'late_delivery' ? 'Keterlambatan Pengiriman' : 'Lainnya'
                  }</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (user?.role === 'UMKM') {
                    navigate(`/umkm/disputes/${dispute.id}`);
                  } else if (user?.role === 'DISTRIBUTOR') {
                    navigate(`/distributor/disputes/${dispute.id}`);
                  } else {
                    toast.info('Buka Resolusi Konflik di dashboard Admin.');
                  }
                }}
                className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/10 flex items-center justify-center cursor-pointer"
              >
                Lihat Detail Komplain
              </Button>
            </div>
          )}

          {/* UMKM Complaint Creation Option */}
          {user?.role === 'UMKM' && order.buyer_id === user?.id && ['shipped', 'delivered'].includes(order.status) && !dispute && (
            <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-lg space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-rose-500 tracking-widest flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Ajukan Komplain
                </h4>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Jika ada kendala dengan barang atau pengiriman, Anda dapat mengajukan komplain untuk pengembalian dana atau penggantian barang.
                </p>
              </div>
              <Button
                onClick={() => setIsDisputeModalOpen(true)}
                className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/10 flex items-center justify-center cursor-pointer"
              >
                Ajukan Komplain
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Form Modal */}
      <AnimatePresence>
        {isDisputeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-[2rem] w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-border/30">
                <div className="flex items-center gap-2 text-rose-500">
                  <ShieldAlert size={24} />
                  <h3 className="text-xl font-black tracking-tight">Form Pengajuan Komplain</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDisputeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Jenis Masalah / Tipe Komplain <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={disputeType}
                    onChange={(e) => setDisputeType(e.target.value)}
                    className="w-full h-11 bg-card border border-border rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                  >
                    <option value="">-- Pilih Tipe Komplain --</option>
                    <option value="damaged_item">Barang rusak</option>
                    <option value="wrong_item">Barang tidak sesuai</option>
                    <option value="missing_quantity">Jumlah kurang</option>
                    <option value="not_received">Barang tidak diterima</option>
                    <option value="late_delivery">Keterlambatan pengiriman</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Subjek / Judul Komplain <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Barang Rusak saat Pengiriman"
                    value={disputeTitle}
                    onChange={(e) => setDisputeTitle(e.target.value)}
                    className="w-full h-11 bg-card border border-border rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Deskripsi / Kronologi Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Jelaskan secara rinci kendala yang Anda alami dengan produk atau pengiriman ini..."
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-4 text-xs font-bold outline-none focus:border-primary/40 transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Resolusi yang Diajukan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={disputeResolution}
                    onChange={(e) => setDisputeResolution(e.target.value)}
                    className="w-full h-11 bg-card border border-border rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                  >
                    <option value="">-- Pilih Solusi --</option>
                    <option value="full_refund">Refund penuh (Pengembalian dana 100%)</option>
                    <option value="partial_refund">Refund sebagian</option>
                    <option value="replacement">Penggantian barang</option>
                    <option value="discussion">Diskusi dengan distributor</option>
                  </select>
                </div>

                {(disputeResolution === 'full_refund' || disputeResolution === 'partial_refund') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Jumlah Refund yang Diminta (IDR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={`Maksimal Rp ${order.total_amount.toLocaleString()}`}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full h-11 bg-card border border-border rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Total Pembayaran: Rp {order.total_amount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    <span>Lampiran Bukti (URL Foto/Video)</span>
                    <button
                      type="button"
                      onClick={handleAddEvidenceUrl}
                      className="text-primary hover:text-primary-hover flex items-center gap-1 font-bold text-[10px] uppercase"
                    >
                      <Plus size={12} /> Tambah URL
                    </button>
                  </label>
                  
                  <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                    {evidenceUrls.map((url, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={url}
                          onChange={(e) => handleEvidenceUrlChange(idx, e.target.value)}
                          className="flex-1 h-9 bg-card border border-border rounded-lg px-3 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                        />
                        {evidenceUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidenceUrl(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Catatan Tambahan Pembeli (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan untuk distributor/admin..."
                    value={buyerNotes}
                    onChange={(e) => setBuyerNotes(e.target.value)}
                    className="w-full h-11 bg-card border border-border rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-border/30">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDisputeModalOpen(false)}
                    disabled={isSubmittingDispute}
                    className="flex-1 h-11 rounded-xl border-border font-bold text-xs uppercase tracking-wider"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingDispute}
                    className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex gap-2 items-center justify-center shadow-lg shadow-rose-500/10 cursor-pointer"
                  >
                    {isSubmittingDispute ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Memproses...
                      </>
                    ) : (
                      'Kirim Komplain'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Review Modal */}
        {isReviewModalOpen && selectedReviewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
            >
              <form onSubmit={handleReviewSubmit} className="flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-border/30 flex justify-between items-center bg-card">
                  <div className="flex items-center gap-2 text-primary">
                    <ShoppingBag size={20} />
                    <h3 className="text-base font-black tracking-tight">Tulis Ulasan Produk</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="p-2 bg-muted/40 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Nama Produk</span>
                    <h4 className="font-black text-sm text-foreground">{selectedReviewProduct.name}</h4>
                  </div>

                  {/* Star Rating Selection */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Rating Ulasan <span className="text-rose-500">*</span></span>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-amber-400 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={star <= reviewRating ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-8 h-8"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      ))}
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80 ml-2">
                        {reviewRating === 5 ? 'Sangat Baik' :
                         reviewRating === 4 ? 'Baik' :
                         reviewRating === 3 ? 'Cukup' :
                         reviewRating === 2 ? 'Buruk' : 'Sangat Buruk'}
                      </span>
                    </div>
                  </div>

                  {/* Comment text area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Detail Ulasan <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={4}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Berikan ulasan jujur mengenai kualitas produk, kemasan, atau pelayanan distributor..."
                      className="w-full bg-muted/20 border border-border/60 rounded-xl p-4 text-xs font-medium outline-none focus:border-primary/50 focus:bg-card transition-all resize-none text-foreground font-sans leading-relaxed"
                    />
                    <p className="text-[9px] text-muted-foreground font-semibold">Tulis ulasan minimal 10 karakter.</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border/30 bg-muted/10 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsReviewModalOpen(false)}
                    disabled={isSubmittingReview}
                    className="h-10 flex-1 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="h-10 flex-1 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center cursor-pointer"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Ulasan'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
