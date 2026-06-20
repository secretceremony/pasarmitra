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
import { orderService } from '../../orders/services/orderService';
import { createAuditLog } from '../../admin/services/adminService';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { negotiationService } from '../../partners/services/negotiationService';

const STEPS = ['Shipping', 'Payment', 'Review', 'Success'];

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
        if (negData.status === 'converted_to_order') {
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
    ? (negotiation && negotiation.status !== 'converted_to_order'
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
          'Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310',
          'Credit Term (30 Days)'
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
      const ordersToCreate = Object.entries(grouped).map(([distId, distItems]) => {
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

        const orderData = {
          buyer_id: user.id,
          buyer_name: user.full_name || '',
          buyer_email: user.email || '',
          distributor_id: distId,
          distributor_name: distributorName,
          items: orderItems,
          subtotal: orderSubtotal,
          total_amount: orderSubtotal,
          shipping_address: 'Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310', // Default address from Step 0
          payment_status: 'unpaid' as const,
          status: 'pending' as const,
          payment_method: 'Credit Term (30 Days)', // Default payment from Step 1
          shipping_cost: 0,
          service_fee: 0,
          platform_fee: 0
        };

        return {
          order_code: orderCode,
          data: orderData
        };
      });

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
    if (step === 2) {
      handlePlaceOrder();
    } else {
      setStep(step + 1);
    }
  };

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
          <Button onClick={() => navigate('/negotiations')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black">
            Kembali ke Negosiasi
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-8 rounded-2xl border-border">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  if (negotiationId && negotiation?.status === 'converted_to_order') {
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
          <Button onClick={() => navigate('/orders')} className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black">
            Lihat Daftar Pesanan
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-8 rounded-2xl border-border">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Checkout Header */}
      <div className="flex items-center justify-between py-10 border-b border-border/50">
         <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">Procurement Checkout</h1>
            <p className="text-muted-foreground font-medium">Finalize your wholesale order and schedule delivery.</p>
         </div>
         <div className="flex gap-4">
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
                   <div className="grid gap-6">
                      <div className="p-8 border-2 border-primary bg-primary/5 rounded-[2.5rem] relative group cursor-pointer shadow-xl">
                         <div className="absolute top-6 right-6 text-primary">
                            <CheckCircle2 size={24} />
                         </div>
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
                               <MapPin size={24} />
                            </div>
                            <h4 className="font-black text-lg">Main Warehouse (Default)</h4>
                         </div>
                         <p className="text-muted-foreground font-medium">
                            Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310 <br />
                            <span className="text-foreground font-bold italic">Attn: Budi Santoso (+62 812 9021 8821)</span>
                         </p>
                      </div>

                      <div className="p-8 border border-border border-dashed rounded-[2.5rem] flex items-center justify-center group hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                         <div className="flex flex-col items-center gap-4 py-4 text-muted-foreground group-hover:text-primary">
                            <Plus size={32} />
                            <span className="font-black text-sm uppercase tracking-widest">Add New Address</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6 pt-6">
                      <h3 className="text-xl font-black tracking-tight">Logistics Provider</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                         {[
                           { name: 'PasarMitra Express', time: 'Today, 2-4 PM', price: 'FREE', icon: Truck },
                           { name: 'Same Day Freight', time: 'Within 4h', price: 'Rp 25.000', icon: Clock }
                         ].map((ship, i) => (
                           <div key={i} className={cn(
                             "p-6 rounded-3xl border transition-all cursor-pointer flex items-center gap-4",
                             i === 0 ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/20"
                           )}>
                              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                 <ship.icon size={24} />
                              </div>
                              <div className="flex-1">
                                 <p className="font-black text-sm">{ship.name}</p>
                                 <p className="text-xs font-medium text-muted-foreground">{ship.time}</p>
                              </div>
                              <span className="font-black text-sm text-primary">{ship.price}</span>
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
                   <h2 className="text-2xl font-black tracking-tight">Payment Method</h2>
                   <div className="grid gap-6">
                      {[
                        { name: 'Credit Term (30 Days)', fee: 'Verified Account Only', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                        { name: 'Bank Transfer (BCA/Mandiri)', fee: 'No fee', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                        { name: 'Balance / Wallet', fee: 'Instant', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' }
                      ].map((pay, i) => (
                        <div key={i} className={cn(
                          "p-8 border-2 rounded-[2.5rem] flex items-center justify-between transition-all cursor-pointer",
                          i === 0 ? "border-primary bg-primary/5 shadow-xl" : "border-border bg-card"
                        )}>
                           <div className="flex items-center gap-6">
                              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black", i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                 <CreditCard size={28} />
                              </div>
                              <div>
                                 <p className="font-black text-lg">{pay.name}</p>
                                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{pay.fee}</p>
                              </div>
                           </div>
                           {i === 0 && <CheckCircle2 className="text-primary" size={24} />}
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
                   <h2 className="text-2xl font-black tracking-tight">Order Final Review</h2>
                   <div className="p-8 bg-card border border-border/50 rounded-[3rem] shadow-xl space-y-8">
                      <div className="flex items-center justify-between border-b border-border/50 pb-6">
                         <div className="flex items-center gap-4 text-emerald-500">
                            <ShieldCheck size={24} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procurement Guarantee Active</span>
                         </div>
                         <Button variant="ghost" onClick={() => setStep(0)} className="text-xs font-black text-primary">EDIT SHIPPING</Button>
                      </div>
                      <div className="space-y-6">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Delivery Address</p>
                               <p className="font-bold">Jl. Menteng Raya No. 42 (Main Warehouse)</p>
                            </div>
                            <div className="text-right space-y-1">
                               <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Payment</p>
                               <p className="font-bold">Credit Term (30d)</p>
                            </div>
                         </div>
                         <div className="pt-6 border-t border-border/30">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Items Summary</p>
                            <div className="space-y-3">
                               {items.map((item) => (
                                 <div key={item.id} className="flex justify-between text-sm">
                                    <span className="font-medium">{item.name} <span className="text-primary font-black">x{item.quantity}</span></span>
                                    <span className="font-black font-mono">Rp {(item.price * item.quantity).toLocaleString()}</span>
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
                             Your procurement request <span className="text-foreground font-black">#{createdOrderCodes.join(', ')}</span> has been logged. Distributors are processing fulfillment.
                          </p>
                       </div>
                      <div className="flex gap-4 justify-center">
                         <Button onClick={() => navigate('/orders')} className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/30">
                            Track Order
                         </Button>
                         <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 px-10 rounded-2xl border-border bg-background/50 backdrop-blur-xl font-black text-lg">
                            Go Home
                         </Button>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Sidebar Order Summary */}
        <div className="space-y-8">
           <div className="p-10 bg-card border border-border/50 rounded-[3rem] shadow-2xl space-y-10 sticky top-10">
              <h3 className="text-2xl font-black tracking-tight">Order Summary</h3>
              <div className="space-y-6">
                 {items.length > 0 ? items.map((item) => (
                   <div key={item.id} className="flex gap-4 group">
                      <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                         <img src={item.image_url || `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-black truncate leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                         <p className="text-xs text-muted-foreground font-medium">{item.quantity} {item.unit_type}</p>
                      </div>
                      <p className="text-sm font-black italic">Rp {(item.price * item.quantity).toLocaleString()}</p>
                   </div>
                 )) : (
                   <p className="text-muted-foreground italic font-medium">Cart is empty...</p>
                 )}
              </div>

              <div className="pt-8 border-t border-border/50 space-y-4">
                 <div className="flex justify-between text-sm font-bold text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-black text-foreground">Rp {totalPrice().toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-sm font-bold text-muted-foreground">
                    <span>Shipping Fee</span>
                    <span className="text-primary font-black uppercase">FREE</span>
                 </div>
                 <div className="pt-4 flex justify-between items-end border-t border-border/30">
                    <div className="space-y-1">
                       <p className="text-xs font-black text-primary uppercase tracking-widest">Total Payment</p>
                       <p className="text-3xl font-black tracking-tighter">Rp {totalPrice().toLocaleString()}</p>
                    </div>
                 </div>
              </div>

               {step < 3 && (
                 <Button 
                   onClick={handleNext}
                   disabled={items.length === 0 || isSubmitting}
                   className="w-full h-16 rounded-2xl bg-[#06110B] text-primary font-black text-xl shadow-2xl shadow-primary/20 border border-primary/20 hover:scale-105 active:scale-95 transition-all"
                 >
                    {isSubmitting ? 'Memproses...' : step === 2 ? 'Place Order' : 'Continue'}
                    <ChevronRight size={24} className="ml-2" />
                 </Button>
               )}
           </div>

           <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] flex items-center gap-6">
              <ShieldCheck className="text-primary shrink-0" size={32} />
              <div>
                 <p className="text-xs font-black text-primary uppercase mb-1">PasarMitra Secure</p>
                 <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Financial data is encrypted and funds are held in escrow until goods are delivered and verified.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
