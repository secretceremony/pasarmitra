import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const { user } = useAuthStore();

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!roomId) return;
    
    setIsLoading(true);
    const q = query(
      collection(db, 'messages'),
      where('room_id', '==', roomId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching messages snapshot:', error);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  // Subscribe to typing indicators in real-time
  useEffect(() => {
    if (!roomId) return;

    const typingQuery = collection(db, 'rooms', roomId, 'typing');
    const unsubscribeTyping = onSnapshot(typingQuery, (snapshot) => {
      const typingMap: Record<string, boolean> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.user_id !== user?.id) {
          // Check if updated in the last 10 seconds to avoid stale states
          const timeDiff = Date.now() - new Date(data.updated_at).getTime();
          if (data.is_typing && timeDiff < 10000) {
            typingMap[doc.id] = true;
          }
        }
      });
      setIsTyping(typingMap);
    });

    return () => {
      unsubscribeTyping();
    };
  }, [roomId, user]);

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
      await addDoc(collection(db, 'messages'), { 
        room_id: roomId, 
        sender_id: user.id, 
        text, 
        type,
        metadata: metadata || null,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error sending message:', err);
      // Rollback optimistic update
      setMessages((prev) => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const setTyping = useCallback(async (typing: boolean) => {
    if (!user || !roomId) return;
    try {
      const typingDocRef = doc(db, 'rooms', roomId, 'typing', user.id);
      await setDoc(typingDocRef, {
        user_id: user.id,
        is_typing: typing,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error setting typing state:', err);
    }
  }, [roomId, user]);

  return { messages, isLoading, sendMessage, isTyping, setTyping };
};

