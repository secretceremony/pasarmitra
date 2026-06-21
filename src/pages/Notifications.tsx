import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, Notification } from '../store/useNotificationStore';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { Bell, AlertTriangle, CheckCircle2, Trash2, Clock, Check, ChevronLeft } from 'lucide-react';
import { SkeletonRow } from '../components/common/SkeletonLoader';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Brief loading gate so the page never flashes blank content during hydration
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
      case 'error':   return <AlertTriangle className="text-rose-500" size={24} />;
      default:        return <Bell className="text-primary" size={24} />;
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-foreground">Notifications</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Pemberitahuan</h1>
          <p className="text-muted-foreground font-medium max-w-2xl">
            Lihat semua log aktivitas, status pemesanan, dan notifikasi sistem PasarMitra Anda.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="h-14 px-6 rounded-2xl border-border bg-card font-black hover:bg-muted transition-all cursor-pointer flex-1 md:flex-initial justify-center"
          >
            <ChevronLeft size={20} className="mr-2" />
            Kembali
          </Button>
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || isLoading}
            className="h-14 px-6 rounded-2xl border-border bg-card font-black hover:bg-muted transition-all cursor-pointer flex-1 md:flex-initial justify-center"
          >
            <Check size={20} className="mr-2" />
            Tandai Semua Dibaca
          </Button>
          <Button
            variant="ghost"
            onClick={clearAll}
            disabled={notifications.length === 0 || isLoading}
            className="h-14 px-6 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-black transition-all cursor-pointer flex-1 md:flex-initial justify-center"
          >
            <Trash2 size={20} className="mr-2" />
            Hapus Semua
          </Button>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="bg-card border border-border/50 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border/30 pb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {isLoading ? '— Memuat —' : `${unreadCount} Pesan Belum Dibaca`}
          </span>
        </div>

        <div className="space-y-4">
          {/* ── Loading skeleton ── */}
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : notifications.length === 0 ? (
            /* ── Empty state ── */
            <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-40">
              <Bell size={64} strokeWidth={1.5} className="text-muted-foreground" />
              <div>
                <p className="font-black text-lg text-foreground">Tidak ada pemberitahuan</p>
                <p className="text-xs text-muted-foreground mt-1">Kotak masuk Anda bersih dan sepi.</p>
              </div>
            </div>
          ) : (
            /* ── Notification items ── */
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'p-6 rounded-3xl border transition-all relative flex flex-col sm:flex-row justify-between sm:items-center gap-6 cursor-pointer',
                  n.is_read
                    ? 'bg-muted/5 border-border/30 opacity-60'
                    : 'bg-card border-primary/20 shadow-lg shadow-primary/5'
                )}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex gap-4 items-start flex-1">
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                    n.is_read ? 'bg-muted' : 'bg-primary/10'
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-black text-base tracking-tight leading-tight flex items-center gap-3">
                      {n.title}
                      {!n.is_read && (
                        <span className="inline-block w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0" />
                      )}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase">
                      <Clock size={12} />
                      {new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
