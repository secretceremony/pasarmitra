import React, { useEffect, useState } from 'react';
import {
  Filter,
  Loader2,
  MapPin,
  Printer,
  Search,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { Order, orderService } from '../services/orderService';
import { formatDateTime } from '../../../lib/dateUtils';

const TABS = [
  { key: 'All', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'processing', label: 'Diproses' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'delivered', label: 'Selesai' }
];

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Menunggu';
    case 'processing':
      return 'Diproses';
    case 'shipped':
      return 'Dikirim';
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
      return 'Menunggu Pembayaran';
    case 'paid':
      return 'Dibayar';
    case 'failed':
      return 'Gagal';
    case 'refunded':
      return 'Direfund';
    default:
      return status;
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

// Replaced by shared formatDateTime from dateUtils
const formatOrderDate = (createdAt?: string) => formatDateTime(createdAt);

const getNextStatus = (status: Order['status']): Order['status'] | null => {
  if (status === 'pending') return 'processing';
  if (status === 'processing') return 'shipped';
  if (status === 'shipped') return 'delivered';
  return null;
};

const getActionLabel = (status: Order['status']) => {
  if (status === 'pending') return 'Proses';
  if (status === 'processing') return 'Kirim';
  if (status === 'shipped') return 'Selesaikan';
  return 'Selesai';
};

export const OrderManagement = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});

  const isBuyer = user?.role === 'UMKM';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/finances');
    }
  }, [navigate, user?.role]);

  useEffect(() => {
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

        const data = user.role === 'UMKM'
          ? await orderService.getBuyerOrders(user.id)
          : await orderService.getDistributorOrders(user.id);

        setOrders(data);
      } catch (err) {
        console.error('Gagal memuat pesanan:', err);
        setError('Gagal memuat pesanan.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user?.id, user?.role]);

  const handleStatusUpdate = async (orderId: string, currentStatus: Order['status']) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus || !isDistributor) return;

    setUpdatingOrders((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await orderService.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((order) => order.id === orderId ? updated : order));
      toast.success(`Status pesanan diperbarui menjadi ${getStatusLabel(nextStatus)}.`);
    } catch (err) {
      console.error('Gagal memperbarui status pesanan:', err);
      toast.error('Gagal memperbarui status pesanan.');
    } finally {
      setUpdatingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === 'All' || order.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (order.order_code || order.id || '').toLowerCase().includes(searchLower) ||
      (order.buyer_name || '').toLowerCase().includes(searchLower) ||
      (order.buyer_profile?.organization_name || '').toLowerCase().includes(searchLower) ||
      (order.distributor_name || '').toLowerCase().includes(searchLower) ||
      (order.shipping_address || '').toLowerCase().includes(searchLower) ||
      getItemsSummary(order).toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">
            {isBuyer ? 'Pesanan Saya' : 'Pesanan Masuk'}
          </h1>
          <p className="max-w-2xl text-lg font-medium text-muted-foreground">
            {isBuyer
              ? 'Lacak status pengiriman dan riwayat pembelian sembako Anda.'
              : 'Proses pemenuhan dan lacak pengiriman di seluruh jaringan mitra Anda.'}
          </p>
        </div>

        {isDistributor && (
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="h-14 rounded-2xl border-border bg-card/40 px-8 font-black">
              Proses Massal
            </Button>
            <Button className="h-14 rounded-2xl bg-primary px-8 font-black text-primary-foreground shadow-xl shadow-primary/20">
              <Printer className="mr-2" size={20} />
              Cetak Faktur
            </Button>
          </div>
        )}
      </div>

      <div className="flex w-full gap-2 overflow-x-auto rounded-3xl border border-border/50 bg-card p-2 md:w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap rounded-2xl px-6 py-3 text-sm font-black transition-all',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="group relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
          <input
            type="text"
            placeholder={isBuyer ? 'Cari berdasarkan kode pesanan, distributor, atau item...' : 'Cari berdasarkan kode pesanan, pembeli, atau item...'}
            className="h-14 w-full rounded-2xl border border-border/50 bg-card/60 px-16 text-sm font-bold transition-all focus:border-primary/40 focus:bg-card focus:outline-none"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <Button variant="outline" className="h-14 rounded-2xl border-border bg-card/40 px-8 font-bold">
          <Filter size={20} />
          Filter
        </Button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="rounded-[2.5rem] border border-border/50 bg-card p-12 text-center font-bold text-muted-foreground">
            Memuat pesanan...
          </div>
        ) : error ? (
          <div className="space-y-2 rounded-[2.5rem] border border-border/50 bg-card p-12 text-center">
            <p className="text-xl font-black">Gagal memuat pesanan.</p>
            <p className="text-sm font-bold text-muted-foreground">Silakan coba buka halaman ini kembali.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="space-y-4 rounded-[2.5rem] border border-border/50 bg-card p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/40">
              <ShoppingBag size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black">
                {isBuyer ? 'Belum ada pesanan.' : 'Belum ada pesanan masuk.'}
              </p>
              <p className="text-sm font-bold text-muted-foreground">
                {isBuyer
                  ? 'Produk yang kamu checkout akan muncul di sini.'
                  : 'Pesanan dari UMKM akan muncul setelah checkout berhasil.'}
              </p>
            </div>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const nextStatus = getNextStatus(order.status);
            const isUpdating = Boolean(updatingOrders[order.id]);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col gap-8 rounded-[2.5rem] border border-border/50 bg-card p-6 shadow-xl transition-all hover:border-primary/30 md:p-10 xl:flex-row xl:items-center"
              >
                <div className="flex min-w-0 items-center gap-6 xl:w-1/4">
                  <div
                    className={cn(
                      'flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] text-3xl font-black shadow-inner',
                      order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        order.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                          order.status === 'shipped' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {(order.order_code || order.id || '').slice(-2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-black tracking-tight">
                      Pesanan #{order.order_code || order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      {formatOrderDate(order.created_at)}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-black transition-colors hover:text-primary">
                      {isBuyer
                        ? (order.distributor_name || 'Distributor tidak diketahui')
                        : (order.buyer_name || order.buyer_profile?.organization_name || 'UMKM tidak diketahui')}
                    </p>
                    <span className="rounded-full bg-muted/40 px-3 py-1 text-xs font-black uppercase tracking-tighter text-muted-foreground">
                      {order.items?.length || 0} Barang
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <ShoppingBag size={16} className="shrink-0 text-primary/60" />
                    <p className="truncate text-sm font-bold">{getItemsSummary(order)}</p>
                  </div>
                  {isDistributor && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin size={16} className="shrink-0 text-primary/60" />
                      <p className="truncate text-sm font-bold">{order.shipping_address || 'Alamat tidak ditentukan'}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between xl:w-1/3">
                  <div className="sm:text-right">
                    <p className="text-2xl font-black">
                      Rp {(Number(order.total_amount) || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {getPaymentStatusLabel(order.payment_status)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                    <span
                      className={cn(
                        'rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm',
                        order.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                          order.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                            order.status === 'shipped' ? 'bg-emerald-500/20 text-emerald-500' :
                              'bg-muted/20 text-muted-foreground'
                      )}
                    >
                      {getStatusLabel(order.status)}
                    </span>

                    {isDistributor && nextStatus && (
                      <Button
                        onClick={() => handleStatusUpdate(order.id, order.status)}
                        disabled={isUpdating}
                        className="h-12 min-w-28 rounded-xl bg-primary px-4 text-xs font-black uppercase text-primary-foreground"
                      >
                        {isUpdating && <Loader2 className="mr-2 animate-spin" size={16} />}
                        {isUpdating ? 'Memproses...' : getActionLabel(order.status)}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {filteredOrders.length > 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center space-y-2 pb-4 pt-8">
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
            Semua pesanan sudah ditampilkan
          </p>
        </div>
      )}
    </div>
  );
};
