import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCartStore } from '../store/useCartStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/use-auth-store';
import { toast } from 'sonner';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCartStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="space-y-10 pb-20 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="hover:text-primary transition-colors cursor-pointer animate-none bg-transparent border-none p-0"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-foreground">Keranjang</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">Keranjang Belanja</h1>
          <p className="max-w-2xl text-base sm:text-lg font-medium text-muted-foreground leading-relaxed">
            Kelola barang procurement Anda sebelum lanjut ke proses checkout.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/marketplace')} 
          className="h-12 px-6 rounded-xl sm:rounded-2xl border-border bg-card font-black hover:bg-muted transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <ChevronLeft size={20} className="mr-2" />
          Belanja Lagi
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Daftar Barang ({totalItems()} Item)
              </span>
            </div>

            <div className="space-y-6">
              {items.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-40">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30 animate-pulse">
                    <ShoppingBag size={40} />
                  </div>
                  <div>
                    <p className="font-black text-lg text-foreground">Keranjang kosong</p>
                    <p className="text-xs text-muted-foreground mt-1">Anda belum menambahkan produk ke keranjang belanja.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 rounded-xl border-primary text-primary font-black uppercase text-xs cursor-pointer" 
                    onClick={() => navigate('/marketplace')}
                  >
                    Cari Produk Sembako
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col sm:flex-row gap-4 sm:gap-6 pb-6 border-b border-border/30 last:border-b-0 last:pb-0 group"
                    >
                      <div className="w-full sm:w-28 h-28 rounded-xl sm:rounded-2xl bg-muted overflow-hidden shrink-0 border border-border shadow-md">
                        {item.image_url ? (
                          <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.name} />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase">
                            Tidak ada gambar
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1 space-y-3 sm:space-y-0">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-black text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h4>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Satuan: {item.unit_type || 'Unit'}</p>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-rose-500 transition-colors p-1.5 bg-muted/40 rounded-lg shrink-0 cursor-pointer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
                          <div className="flex items-center gap-3 bg-muted/40 p-1 rounded-xl border border-border/30">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-foreground cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                const success = updateQuantity(item.id, item.quantity + 1);
                                if (!success) {
                                  toast.error("Jumlah melebihi stok tersedia.");
                                }
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-primary font-black cursor-pointer"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Subtotal</p>
                            <p className="font-black text-lg sm:text-xl">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Procurement Summary (Checkout Panel) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl space-y-6">
            <h3 className="text-lg font-black text-primary uppercase tracking-widest border-b border-white/10 pb-4">
              Ringkasan Belanja
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-white/70 font-bold text-xs uppercase tracking-wider">
                <span>Total Barang</span>
                <span className="text-white font-black">{totalItems()} Unit</span>
              </div>
              <div className="flex justify-between items-center text-white/70 font-bold text-xs uppercase tracking-wider">
                <span>Pajak (PPN B2B)</span>
                <span className="text-emerald-400 font-black">Rp 0 (Exempt)</span>
              </div>
              <div className="flex justify-between items-center text-white/70 font-bold text-xs uppercase tracking-wider">
                <span>Biaya Admin</span>
                <span className="text-emerald-400 font-black">Gratis</span>
              </div>
              
              <hr className="border-white/10" />

              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Total Nilai Pengadaan</p>
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                  Rp {totalPrice().toLocaleString('id-ID')}
                </p>
              </div>
            </div>

             <div className="space-y-4 pt-4">
              {user && user.role === 'UMKM' && !user.is_verified ? (
                <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-left space-y-3">
                  <div className="flex gap-2.5 text-rose-500">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">
                      Akun UMKM Anda belum terverifikasi. Ajukan verifikasi usaha terlebih dahulu sebelum melakukan pembelian.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/umkm/profile')}
                    className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center"
                  >
                    Ajukan Verifikasi
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => navigate('/checkout')}
                  disabled={items.length === 0}
                  className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground font-black text-base sm:text-lg flex items-center justify-between px-6 sm:px-8 shadow-2xl shadow-primary/30 group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Lanjut ke Checkout</span>
                  <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
              
              <div className="flex items-center justify-center gap-2 text-primary">
                <ShieldCheck size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Pembayaran Aman Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
