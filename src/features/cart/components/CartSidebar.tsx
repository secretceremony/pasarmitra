import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCartStore } from '../../../store/useCartStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const CartSidebar = ({ onClose }: { onClose: () => void }) => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCartStore();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-3xl">
      <div className="p-10 flex items-center justify-between border-b border-border/50">
         <div className="space-y-1">
            <h3 className="font-black text-2xl tracking-tighter">Procurement Cart</h3>
            <p className="text-xs font-black text-primary uppercase tracking-widest">{totalItems()} items selected</p>
         </div>
         <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 hover:bg-white/5" onClick={onClose}>
            <X size={24} />
         </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-20">
                <ShoppingBag size={48} />
             </div>
             <p className="font-black text-muted-foreground italic">Your procurement list is empty.</p>
             <Button variant="outline" className="rounded-2xl border-primary text-primary font-black uppercase" onClick={onClose}>
                Browse Inventory
             </Button>
          </div>
        ) : (
          items.map((item) => (
            <motion.div 
              layout
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-6 group"
            >
               <div className="w-24 h-24 rounded-[1.5rem] bg-muted overflow-hidden shrink-0 shadow-lg border border-border/50 relative">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               </div>
               <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                     <h4 className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors italic">{item.name}</h4>
                     <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-rose-500 transition-colors p-1">
                        <Trash2 size={16} />
                     </button>
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MIN. {item.unit_type}</p>
                  <div className="flex justify-between items-center gap-4 pt-2">
                     <div className="flex items-center gap-3 bg-muted/40 p-1 rounded-xl border border-border/30">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all"
                        >
                           <Minus size={14} />
                        </button>
                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => {
                            const success = updateQuantity(item.id, item.quantity + 1);
                            if (!success) {
                              toast.error("Jumlah melebihi stok tersedia.");
                            }
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-primary"
                        >
                           <Plus size={14} />
                        </button>
                     </div>
                     <span className="font-black text-lg italic">Rp {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
               </div>
            </motion.div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="p-10 bg-background/40 backdrop-blur-3xl border-t border-border/50 space-y-8">
           <div className="space-y-4">
              <div className="flex justify-between items-center text-muted-foreground font-bold">
                 <span className="text-xs uppercase tracking-widest">Estimated Tax</span>
                 <span className="text-foreground italic">Rp 0 (B2B Exempt)</span>
              </div>
              <div className="flex justify-between items-end border-t border-border/30 pt-4">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Total Procurement Value</p>
                    <p className="text-4xl font-black text-foreground tracking-tighter italic">Rp {totalPrice().toLocaleString()}</p>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <Button 
                onClick={() => { navigate('/checkout'); onClose(); }}
                className="w-full h-16 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-xl flex items-center justify-between px-10 shadow-2xl shadow-primary/30 group hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                 Checkout Order
                 <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center justify-center gap-2 text-primary">
                 <ShieldCheck size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Secure Industrial Payment Active</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
