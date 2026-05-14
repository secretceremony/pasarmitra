import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/use-auth-store';

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  type: 'text' | 'offer' | 'system';
  created_at: string;
  metadata?: any;
}

export const useChat = (roomId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const sendMessage = async (text: string, type: 'text' | 'offer' = 'text', metadata?: any) => {
    if (!user) return;

    // Optimistic Update
    const optimisticMsg: Message = {
      id: Math.random().toString(36).slice(2),
      room_id: roomId,
      sender_id: user.id,
      text,
      type,
      created_at: new Date().toISOString(),
      metadata,
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ 
          room_id: roomId, 
          sender_id: user.id, 
          text, 
          type,
          metadata
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      // Rollback optimistic update
      setMessages((prev) => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

  const setTyping = useCallback(async (typing: boolean) => {
    if (!user) return;
    const channel = supabase.channel(`room:${roomId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, is_typing: typing },
    });
  }, [roomId, user]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        setIsTyping((prev) => ({
          ...prev,
          [payload.payload.user_id]: payload.payload.is_typing,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages]);

  return { messages, isLoading, sendMessage, isTyping, setTyping };
};
