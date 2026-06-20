import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquareText, 
  Clock, 
  TrendingDown, 
  Loader2, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Ban,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { negotiationService, Negotiation, Message } from '../services/negotiationService';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const ChatNegotiation = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  
  const [activeNegId, setActiveNegId] = useState<string | null>(null);
  const [activeNeg, setActiveNeg] = useState<Negotiation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [inputText, setInputText] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  
  // Action form states
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [counterQuantity, setCounterQuantity] = useState<number>(1);
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Reject dialog state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to negotiations list
  useEffect(() => {
    if (!user) return;

    setIsLoadingList(true);
    setListError(null);

    const field = user.role === 'UMKM' ? 'umkm_id' : 'distributor_id';
    const q = query(
      collection(db, 'negotiations'),
      where(field, '==', user.id),
      orderBy('latest_message_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Negotiation[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Negotiation);
      });
      setNegotiations(list);
      setIsLoadingList(false);

      // Auto-select first negotiation if none is selected
      if (list.length > 0 && !activeNegId) {
        setActiveNegId(list[0].id);
      }
    }, (err) => {
      console.error('Error listening to negotiations:', err);
      setListError('Gagal memuat daftar negosiasi.');
      setIsLoadingList(false);
    });

    return () => unsubscribe();
  }, [user, activeNegId]);

  // 2. Subscribe to current active negotiation details
  useEffect(() => {
    if (!activeNegId || !user) {
      setActiveNeg(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'negotiations', activeNegId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Negotiation;
        
        // Strict participant-based access control
        if (user.role === 'UMKM' && data.umkm_id !== user.id) {
          toast.error('Akses ditolak.');
          setActiveNegId(null);
          return;
        }
        if (user.role === 'DISTRIBUTOR' && data.distributor_id !== user.id) {
          toast.error('Akses ditolak.');
          setActiveNegId(null);
          return;
        }

        setActiveNeg(data);
        
        // Initialize counter form defaults
        setCounterPrice(data.requested_unit_price);
        setCounterQuantity(data.quantity);
        setCounterMessage('');
      } else {
        setActiveNeg(null);
      }
    }, (err) => {
      console.error('Error fetching negotiation detail:', err);
    });

    return () => unsubscribe();
  }, [activeNegId, user]);

  // 3. Subscribe to messages in active room
  useEffect(() => {
    if (!activeNegId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const q = query(
      collection(db, 'negotiations', activeNegId, 'messages'),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as Message);
      });
      setMessages(msgs);
      setIsLoadingMessages(false);
    }, (err) => {
      console.error('Error listening to messages:', err);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeNegId]);

  // Auto-scroll chat window
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!activeNegId || !inputText.trim() || !user) return;
    try {
      setIsSubmittingMessage(true);
      await negotiationService.postMessage(
        activeNegId,
        user.id,
        user.role,
        inputText.trim()
      );
      setInputText('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesan.');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  const handleSendCounter = async () => {
    if (!activeNegId || !user) return;
    if (counterPrice <= 0) {
      toast.error('Harga penawaran harus lebih besar dari Rp 0.');
      return;
    }
    if (counterQuantity <= 0) {
      toast.error('Jumlah barang harus lebih besar dari 0.');
      return;
    }
    try {
      setIsSubmittingAction(true);
      await negotiationService.counterOffer(
        activeNegId,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        counterPrice,
        counterQuantity,
        counterMessage.trim() || `Tawaran balik Rp ${counterPrice.toLocaleString('id-ID')} untuk ${counterQuantity} unit.`
      );
      toast.success('Penawaran balik berhasil dikirim.');
      setShowCounterForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim penawaran balik.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!activeNeg || !user) return;
    try {
      setIsSubmittingAction(true);
      const agreedPrice = activeNeg.requested_unit_price;
      await negotiationService.acceptOffer(
        activeNeg.id,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        agreedPrice
      );
      toast.success('Penawaran disetujui.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui penawaran.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!activeNegId || !user) return;
    if (!rejectReason.trim()) {
      toast.error('Harap masukkan alasan penolakan.');
      return;
    }
    try {
      setIsSubmittingAction(true);
      await negotiationService.rejectOffer(
        activeNegId,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        rejectReason.trim()
      );
      toast.success('Negosiasi ditolak.');
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak negosiasi.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCancelNegotiation = async () => {
    if (!activeNegId || !user) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan negosiasi ini?')) return;
    try {
      setIsSubmittingAction(true);
      await negotiationService.cancelNegotiation(activeNegId, user.id);
      toast.success('Negosiasi dibatalkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membatalkan negosiasi.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: Negotiation['status']) => {
    const configs: Record<Negotiation['status'], { label: string; style: string }> = {
      pending: { label: 'Menunggu Tanggapan', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      countered: { label: 'Penawaran Balik', style: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      accepted: { label: 'Disetujui', style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      rejected: { label: 'Ditolak', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
      cancelled: { label: 'Batal', style: 'bg-muted text-muted-foreground border-border' },
      converted_to_order: { label: 'Selesai (Order)', style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' }
    };
    const c = configs[status] || { label: status, style: 'bg-muted text-muted-foreground' };
    return (
      <span className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider border rounded-full", c.style)}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-8">
      {/* 1. Left Panel - Rooms list */}
      <div className="w-96 flex flex-col gap-6 shrink-0">
        <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex flex-col gap-6 h-full shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Negosiasi Harga</h2>
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
              {negotiations.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {isLoadingList ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : listError ? (
              <div className="text-center py-10 text-xs font-bold text-rose-500">
                {listError}
              </div>
            ) : negotiations.length === 0 ? (
              <div className="text-center py-20 text-xs font-bold text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                <MessageSquareText size={32} className="mx-auto mb-4 text-muted-foreground/30" />
                Belum ada pengajuan negosiasi harga.
              </div>
            ) : (
              negotiations.map((neg) => {
                const isActive = activeNegId === neg.id;
                const partnerName = user?.role === 'UMKM' ? neg.distributor_name : neg.umkm_name;
                return (
                  <motion.button
                    key={neg.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      setActiveNegId(neg.id);
                      setShowCounterForm(false);
                      setShowRejectForm(false);
                    }}
                    className={cn(
                      "w-full p-6 rounded-3xl flex flex-col gap-4 border text-left transition-all relative group",
                      isActive 
                        ? "bg-primary/10 border-primary/30 text-foreground" 
                        : "bg-card border-border/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{partnerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {neg.negotiation_code}
                        </p>
                      </div>
                      {getStatusBadge(neg.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-bold truncate text-foreground">{neg.product_name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {neg.quantity} unit • Penawaran: Rp {neg.requested_unit_price.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-medium border-t border-border/30 pt-3">
                      <span className="truncate max-w-[150px] opacity-75">{neg.latest_message}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(neg.latest_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Center Panel - Messages and Logs */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {activeNeg ? (
          <div className="flex-1 bg-card border border-border/50 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Console Header */}
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-muted/10 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shadow-inner">
                  {(user?.role === 'UMKM' ? activeNeg.distributor_name : activeNeg.umkm_name)[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    {user?.role === 'UMKM' ? activeNeg.distributor_name : activeNeg.umkm_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Kode: {activeNeg.negotiation_code}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                {getStatusBadge(activeNeg.status)}
              </div>
            </div>

            {/* Messages Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-muted/5">
              
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <Loader2 className="animate-spin text-primary" size={32} />
                  <p className="font-black text-[10px] uppercase tracking-widest">Menyelaraskan data...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20">
                  <MessageSquareText size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="font-bold text-sm text-muted-foreground">Belum ada obrolan.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  
                  // Render System Logs
                  if (msg.type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="px-6 py-2.5 bg-muted/40 border border-border/40 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center max-w-lg">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  // Render Offer & Counter Offer Card Blocks
                  if (msg.type === 'offer' || msg.type === 'counter_offer') {
                    const price = msg.offer_price || 0;
                    const qty = msg.quantity || 0;
                    const subtotal = price * qty;
                    const isDistMsg = msg.sender_role === 'DISTRIBUTOR';
                    
                    return (
                      <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-full max-w-md bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-[2rem] p-6 space-y-4 shadow-xl relative overflow-hidden"
                        >
                          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-[30px]" />
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black">
                              <TrendingDown size={20} />
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-white">
                                {msg.type === 'offer' ? 'Pengajuan Penawaran' : 'Penawaran Balik'}
                              </h4>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
                                Oleh {isDistMsg ? 'Distributor' : 'Pembeli UMKM'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-b border-white/10 py-4 my-2">
                            <div>
                              <label className="text-[9px] font-black text-white/40 uppercase">Harga Unit</label>
                              <p className="text-base font-black text-white">Rp {price.toLocaleString('id-ID')}</p>
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-white/40 uppercase">Kuantitas</label>
                              <p className="text-base font-black text-white">{qty} Unit</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs font-black">
                            <span className="text-white/40 uppercase tracking-widest text-[9px]">Subtotal Kesepakatan</span>
                            <span className="text-primary text-sm font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                          </div>

                          {msg.message && (
                            <p className="text-xs text-white/70 italic bg-white/5 p-4 rounded-xl">
                              &ldquo;{msg.message}&rdquo;
                            </p>
                          )}
                        </motion.div>
                      </div>
                    );
                  }

                  // Render Normal Text Message
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] space-y-1", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "p-5 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-card text-foreground rounded-tl-none border border-border/50"
                        )}>
                          {msg.message}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground block px-2">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input area - only allowed if negotiation is not in final status */}
            {activeNeg.status !== 'converted_to_order' && 
             activeNeg.status !== 'rejected' && 
             activeNeg.status !== 'cancelled' ? (
              <div className="p-6 border-t border-border/50 bg-background/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ketik pesan di sini..." 
                    disabled={isSubmittingMessage}
                    className="flex-1 h-14 bg-muted/30 border border-border/50 focus:border-primary/40 focus:bg-card px-6 rounded-2xl text-xs transition-all focus:outline-none font-bold"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isSubmittingMessage}
                    className="h-14 w-14 bg-primary text-primary-foreground hover:scale-105 transition-transform"
                  >
                    {isSubmittingMessage ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 border-t border-border/50 bg-muted/20 text-center text-xs font-black text-muted-foreground uppercase tracking-widest">
                Negosiasi ini telah selesai / ditutup. Obrolan dinonaktifkan.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border/50 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center gap-4 p-10">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30 animate-pulse">
              <MessageSquareText size={40} />
            </div>
            <div className="space-y-1">
              <p className="font-black text-lg">Konsol Negosiasi</p>
              <p className="text-xs text-muted-foreground font-bold max-w-xs leading-relaxed uppercase tracking-wider">
                Silakan pilih salah satu sesi negosiasi di panel sebelah kiri.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Panel - Context & Quick actions */}
      <div className="w-80 flex flex-col gap-6 shrink-0">
        {activeNeg ? (
          <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex flex-col gap-6 h-full shadow-xl overflow-y-auto custom-scrollbar">
            
            {/* Product Summary */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Detail Produk</h3>
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/10 p-4">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted mb-4 border border-border">
                  {activeNeg.product_image ? (
                    <img src={activeNeg.product_image} className="w-full h-full object-cover" alt={activeNeg.product_name} />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase">
                      No Image
                    </div>
                  )}
                </div>
                <h4 className="font-black text-xs text-foreground line-clamp-2">{activeNeg.product_name}</h4>
                <div className="mt-2 space-y-1 text-[10px] font-bold text-muted-foreground">
                  <p>Harga Asli: Rp {activeNeg.original_unit_price.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            <hr className="border-border/30" />

            {/* Quick Actions Panel */}
            <div className="space-y-4 flex-1 flex flex-col">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tindakan Negosiasi</h3>
              
              {/* Dynamic Action Buttons based on status */}
              {activeNeg.status === 'pending' || activeNeg.status === 'countered' ? (
                <div className="space-y-3 w-full">
                  
                  {/* Distributor Actions */}
                  {user?.role === 'DISTRIBUTOR' && (
                    <>
                      <Button
                        onClick={handleAcceptOffer}
                        disabled={isSubmittingAction}
                        className="w-full h-12 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10"
                      >
                        {isSubmittingAction ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="mr-2" />}
                        Terima Penawaran
                      </Button>
                      <Button
                        onClick={() => { setShowCounterForm(!showCounterForm); setShowRejectForm(false); }}
                        variant="outline"
                        disabled={isSubmittingAction}
                        className="w-full h-12 border-primary/30 text-primary hover:bg-primary hover:text-white font-black text-xs uppercase tracking-wider rounded-xl"
                      >
                        Tawarkan Kembali
                      </Button>
                      <Button
                        onClick={() => { setShowRejectForm(!showRejectForm); setShowCounterForm(false); }}
                        variant="ghost"
                        disabled={isSubmittingAction}
                        className="w-full h-12 text-rose-500 hover:bg-rose-500/10 font-black text-xs uppercase tracking-wider rounded-xl"
                      >
                        Tolak Negosiasi
                      </Button>
                    </>
                  )}

                  {/* UMKM Actions */}
                  {user?.role === 'UMKM' && (
                    <>
                      {/* UMKM can only accept if the active target was countered by Distributor */}
                      {activeNeg.status === 'countered' && (
                        <Button
                          onClick={handleAcceptOffer}
                          disabled={isSubmittingAction}
                          className="w-full h-12 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10"
                        >
                          {isSubmittingAction ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="mr-2" />}
                          Terima Penawaran
                        </Button>
                      )}
                      <Button
                        onClick={() => { setShowCounterForm(!showCounterForm); }}
                        variant="outline"
                        disabled={isSubmittingAction}
                        className="w-full h-12 border-primary/30 text-primary hover:bg-primary hover:text-white font-black text-xs uppercase tracking-wider rounded-xl"
                      >
                        Tawarkan Kembali
                      </Button>
                      <Button
                        onClick={handleCancelNegotiation}
                        variant="ghost"
                        disabled={isSubmittingAction}
                        className="w-full h-12 text-rose-500 hover:bg-rose-500/10 font-black text-xs uppercase tracking-wider rounded-xl"
                      >
                        Batalkan Negosiasi
                      </Button>
                    </>
                  )}
                </div>
              ) : activeNeg.status === 'accepted' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-1">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Sesi Disetujui</p>
                    <p className="text-[10px] text-muted-foreground font-bold leading-normal">
                      Harga disepakati: Rp {activeNeg.agreed_unit_price?.toLocaleString('id-ID')}
                    </p>
                  </div>
                  
                  {user?.role === 'UMKM' ? (
                    <Button
                      onClick={() => navigate(`/checkout?negotiationId=${activeNeg.id}`)}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20"
                    >
                      Lanjutkan ke Checkout <ArrowRight size={14} className="ml-2" />
                    </Button>
                  ) : (
                    <p className="text-[10px] text-center font-bold text-muted-foreground italic">
                      Menunggu pembeli melakukan checkout dari pesanan disepakati.
                    </p>
                  )}
                </div>
              ) : activeNeg.status === 'converted_to_order' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center space-y-1">
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Selesai (Di-Order)</p>
                    <p className="text-[10px] text-muted-foreground font-bold leading-normal">
                      Negosiasi ini telah berhasil diproses menjadi pesanan.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/orders')}
                    variant="outline"
                    className="w-full h-12 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl"
                  >
                    Lihat Pesanan Anda
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">
                    Sesi negosiasi ini telah ditutup (Dibatalkan / Ditolak).
                  </p>
                </div>
              )}

              {/* Collapsible Forms for Counter and Rejection */}
              <AnimatePresence>
                {showCounterForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-4 border-t border-border/30 w-full"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase">Harga Penawaran Baru</label>
                      <input
                        type="number"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(Number(e.target.value))}
                        className="w-full h-10 bg-muted/40 border border-border rounded-xl px-4 font-bold text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase">Kuantitas Baru</label>
                      <input
                        type="number"
                        value={counterQuantity}
                        onChange={(e) => setCounterQuantity(Number(e.target.value))}
                        className="w-full h-10 bg-muted/40 border border-border rounded-xl px-4 font-bold text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase">Catatan Tambahan</label>
                      <textarea
                        value={counterMessage}
                        onChange={(e) => setCounterMessage(e.target.value)}
                        placeholder="Catatan..."
                        rows={2}
                        className="w-full bg-muted/40 border border-border rounded-xl p-4 font-bold text-xs focus:outline-none resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleSendCounter}
                      disabled={isSubmittingAction}
                      className="w-full h-10 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl"
                    >
                      Kirim Penawaran Balik
                    </Button>
                  </motion.div>
                )}

                {showRejectForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-4 border-t border-border/30 w-full"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-rose-500 uppercase">Alasan Penolakan</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Harap jelaskan alasan penolakan..."
                        rows={2}
                        className="w-full bg-muted/40 border border-border rounded-xl p-4 font-bold text-xs focus:outline-none resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleRejectOffer}
                      disabled={isSubmittingAction}
                      className="w-full h-10 bg-rose-500 text-white font-black text-xs uppercase rounded-xl"
                    >
                      Kirim & Tolak
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-2 h-full shadow-xl">
            <AlertCircle size={24} className="text-muted-foreground/30" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Pilih Obrolan untuk info context.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}} />
    </div>
  );
};
