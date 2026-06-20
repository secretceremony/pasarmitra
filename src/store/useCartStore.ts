import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit_type: string;
  distributor_id: string;
  image_url?: string;
  distributor_name?: string;
  stock?: number;
}

export interface AddItemResult {
  success: boolean;
  error?: 'MISSING_FIELDS' | 'OUT_OF_STOCK';
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => AddItemResult;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => boolean;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        // Enforce required fields
        if (!item.id || !item.name || item.price === undefined || !item.distributor_id) {
          return { success: false, error: 'MISSING_FIELDS' };
        }

        const quantity = item.quantity ?? 1;

        // Check if item exists in cart
        const existingItem = get().items.find((i) => i.id === item.id);
        const newQty = existingItem ? existingItem.quantity + quantity : quantity;
        const availableStock = item.stock ?? existingItem?.stock;

        // Stock check
        if (availableStock !== undefined) {
          if (availableStock <= 0 || newQty > availableStock) {
            return { success: false, error: 'OUT_OF_STOCK' };
          }
        }

        const newItem: CartItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: newQty,
          unit_type: item.unit_type || 'Unit',
          distributor_id: item.distributor_id,
          distributor_name: item.distributor_name || 'Distributor',
          image_url: item.image_url || '',
          stock: availableStock,
        };

        set((state) => {
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? newItem : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });

        return { success: true };
      },
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      updateQuantity: (id, quantity) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return false;

        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
          }));
          return true;
        }

        if (item.stock !== undefined && quantity > item.stock) {
          return false;
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
        return true;
      },
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      totalPrice: () => get().items.reduce((acc, i) => acc + (i.price * i.quantity), 0),
    }),
    {
      name: 'pasarmitra-cart',
    }
  )
);
