import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtimeStore } from '../store/useRealtimeStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/use-auth-store';
import { toast } from 'sonner';

interface RealtimeContextType {
  subscribeToTable: (table: string, callback: (payload: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setConnected, setLastError } = useRealtimeStore();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();

  const handleRealtimePayload = useCallback((payload: any) => {
    console.log('Realtime update received:', payload);
    
    // Global notification handling if the table is 'notifications'
    if (payload.table === 'notifications' && payload.new && payload.new.user_id === user?.id) {
      addNotification({
        title: payload.new.title,
        message: payload.new.message,
        type: payload.new.type as any,
      });
      toast(payload.new.title, {
        description: payload.new.message,
      });
    }
  }, [user, addNotification]);

  useEffect(() => {
    if (!user) return;

    setConnected(true);
    setLastError(null);

    // 1. Presence Heartbeat in Firestore
    const presenceDocRef = doc(db, 'presence', user.id);
    const setPresence = async (online: boolean) => {
      try {
        if (online) {
          await setDoc(presenceDocRef, {
            user_id: user.id,
            online: true,
            online_at: new Date().toISOString(),
          });
        } else {
          await deleteDoc(presenceDocRef);
        }
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    setPresence(true);

    // Keep updating presence every 30 seconds
    const presenceInterval = setInterval(() => {
      setPresence(true);
    }, 30000);

    // 2. Subscribe to user's notifications
    let isInitialNotifications = true;
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id)
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !isInitialNotifications) {
          handleRealtimePayload({
            table: 'notifications',
            new: { id: change.doc.id, ...change.doc.data() },
          });
        }
      });
      isInitialNotifications = false;
    });

    // 3. Subscribe to user's order updates
    let isInitialOrders = true;
    // Subscribing to buyer order updates
    const buyerOrdersQuery = query(
      collection(db, 'orders'),
      where('buyer_id', '==', user.id)
    );
    const unsubscribeBuyerOrders = onSnapshot(buyerOrdersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' && !isInitialOrders) {
          const orderData = change.doc.data();
          toast.info(`Order #${change.doc.id.slice(0, 8)} updated`, {
            description: `Status changed to ${orderData.status}`,
          });
        }
      });
      isInitialOrders = false;
    });

    // Subscribing to distributor order updates
    let isInitialDistributorOrders = true;
    const distOrdersQuery = query(
      collection(db, 'orders'),
      where('distributor_id', '==', user.id)
    );
    const unsubscribeDistOrders = onSnapshot(distOrdersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' && !isInitialDistributorOrders) {
          const orderData = change.doc.data();
          toast.info(`Order #${change.doc.id.slice(0, 8)} updated`, {
            description: `Status changed to ${orderData.status}`,
          });
        }
      });
      isInitialDistributorOrders = false;
    });

    return () => {
      clearInterval(presenceInterval);
      setPresence(false);
      unsubscribeNotifications();
      unsubscribeBuyerOrders();
      unsubscribeDistOrders();
      setConnected(false);
    };
  }, [user, handleRealtimePayload, setConnected, setLastError]);

  const subscribeToTable = useCallback((table: string, callback: (payload: any) => void) => {
    const q = query(collection(db, table));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        callback({
          table,
          type: change.type.toUpperCase(),
          new: { id: change.doc.id, ...change.doc.data() },
          old: change.type === 'removed' ? { id: change.doc.id } : null
        });
      });
    });

    return unsubscribe;
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribeToTable }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

