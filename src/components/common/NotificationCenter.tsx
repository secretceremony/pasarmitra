import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShoppingBag, MessageSquare, AlertTriangle, CheckCircle2, Trash2, Clock, Check } from 'lucide-react';
import { useNotificationStore, Notification } from '../../store/useNotificationStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const NotificationCenter = () => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertTriangle className="text-rose-500" size={18} />;
      default: return <Bell className="text-primary" size={18} />;
    }
  };

  return (
    <div className="w-[400px] bg-card border border-border/50 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[600px]">
      <div className="p-8 border-b border-border/50 bg-muted/5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight">Notifications</h3>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
            {unreadCount} UNREAD MESSAGES
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={markAllAsRead}>
              <Check className="size-5" />
           </Button>
           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all" onClick={clearAll}>
              <Trash2 className="size-5" />
           </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-30"
            >
               <Bell size={48} strokeWidth={1.5} />
               <p className="font-black text-sm uppercase tracking-widest">Quiet as a whisper</p>
            </motion.div>
          ) : (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-5 rounded-3xl border transition-all relative group cursor-pointer",
                  n.is_read ? "bg-muted/5 border-border/30 opacity-60" : "bg-card border-primary/20 shadow-lg shadow-primary/5"
                )}
                onClick={() => markAsRead(n.id)}
              >
                {!n.is_read && <div className="absolute top-6 right-6 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    n.is_read ? "bg-muted" : "bg-primary/10"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-black text-sm tracking-tight leading-tight">{n.title}</p>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase">
                       <Clock size={10} />
                       {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {notifications.length > 0 && (
        <div className="p-6 bg-muted/5 border-t border-border/50">
          <Button variant="ghost" className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest">
            View All Activity History
          </Button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}} />
    </div>
  );
};
