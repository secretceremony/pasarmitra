import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  MapPin, 
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { orderService, Order } from '../services/orderService';
import { useAuthStore } from '../../../store/use-auth-store';

export const OrderManagement = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const TABS = [
    { key: 'All', label: 'Semua' },
    { key: 'Pending', label: 'Menunggu' },
    { key: 'Processing', label: 'Diproses' },
    { key: 'Shipped', label: 'Dikirim' },
    { key: 'Delivered', label: 'Selesai' }
  ];

  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await orderService.getDistributorOrders(user.id);
      setOrders(data);
    } catch (err) {
      console.error("Gagal memuat pesanan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const handleStatusUpdate = async (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] | null = null;
    if (currentStatus === 'pending') nextStatus = 'processing';
    else if (currentStatus === 'processing') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'delivered';
    
    if (!nextStatus) return;
    try {
      const updated = await orderService.updateOrderStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err) {
      console.error("Gagal memperbarui status pesanan:", err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'All' || order.status.toLowerCase() === activeTab.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(searchLower) ||
      (order.buyer_profile?.organization_name || '').toLowerCase().includes(searchLower) ||
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

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Pesanan Masuk</h1>
          <p className="text-muted-foreground font-medium text-lg">Proses pemenuhan dan lacak pengiriman di seluruh jaringan mitra Anda.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              Proses Massal
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
              <Printer className="mr-2" size={20} />
              Cetak Faktur
           </Button>
        </div>
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
               placeholder="Cari berdasarkan ID Pesanan, Pembeli, atau Alamat..." 
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
         ) : filteredOrders.length === 0 ? (
           <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[2.5rem] font-bold">
             Pesanan tidak ditemukan.
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
                      {order.id.slice(-2).toUpperCase()}
                   </div>
                   <div>
                      <p className="text-2xl font-black tracking-tight">Pesanan #{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                        {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                   </div>
                </div>

                {/* Buyer & Address */}
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-3">
                      <p className="text-xl font-black group-hover:text-primary transition-colors">
                        {order.buyer_profile?.organization_name || 'Mitra UMKM'}
                      </p>
                      <span className="text-xs font-black text-muted-foreground bg-muted/40 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {order.items?.length || 0} Barang
                      </span>
                   </div>
                   <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin size={16} className="text-primary/60" />
                      <p className="text-sm font-bold truncate max-w-sm">{order.shipping_address || 'Alamat tidak ditentukan'}</p>
                   </div>
                </div>

                {/* Amount & Status */}
                <div className="flex items-center justify-between lg:w-1/3 gap-10">
                   <div className="text-right">
                      <p className="text-2xl font-black">Rp {order.total_amount.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
                        {order.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'} • Syarat Kredit
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
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button 
                          onClick={() => handleStatusUpdate(order.id, order.status)}
                          className="h-12 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase"
                        >
                          {order.status === 'pending' ? 'Proses' : order.status === 'processing' ? 'Kirim' : 'Selesaikan'}
                        </Button>
                      )}
                   </div>
                </div>
             </motion.div>
           ))
         )}
      </div>

      {/* Empty State / Pagination Logic Placeholder */}
      <div className="flex justify-center pt-8">
         <Button variant="outline" className="h-14 px-12 rounded-2xl border-border font-black text-muted-foreground hover:text-primary">
            Muat Lebih Banyak Pesanan
         </Button>
      </div>
    </div>
  );
};
