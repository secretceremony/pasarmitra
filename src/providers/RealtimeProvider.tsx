import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

    // 1. Initialize Global Channel for Notifications and Presence
    const channel = supabase.channel('global_updates', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        handleRealtimePayload({ ...payload, table: 'notifications' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new.umkm_id === user.id || payload.new.distributor_id === user.id) {
          const status = payload.new.status;
          toast.info(`Order #${payload.new.id.slice(0, 8)} updated`, {
            description: `Status changed to ${status}`,
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          setLastError(null);
          
          // Track presence
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
          setLastError('Connection lost. Attempting to reconnect...');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleRealtimePayload, setConnected, setLastError]);

  const subscribeToTable = useCallback((table: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`table_updates_${table}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
