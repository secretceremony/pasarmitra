import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../../store/useCartStore';

const STEPS = ['Shipping', 'Payment', 'Review', 'Success'];

export const CheckoutWizard = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();

  const handleNext = () => {
    if (step === 2) {
      // Simulate order processing
      setTimeout(() => {
        setStep(3);
        clearCart();
      }, 1500);
    } else {
      setStep(step + 1);
    }
  };

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
                         <h2 className="text-5xl font-black tracking-tighter">Order Success!</h2>
                         <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-md mx-auto">
                            Your procurement request <span className="text-foreground font-black">#ORD-42177</span> has been logged. Distributors are processing fulfillment.
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
                  disabled={items.length === 0}
                  className="w-full h-16 rounded-2xl bg-[#06110B] text-primary font-black text-xl shadow-2xl shadow-primary/20 border border-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                   {step === 2 ? 'Place Order' : 'Continue'}
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
