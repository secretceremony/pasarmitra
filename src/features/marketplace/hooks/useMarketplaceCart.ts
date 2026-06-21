import { useCallback } from 'react';
import { useCartStore, AddItemResult } from '../../../store/useCartStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useAuthStore } from '../../../store/use-auth-store';
import { MarketplaceProduct } from '../types/product.types';
import { ProductSummary } from '../../../core/types/commerce';
import { toast } from 'sonner';

export function useMarketplaceCart() {
  const { addItem } = useCartStore();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();

  const handleAddToCart = useCallback((product: MarketplaceProduct) => {
    if (user?.role !== 'UMKM') {
      toast.error("Hanya akun UMKM yang dapat berbelanja dan menambah produk ke keranjang.");
      return;
    }
    const result = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit_type: product.unit || 'Unit',
      distributor_id: product.distributorId,
      distributor_name: product.distributor,
      image_url: product.image,
      stock: product.stock
    }) as AddItemResult;

    if (result.success) {
      toast.success("Produk ditambahkan ke keranjang.");
      try {
        addNotification({
          title: 'Item Added',
          message: `${product.name} added to procurement cart.`,
          type: 'success'
        });
      } catch (err) {
        console.error('Error logging to notification store:', err);
      }
    } else {
      if (result.error === 'OUT_OF_STOCK') {
        toast.error("Jumlah melebihi stok tersedia.");
      } else {
        toast.error("Produk belum bisa ditambahkan ke keranjang.");
      }
    }
  }, [addItem, addNotification]);

  const handleQuickAdd = useCallback((product: ProductSummary) => {
    if (user?.role !== 'UMKM') {
      toast.error("Hanya akun UMKM yang dapat berbelanja dan menambah produk ke keranjang.");
      return;
    }
    const result = addItem({
      id: product.id,
      name: product.name,
      price: product.price.amount,
      quantity: 1,
      unit_type: product.price.unit || 'Unit',
      distributor_id: product.supplier.id || '',
      distributor_name: product.supplier.name || 'Distributor',
      image_url: product.image,
      stock: product.inventory?.stock
    }) as AddItemResult;

    if (result.success) {
      toast.success("Produk ditambahkan ke keranjang.");
      try {
        addNotification({
          title: 'Item Added',
          message: `${product.name} added to procurement cart.`,
          type: 'success'
        });
      } catch (err) {
        console.error('Error logging to notification store:', err);
      }
    } else {
      if (result.error === 'OUT_OF_STOCK') {
        toast.error("Jumlah melebihi stok tersedia.");
      } else {
        toast.error("Produk belum bisa ditambahkan ke keranjang.");
      }
    }
  }, [addItem, addNotification]);

  return {
    handleAddToCart,
    handleQuickAdd
  };
}
