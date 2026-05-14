import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [
    {
      id: '1',
      title: 'Order Shipped',
      message: 'Your order PM-98419 has been shipped by Mayora Indah.',
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'New Negotiation',
      message: 'Warung Barokah has sent a counter-offer for Sugar Bulk Order.',
      type: 'info',
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    }
  ],
  addNotification: (n) => set((state) => ({
    notifications: [
      {
        ...n,
        id: Math.random().toString(36).substring(7),
        is_read: false,
        created_at: new Date().toISOString(),
      },
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    )
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, is_read: true }))
  })),
  clearAll: () => set({ notifications: [] }),
}));
