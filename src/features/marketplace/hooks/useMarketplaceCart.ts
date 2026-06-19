import { useCallback } from 'react';
import { useCartStore } from '../../../store/useCartStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { MarketplaceProduct } from '../types/product.types';

export function useMarketplaceCart() {
  const { addItem } = useCartStore();
  const { addNotification } = useNotificationStore();

  const handleAddToCart = useCallback((product: MarketplaceProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit_type: product.unit,
      distributor_id: product.distributorId,
      image_url: product.image
    });
    
    addNotification({
       title: 'Item Added',
       message: `${product.name} added to procurement cart.`,
       type: 'success'
    });
  }, [addItem, addNotification]);

  return {
    handleAddToCart
  };
}
