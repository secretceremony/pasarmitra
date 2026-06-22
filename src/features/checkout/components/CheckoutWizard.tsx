import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore, CartItem } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/use-auth-store';
import { orderService, calculatePlatformFeeRate } from '../../orders/services/orderService';
import { createAuditLog } from '../../admin/services/adminService';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { negotiationService } from '../../partners/services/negotiationService';

const STEPS = ['Pengiriman', 'Pembayaran', 'Tinjauan', 'Berhasil'];

const generateOrderCode = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `ORD-${dateStr}-${randNum}`;
};

export const CheckoutWizard = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderCodes, setCreatedOrderCodes] = useState<string[]>([]);
  
  // Selection state variables to preserve choices when navigating steps
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [selectedShipping, setSelectedShipping] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(-1);
  
  const [searchParams] = useSearchParams();
  const negotiationId = searchParams.get('negotiationId');
  const [negotiation, setNegotiation] = useState<any | null>(null);
  const [isLoadingNeg, setIsLoadingNeg] = useState(false);
  const [negError, setNegError] = useState<string | null>(null);

  useEffect(() => {
    if (!negotiationId || !user) return;
    
    const fetchNegotiation = async () => {
      try {
        setIsLoadingNeg(true);
        setNegError(null);
        
        // 1. Fetch negotiation document
        const negRef = doc(db, 'negotiations', negotiationId);
        const negSnap = await getDoc(negRef);
        if (!negSnap.exists()) {
          setNegError('Data negosiasi tidak ditemukan.');
          return;
        }
        
        const negData = { id: negSnap.id, ...negSnap.data() } as any;
        
        // 2. Strict participant-based access control
        if (negData.umkm_id !== user.id) {
          setNegError('Akses ditolak. Anda tidak berwenang melakukan checkout untuk negosiasi ini.');
          return;
        }
        
        // 3. Status checks
        if (negData.status === 'converted_to_order' || negData.status === 'checked_out') {
          setNegotiation(negData);
          return;
        }
        
        if (negData.status !== 'accepted') {
          setNegError('Hanya negosiasi berstatus disetujui (accepted) yang dapat dilanjutkan ke checkout.');
          return;
        }
        
        // 4. Revalidate: product stock, MOQ, active status
        const productRef = doc(db, 'products', negData.product_id);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          setNegError('Produk negosiasi tidak ditemukan.');
          return;
        }
        const product = productSnap.data();
        if (!product.is_active) {
          setNegError('Produk negosiasi sedang tidak aktif.');
          return;
        }
        if (negData.quantity > (product.stock || 0)) {
          setNegError(`Stok produk tidak mencukupi. Tersedia: ${product.stock || 0}, Diminta: ${negData.quantity}`);
          return;
        }
        if (negData.quantity < (product.min_order_quantity || 1)) {
          setNegError(`Jumlah pesanan minimal adalah ${product.min_order_quantity || 1}. Jumlah negosiasi: ${negData.quantity}`);
          return;
        }
        
        // 5. Revalidate distributor status
        const distRef = doc(db, 'profiles', negData.distributor_id);
        const distSnap = await getDoc(distRef);
        if (!distSnap.exists()) {
          setNegError('Distributor tidak ditemukan.');
          return;
        }
        const distributor = distSnap.data();
        if (distributor.is_suspended) {
          setNegError('Akun distributor sedang ditangguhkan.');
          return;
        }
        
        setNegotiation({ ...negData, productUnit: product.unit_type || 'Unit' });
      } catch (err) {
        console.error('Error fetching negotiation for checkout:', err);
        setNegError('Gagal memuat data negosiasi.');
      } finally {
        setIsLoadingNeg(false);
      }
    };
    
    fetchNegotiation();
  }, [negotiationId, user]);

  const items: CartItem[] = negotiationId
    ? (negotiation && negotiation.status !== 'converted_to_order' && negotiation.status !== 'checked_out'
        ? [
            {
              id: negotiation.product_id,
              name: negotiation.product_name,
              quantity: negotiation.quantity,
              price: negotiation.agreed_unit_price || negotiation.requested_unit_price,
              unit_type: negotiation.productUnit || 'Unit',
              image_url: negotiation.product_image || undefined,
              distributor_id: negotiation.distributor_id,
              distributor_name: negotiation.distributor_name || undefined,
            },
          ]
        : [])
    : cartItems;

  const totalPrice = () => {
    if (negotiationId) {
      if (!negotiation) return 0;
      return (negotiation.agreed_unit_price || negotiation.requested_unit_price) * negotiation.quantity;
    }
    return cartTotalPrice();
  };

  const getShippingCost = () => {
    return selectedShipping === 1 ? 25000 : 0;
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Anda harus login untuk melakukan checkout.");
      return;
    }

    if (items.length === 0 && !negotiationId) {
      toast.error("Keranjang belanja Anda kosong.");
      return;
    }

    setIsSubmitting(true);

    const activeAddress = selectedAddress === 0 
      ? (user?.address || user?.business_address || 'Jl. Jenderal Sudirman No. 88, Balikpapan Kota, Balikpapan 76112') 
      : 'Alamat Kustom/Tambahan';
      
    const activePaymentMethod = selectedPayment === 0 
      ? 'Bank Transfer (BCA/Mandiri)' 
      : selectedPayment === 1 
        ? 'QRIS' 
        : selectedPayment === 2
          ? 'COD / Bayar di Tempat'
          : 'Bank Transfer (BCA/Mandiri)';

    if (negotiationId) {
      if (!negotiation) {
        toast.error("Data negosiasi belum siap.");
        setIsSubmitting(false);
        return;
      }
      try {
        const result = await negotiationService.checkoutNegotiation(
          negotiation.id,
          user.id,
          user.full_name || user.email || '',
          user.email || '',
          activeAddress,
          activePaymentMethod
        );
        setCreatedOrderCodes([result.order_code]);
        toast.success("Pesanan dari negosiasi berhasil dibuat.");
        setStep(3);
      } catch (err: any) {
        console.error('Failed to checkout negotiation:', err);
        toast.error(err.message || "Gagal membuat pesanan dari negosiasi.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      // 1. Group items by distributor_id
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        const distId = item.distributor_id;
        if (!grouped[distId]) {
          grouped[distId] = [];
        }
        grouped[distId].push(item);
      }

      // Prepare orders array for batch creation
      const ordersToCreate = await Promise.all(Object.entries(grouped).map(async ([distId, distItems]) => {
        const orderCode = generateOrderCode();
        const orderSubtotal = distItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const distributorName = distItems[0].distributor_name || 'Distributor';
 
        // Prepare order items
        const orderItems = distItems.map((item) => ({
          id: `item-${Math.random().toString(36).substring(7)}`,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price_per_unit: item.price,
          total_price: item.price * item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          unit: item.unit_type || 'Unit',
          image_url: item.image_url || ''
        }));
 
        const platformFeeRate = await calculatePlatformFeeRate(distId);
        const platformFeeAmount = Math.round((orderSubtotal * platformFeeRate) / 100);
        const distributorNetAmount = orderSubtotal - platformFeeAmount;
 
        const mappedPaymentMethod = selectedPayment === 0 
          ? 'bank_transfer' 
          : selectedPayment === 1 
            ? 'qris' 
            : selectedPayment === 2
              ? 'cod'
              : 'manual';
 
        const orderData = {
          buyer_id: user.id,
          buyer_name: user.full_name || '',
          buyer_email: user.email || '',
          distributor_id: distId,
          distributor_name: distributorName,
          items: orderItems,
          subtotal: orderSubtotal,
          total_amount: orderSubtotal + getShippingCost(),
          shipping_address: activeAddress,
          payment_status: 'pending' as const,
          escrow_status: 'none' as const,
          status: 'pending' as const,
          payment_method: mappedPaymentMethod,
          shipping_cost: getShippingCost(),
          platform_fee_rate: platformFeeRate,
          platform_fee_amount: platformFeeAmount,
          distributor_net_amount: distributorNetAmount
        };
 
        return {
          order_code: orderCode,
          data: orderData
        };
      }));

      // 2. Perform atomic batch write
      const createdOrders = await orderService.createOrdersBatch(ordersToCreate);
      const generatedCodes = ordersToCreate.map(o => o.order_code);

      // 3. Write Audit Logs (wrapped in try-catch to not block checkout on failure)
      for (const order of createdOrders) {
        try {
          await createAuditLog({
            event: 'ORDER_CREATED',
            status: 'SUCCESS',
            user: user.email,
            details: `Order created: ${order.order_code}, distributor: ${order.distributor_name}, amount: Rp ${order.total_amount.toLocaleString()}`,
            targetCollection: 'orders',
            targetId: order.id
          });
        } catch (auditErr) {
          console.error("Error writing audit log:", auditErr);
        }
      }

      // Success sequence
      setCreatedOrderCodes(generatedCodes);
      toast.success("Pesanan berhasil dibuat.");
      clearCart();
      setStep(3);
    } catch (err: any) {
      console.error('Failed to place order:', err);
      toast.error("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedPayment === -1) {
      toast.error("Pilih metode pembayaran terlebih dahulu.");
      return;
    }
    if (step === 2) {
      handlePlaceOrder();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 3) {
      setStep(step - 1);
    } else {
      // Safe fallback to marketplace listing to prevent routing to unexpected/unauthorized role pages
      navigate('/marketplace');
    }
  };

  if (user && user.role === 'UMKM' && !user.is_verified) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 bg-card border border-border/50 rounded-[4rem] shadow-3xl p-10">
        <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
          <X size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight text-rose-500">Checkout Ditangguhkan</h2>
          <p className="text-muted-foreground font-semibold">
            Akun UMKM Anda belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu sebelum melakukan pembelian.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/umkm/profile')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black cursor-pointer shadow-xl shadow-primary/20">
            Ajukan Verifikasi
          </Button>
          <Button variant="outline" onClick={() => navigate('/umkm/cart')} className="h-14 px-8 rounded-2xl border-border cursor-pointer">
            Kembali ke Keranjang
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingNeg) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black text-xs uppercase tracking-widest">Validasi Data Negosiasi...</p>
      </div>
    );
  }

  if (negError) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 bg-card border border-border/50 rounded-[4rem] shadow-3xl p-10">
        <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <X size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight text-rose-500">Gagal Memproses Checkout</h2>
          <p className="text-muted-foreground font-medium">{negError}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/umkm/negosiasi-harga')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black cursor-pointer">
            Kembali ke Negosiasi
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-8 rounded-2xl border-border cursor-pointer">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  if (negotiationId && (negotiation?.status === 'converted_to_order' || negotiation?.status === 'checked_out')) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 bg-card border border-border/50 rounded-[4rem] shadow-3xl p-10">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight">Checkout Selesai</h2>
          <p className="text-muted-foreground font-medium">
            Negosiasi ini telah berhasil dikonversi menjadi pesanan sebelumnya. Anda tidak dapat melakukan checkout ulang.
          </p>
          {negotiation.converted_order_id && (
            <div className="p-4 bg-muted/40 rounded-2xl font-bold text-sm">
              ID Pesanan: <span className="text-primary font-mono">{negotiation.converted_order_id}</span>
            </div>
          )}
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/orders')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black cursor-pointer">
            Lihat Daftar Pesanan
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-8 rounded-2xl border-border cursor-pointer">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-0 w-full max-w-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/umkm/cart')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Keranjang
        </button>
        <span>/</span>
        <span className="text-foreground">Checkout</span>
      </div>
      {/* Explicit Back button in UI */}
      {step < 3 && (
        <Button
          variant="ghost"
          onClick={handleBack}
          className="h-10 px-4 rounded-xl text-xs font-bold border border-border/40 hover:bg-muted cursor-pointer flex items-center w-fit gap-2 transition-all"
        >
          <ArrowLeft size={16} />
          {step === 0 ? 'Kembali' : 'Kembali ke Langkah Sebelumnya'}
        </Button>
      )}

      {/* Checkout Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-border/50 gap-4">
         <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">Checkout Pembelian</h1>
            <p className="text-muted-foreground font-medium">Selesaikan pesanan grosir Anda dan atur pengiriman.</p>
         </div>
         <div className="flex gap-4 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-4">
                 <div className={cn(
                   "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all",
                   step === i ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : 
                   step > i ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                 )}>
                    {step > i ? <CheckCircle2 size={20} /> : i + 1}
                 </div>
                 <span className={cn("text-xs font-black uppercase tracking-widest hidden md:block", step === i ? "text-primary" : "text-muted-foreground")}>
                    {s}
                 </span>
                 {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-border mx-2 hidden md:block" />}
              </div>
            ))}
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
           <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div 
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                   <h2 className="text-2xl font-black tracking-tight">Shipping Destination</h2>
                   <div className="grid gap-4 sm:gap-6">
                      <div 
                        onClick={() => setSelectedAddress(0)}
                        className={cn(
                          "p-5 sm:p-8 border-2 rounded-2xl sm:rounded-[2.5rem] relative group cursor-pointer shadow-xl transition-all duration-300",
                          selectedAddress === 0 ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"
                        )}
                      >
                         {selectedAddress === 0 && (
                           <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-primary">
                              <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                           </div>
                         )}
                         <div className="flex items-center gap-3 sm:gap-4 mb-4">
                            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300", selectedAddress === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                               <MapPin size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <h4 className="font-black text-base sm:text-lg">Main Warehouse (Default)</h4>
                         </div>
                         <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                            {user?.address || user?.business_address || 'Jl. Jenderal Sudirman No. 88, Balikpapan Kota, Balikpapan 76112'} <br className="hidden sm:block" />
                            <span className="text-foreground font-bold italic mt-1 block">Attn: {user?.full_name || 'Mitra UMKM'} ({user?.phone || '+62 812 3456 7890'})</span>
                         </p>
                      </div>

                      <div className="p-5 sm:p-8 border border-border border-dashed rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center group hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer opacity-60">
                         <div className="flex flex-col items-center gap-3 sm:gap-4 py-2 sm:py-4 text-muted-foreground group-hover:text-primary">
                            <Plus size={24} className="sm:w-8 sm:h-8" />
                            <span className="font-black text-xs sm:text-sm uppercase tracking-widest">Add New Address</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6 pt-6">
                      <h3 className="text-xl font-black tracking-tight">Logistics Provider</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {[
                           { name: 'PasarMitra Express', time: 'Today, 2-4 PM', price: 'FREE', icon: Truck },
                           { name: 'Same Day Freight', time: 'Within 4h', price: 'Rp 25.000', icon: Clock }
                         ].map((ship, i) => (
                           <div 
                             key={i} 
                             onClick={() => setSelectedShipping(i)}
                             className={cn(
                               "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex items-center gap-3 sm:gap-4 duration-300",
                               selectedShipping === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/20"
                             )}
                           >
                              <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0", selectedShipping === i ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                 <ship.icon size={20} className="sm:w-6 sm:h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-black text-xs sm:text-sm truncate">{ship.name}</p>
                                 <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{ship.time}</p>
                              </div>
                              <span className="font-black text-xs sm:text-sm text-primary shrink-0">{ship.price}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div 
                   key="payment"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="space-y-8"
                >
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Metode Pembayaran</h2>
                    <div className="grid gap-4 sm:gap-6">
                       {[
                         { name: 'Transfer Bank (BCA/Mandiri)', desc: 'Bayar melalui transfer rekening setelah pesanan dibuat.', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                         { name: 'QRIS', desc: 'Bayar menggunakan QRIS untuk proses lebih cepat.', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
                         { name: 'Bayar di Tempat (COD)', desc: 'Pembayaran dilakukan saat barang diterima. Tersedia sesuai kebijakan distributor.', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
                       ].map((pay, i) => (
                         <div 
                           key={i} 
                           onClick={() => setSelectedPayment(i)}
                           className={cn(
                             "p-4 sm:p-8 border-2 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-between transition-all cursor-pointer duration-300 gap-4",
                             selectedPayment === i ? "border-primary bg-primary/5 shadow-xl" : "border-border bg-card hover:border-primary/20"
                           )}
                         >
                            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                               <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black transition-all duration-300 shrink-0", selectedPayment === i ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                  <CreditCard size={20} className="sm:w-7 sm:h-7" />
                               </div>
                               <div className="min-w-0">
                                  <p className="font-black text-sm sm:text-lg text-foreground">{pay.name}</p>
                                  <p className="text-xs font-bold text-muted-foreground leading-normal whitespace-normal mt-1">{pay.desc}</p>
                               </div>
                            </div>
                            {selectedPayment === i && <CheckCircle2 size={20} className="text-primary shrink-0 sm:w-6 sm:h-6" />}
                         </div>
                       ))}
                    </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                   key="review"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="space-y-8"
                >
                   <h2 className="text-2xl font-black tracking-tight">Tinjauan Akhir Pesanan</h2>
                    <div className="p-4 sm:p-8 bg-card border border-border/50 rounded-2xl sm:rounded-[3rem] shadow-xl space-y-6 sm:space-y-8">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4 sm:pb-6 gap-3">
                          <div className="flex items-center gap-2 sm:gap-4 text-emerald-500">
                             <ShieldCheck size={20} className="sm:w-6 sm:h-6 shrink-0" />
                             <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Jaminan Pembelian Aktif</span>
                          </div>
                          <Button variant="ghost" onClick={() => setStep(0)} className="text-xs font-black text-primary cursor-pointer w-fit p-0 h-auto hover:bg-transparent">UBAH PENGIRIMAN</Button>
                       </div>
                       <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="space-y-1">
                                 <p className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">Alamat Pengiriman</p>
                                 <p className="font-bold text-sm sm:text-base">
                                   {selectedAddress === 0 ? (user?.address || user?.business_address || 'Jl. Jenderal Sudirman No. 88 (Gudang Utama)') : 'Alamat Kustom'}
                                 </p>
                              </div>
                             <div className="text-left sm:text-right space-y-1">
                                <p className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">Metode Pembayaran</p>
                                <p className="font-bold text-sm sm:text-base">
                                  {selectedPayment === 0 ? 'Transfer Bank (BCA/Mandiri)' : selectedPayment === 1 ? 'QRIS' : selectedPayment === 2 ? 'Bayar di Tempat (COD)' : 'Belum dipilih'}
                                </p>
                             </div>
                          </div>
                          <div className="pt-6 border-t border-border/30">
                             <p className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Ringkasan Item</p>
                             <div className="space-y-3">
                                {items.map((item) => (
                                  <div key={item.id} className="flex justify-between text-xs sm:text-sm gap-4">
                                     <span className="font-medium min-w-0 truncate">{item.name} <span className="text-primary font-black shrink-0">x{item.quantity}</span></span>
                                     <span className="font-black font-mono shrink-0">Rp {(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                   key="success"
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex flex-col items-center justify-center text-center space-y-8 py-20 bg-card border border-border/50 rounded-[4rem] shadow-3xl relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />
                   <div className="relative z-10 space-y-8">
                      <div className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 animate-bounce">
                         <CheckCircle2 size={64} />
                      </div>
                       <div className="space-y-3 px-12">
                          <h2 className="text-5xl font-black tracking-tighter">Pesanan Berhasil Dibuat!</h2>
                          <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-md mx-auto">
                             Permintaan pembelian Anda <span className="text-foreground font-black">#{createdOrderCodes.join(', ')}</span> telah dicatat. Distributor sedang memproses pemenuhan pesanan.
                          </p>
                       </div>
                      <div className="flex gap-4 justify-center">
                         <Button onClick={() => navigate('/orders')} className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/30 cursor-pointer">
                            Lacak Pesanan
                         </Button>
                         <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-10 rounded-2xl border-border bg-background/50 backdrop-blur-xl font-black text-lg cursor-pointer">
                            Ke Beranda
                         </Button>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Sidebar Order Summary */}
        <div className="space-y-8">
           <div className="p-5 sm:p-8 md:p-10 bg-card border border-border/50 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] shadow-2xl space-y-6 sm:space-y-8 md:space-y-10 lg:sticky lg:top-10 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">Ringkasan Pesanan</h3>
              <div className="space-y-4 sm:space-y-6">
                  {items.length > 0 ? items.map((item) => (
                     <div key={item.id} className="flex gap-3 sm:gap-4 group items-center">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                           <img 
                              src={item.image_url || '/assets/fallback-product.png'} 
                              className="w-full h-full object-cover" 
                              alt={item.name} 
                              onError={(e) => {
                                 const target = e.currentTarget;
                                 if (target.src !== '/assets/fallback-product.png') {
                                    target.src = '/assets/fallback-product.png';
                                 }
                              }}
                           />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs sm:text-sm font-black truncate leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                           <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{item.quantity} {item.unit_type} • Rp{item.price.toLocaleString('id-ID')}</p>
                        </div>
                        <p className="text-xs sm:text-sm font-black italic shrink-0">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
                     </div>
                  )) : (
                     <p className="text-muted-foreground italic text-sm font-medium">Keranjang kosong...</p>
                  )}
               </div>

               <div className="pt-6 sm:pt-8 border-t border-border/50 space-y-3 sm:space-y-4">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-muted-foreground">
                     <span>Subtotal Produk</span>
                     <span className="font-black text-foreground">Rp{totalPrice().toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-muted-foreground">
                     <span>Biaya Layanan</span>
                     <span className="font-black text-emerald-400">Rp0</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-muted-foreground">
                     <span>Ongkir / Estimasi Pengiriman</span>
                     <span className="font-black text-foreground">
                       Rp{getShippingCost().toLocaleString('id-ID')}
                     </span>
                  </div>
                  <div className="pt-4 flex justify-between items-end border-t border-border/30">
                     <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest">Total Pembayaran</p>
                        <p className="text-2xl sm:text-3xl font-black tracking-tighter">
                          Rp{(totalPrice() + getShippingCost()).toLocaleString('id-ID')}
                        </p>
                     </div>
                  </div>
               </div>

                {step < 3 && (
                  <Button 
                    onClick={handleNext}
                    disabled={items.length === 0 || isSubmitting}
                    className="w-full h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-[#06110B] text-primary font-black text-base sm:text-xl shadow-2xl shadow-primary/20 border border-primary/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                  >
                     {isSubmitting ? (
                       <>
                         <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                         Memproses...
                       </>
                     ) : (
                       <>
                         {step === 2 ? 'Buat Pesanan' : 'Lanjutkan'}
                         <ChevronRight size={20} className="sm:w-6 sm:h-6 ml-2" />
                       </>
                     )}
                  </Button>
                )}
           </div>

           <div className="p-5 sm:p-8 bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6">
              <ShieldCheck className="text-primary shrink-0 w-8 h-8 sm:w-10 sm:h-10" />
              <div>
                 <p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-1">PasarMitra Aman</p>
                 <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-relaxed">
                    Data keuangan dienkripsi dan dana disimpan bersama (escrow) sampai barang dikirim dan diverifikasi.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.4); }
      `}} />
    </div>
  );
};
