import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquareText, 
  Clock, 
  TrendingDown, 
  Loader2, 
  ChevronLeft,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { negotiationService, Negotiation, Message } from '../services/negotiationService';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../../lib/dateUtils';

export const ChatNegotiation = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  
  const [activeNegId, setActiveNegId] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('id') || searchParams.get('negotiationId') || null;
  });
  const [activeNeg, setActiveNeg] = useState<Negotiation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [inputText, setInputText] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  
  // Custom Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [offerQuantity, setOfferQuantity] = useState<number>(1);
  const [offerNote, setOfferNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingMessageId, setRejectingMessageId] = useState<string | null>(null);
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
      where(field, '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Negotiation[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Negotiation);
      });

      // Sort in memory by latest_message_at or created_at descending
      list.sort((a, b) => {
        const timeA = new Date(a.latest_message_at || a.created_at || 0).getTime();
        const timeB = new Date(b.latest_message_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setNegotiations(list);
      setIsLoadingList(false);

      // Auto-select first negotiation if none is selected and not mobile
      if (list.length > 0 && !activeNegId && window.innerWidth >= 1024) {
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

  const handleSendOffer = async () => {
    if (!activeNeg || !user) return;
    if (offerPrice <= 0) {
      toast.error('Harga penawaran harus lebih besar dari Rp 0.');
      return;
    }
    if (offerQuantity <= 0) {
      toast.error('Jumlah barang harus lebih besar dari 0.');
      return;
    }

    try {
      setIsSubmittingAction(true);
      await negotiationService.counterOffer(
        activeNeg.id,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        user.full_name || user.email || user.role,
        offerPrice,
        offerQuantity,
        offerNote.trim() || `Tawaran baru Rp ${offerPrice.toLocaleString('id-ID')} x ${offerQuantity} unit.`
      );
      toast.success('Penawaran berhasil dikirim.');
      setShowOfferModal(false);
      setOfferNote('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim penawaran.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAcceptOffer = async (messageId: string) => {
    if (!activeNeg || !user) return;
    try {
      setIsSubmittingAction(true);
      await negotiationService.acceptOffer(
        activeNeg.id,
        messageId,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        user.full_name || user.email || user.role
      );
      toast.success('Penawaran disetujui.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui penawaran.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectOffer = async (messageId: string) => {
    if (!activeNegId || !user) return;
    if (!rejectReason.trim()) {
      toast.error('Harap masukkan alasan penolakan.');
      return;
    }
    try {
      setIsSubmittingAction(true);
      await negotiationService.rejectOffer(
        activeNegId,
        messageId,
        user.id,
        user.role as 'UMKM' | 'DISTRIBUTOR',
        user.full_name || user.email || user.role,
        rejectReason.trim()
      );
      toast.success('Penawaran ditolak.');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingMessageId(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak penawaran.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: Negotiation['status']) => {
    const configs: Record<Negotiation['status'], { label: string; style: string }> = {
      open: { label: 'Aktif', style: 'bg-primary/10 text-primary border-primary/20' },
      waiting_distributor: { label: 'Menunggu Distributor', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      waiting_buyer: { label: 'Menunggu Pembeli', style: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      accepted: { label: 'Disetujui', style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      rejected: { label: 'Ditolak', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
      cancelled: { label: 'Batal', style: 'bg-muted text-muted-foreground border-border' },
      expired: { label: 'Kedaluwarsa', style: 'bg-muted text-muted-foreground border-border' },
      checked_out: { label: 'Selesai (Di-Order)', style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
      converted_to_order: { label: 'Selesai (Di-Order)', style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' }
    };
    const c = configs[status] || { label: status, style: 'bg-muted text-muted-foreground' };
    return (
      <span className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider border rounded-full shrink-0 whitespace-nowrap", c.style)}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Negosiasi Harga</span>
      </div>

      <div className="h-auto lg:h-[calc(100vh-160px)] flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-full overflow-hidden px-4 lg:px-0">
      
      {/* 1. Left Panel - Rooms list */}
      <div className={cn("w-full lg:w-96 flex flex-col gap-4 shrink-0 h-full", activeNegId ? "hidden lg:flex" : "flex")}>
        <div className="p-5 bg-card border border-border/50 rounded-[2rem] flex flex-col gap-4 h-full shadow-xl w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">Negosiasi Harga</h2>
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-black text-xs">
              {negotiations.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 w-full">
            {isLoadingList ? (
              <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : listError ? (
              <div className="text-center py-10 text-xs font-bold text-rose-500">
                {listError}
              </div>
            ) : negotiations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground/40">
                  <MessageSquareText size={26} strokeWidth={1.5} />
                </div>
                <div className="space-y-1.5 max-w-[200px]">
                  <p className="text-sm font-black text-foreground">
                    Belum ada negosiasi aktif.
                  </p>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                    {user?.role === 'UMKM'
                      ? 'Temukan produk di marketplace dan ajukan penawaran harga ke distributor.'
                      : 'Penawaran baru dari UMKM akan muncul di sini secara otomatis.'}
                  </p>
                </div>
                {user?.role === 'UMKM' && (
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="h-9 px-5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Jelajahi Marketplace
                  </button>
                )}
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
                      setShowOfferModal(false);
                      setShowRejectModal(false);
                    }}
                    className={cn(
                      "w-full p-4 rounded-[1.5rem] flex flex-col gap-3 border text-left transition-all relative group overflow-hidden max-w-full shrink-0 cursor-pointer",
                      isActive 
                        ? "bg-primary/10 border-primary/30 text-foreground shadow-sm" 
                        : "bg-card border-border/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2 w-full min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm truncate">{partnerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {neg.negotiation_code}
                        </p>
                      </div>
                      {getStatusBadge(neg.status)}
                    </div>
                    
                    <div className="space-y-1 w-full min-w-0">
                      <p className="text-xs font-bold truncate text-foreground">{neg.product_name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">
                        {neg.quantity} unit • Penawaran: Rp {neg.requested_unit_price.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-medium border-t border-border/30 pt-3 w-full min-w-0">
                      <span className="truncate max-w-[150px] opacity-75">{neg.latest_message || neg.last_message}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatTime(neg.latest_message_at || neg.updated_at)}
                      </span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Right Panel - Active chat room */}
      <div className={cn("flex-1 flex flex-col gap-4 min-w-0 w-full max-w-full h-full", !activeNegId ? "hidden lg:flex" : "flex")}>
        {activeNeg ? (
          <div className="flex-1 bg-card border border-border/50 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative w-full max-w-full min-h-[500px] lg:min-h-0">
            
            {/* Chat Room Header */}
            <div className="p-4 lg:p-6 border-b border-border/50 bg-muted/10 backdrop-blur-md w-full max-w-full overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setActiveNegId(null)}
                  className="lg:hidden p-2 bg-muted/60 rounded-xl hover:bg-muted transition-all shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shadow-inner shrink-0 overflow-hidden border border-primary/10">
                  {activeNeg.product_image ? (
                    <img src={activeNeg.product_image} className="w-full h-full object-cover" alt={activeNeg.product_name} />
                  ) : (
                    (user?.role === 'UMKM' ? activeNeg.distributor_name : activeNeg.umkm_name)[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black tracking-tight truncate text-foreground">
                    {activeNeg.product_name}
                  </h3>
                  <p className="text-[11px] font-bold text-muted-foreground truncate mt-0.5">
                    {user?.role === 'UMKM' ? activeNeg.distributor_name : activeNeg.umkm_name}
                  </p>
                </div>
              </div>

              {/* Status details & CTAs */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase border-t md:border-t-0 pt-2 md:pt-0 border-border/30">
                <div className="flex flex-col md:items-end">
                  <span className="text-[9px] tracking-wider text-muted-foreground/60">Harga Deal / Asli</span>
                  <span className="text-foreground font-black">
                    <span className="text-primary mr-1">
                      Rp {(activeNeg.agreed_unit_price || activeNeg.requested_unit_price).toLocaleString('id-ID')}
                    </span>
                    / Rp {activeNeg.original_unit_price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="text-[9px] tracking-wider text-muted-foreground/60">Kuantitas</span>
                  <span className="text-foreground font-black">{activeNeg.quantity} Unit</span>
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="text-[9px] tracking-wider text-muted-foreground/60">Status</span>
                  {getStatusBadge(activeNeg.status)}
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/umkm/products/${activeNeg.product_id}`)}
                  className="h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-[9px] uppercase tracking-wider shrink-0 cursor-pointer"
                >
                  Lihat Produk
                </Button>
              </div>
            </div>

            {/* Messages Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 custom-scrollbar bg-muted/5 w-full">
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-20">
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
                  
                  // System log messages
                  if (msg.type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="px-4 py-2 bg-muted/40 border border-border/40 rounded-full text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center max-w-xs lg:max-w-lg break-words">
                          {msg.text || msg.message}
                        </span>
                      </div>
                    );
                  }

                  // Offer and counter-offer cards
                  if (msg.type === 'offer') {
                    const offer = msg.offer;
                    const price = offer?.unit_price || 0;
                    const qty = offer?.quantity || 0;
                    const subtotal = price * qty;
                    const note = offer?.note || msg.text || msg.message || '';
                    const status = offer?.status || 'pending';
                    const offerBy = offer?.offer_by || (msg.sender_role === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'UMKM');
                    
                    const isSender = offerBy === user?.role;
                    
                    return (
                      <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-full max-w-xs sm:max-w-md bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-[1.5rem] p-4 sm:p-6 space-y-4 shadow-xl relative overflow-hidden"
                        >
                          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-[30px]" />
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black shrink-0">
                                <TrendingDown size={16} className="sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-xs sm:text-sm text-white truncate">
                                  Tawaran Harga
                                </h4>
                                <p className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-widest">
                                  Oleh {offerBy === 'DISTRIBUTOR' ? 'Distributor' : 'Pembeli UMKM'}
                                </p>
                              </div>
                            </div>
                            
                            <span className={cn(
                              "px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-md border shrink-0",
                              status === 'pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              status === 'accepted' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              status === 'rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              status === 'countered' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              "bg-muted text-muted-foreground border-border"
                            )}>
                              {status === 'pending' ? 'Menunggu' :
                               status === 'accepted' ? 'Disetujui' :
                               status === 'rejected' ? 'Ditolak' :
                               status === 'countered' ? 'Ditawar Balik' : 'Kedaluwarsa'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4 border-b border-white/10 pb-3 my-2">
                            <div>
                              <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase">Harga Unit</label>
                              <p className="text-sm sm:text-base font-black text-white">Rp {price.toLocaleString('id-ID')}</p>
                            </div>
                            <div>
                              <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase">Kuantitas</label>
                              <p className="text-sm sm:text-base font-black text-white">{qty} Unit</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs font-black">
                            <span className="text-white/40 uppercase tracking-widest text-[8px] sm:text-[9px]">Subtotal Kesepakatan</span>
                            <span className="text-primary text-xs sm:text-sm font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                          </div>

                          {note && (
                            <p className="text-[11px] sm:text-xs text-white/70 italic bg-white/5 p-3 rounded-xl break-words">
                              &ldquo;{note}&rdquo;
                            </p>
                          )}

                          {/* Action Buttons for pending offers received from other party */}
                          {status === 'pending' && !isSender && activeNeg.status !== 'accepted' && activeNeg.status !== 'checked_out' && (
                            <div className="flex gap-2 pt-2 border-t border-white/10 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptOffer(msg.id)}
                                disabled={isSubmittingAction}
                                className="flex-1 min-w-[70px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase h-9 rounded-lg cursor-pointer"
                              >
                                Terima
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectingMessageId(msg.id); setShowRejectModal(true); }}
                                disabled={isSubmittingAction}
                                className="flex-1 min-w-[70px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-[10px] uppercase h-9 rounded-lg cursor-pointer"
                              >
                                Tolak
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOfferPrice(price);
                                  setOfferQuantity(qty);
                                  setOfferNote('');
                                  setShowOfferModal(true);
                                }}
                                disabled={isSubmittingAction}
                                className="flex-1 min-w-[70px] border-primary/30 text-primary hover:bg-primary/10 font-bold text-[10px] uppercase h-9 rounded-lg cursor-pointer"
                              >
                                Balas
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  }

                  // Normal text message bubbles
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] sm:max-w-[70%] space-y-1 flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm break-words w-full",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-card text-foreground rounded-tl-none border border-border/50"
                        )}>
                          {msg.text || msg.message}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground block px-2">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input area & CTAs depending on state */}
            {activeNeg.status !== 'accepted' && 
             activeNeg.status !== 'checked_out' && 
             activeNeg.status !== 'converted_to_order' && 
             activeNeg.status !== 'rejected' && 
             activeNeg.status !== 'cancelled' ? (
              <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ketik pesan di sini..." 
                    disabled={isSubmittingMessage}
                    className="flex-1 h-11 bg-muted/30 border border-border/50 focus:border-primary/40 focus:bg-card px-4 rounded-xl text-xs transition-all focus:outline-none font-bold"
                  />
                  <Button 
                    onClick={() => {
                      setOfferPrice(activeNeg.agreed_unit_price || activeNeg.requested_unit_price);
                      setOfferQuantity(activeNeg.quantity);
                      setOfferNote('');
                      setShowOfferModal(true);
                    }}
                    variant="outline"
                    className="h-11 px-4 border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs uppercase rounded-xl shrink-0 cursor-pointer"
                  >
                    Kirim Tawaran
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isSubmittingMessage}
                    className="h-11 w-11 bg-primary text-primary-foreground hover:scale-105 transition-transform p-0 flex items-center justify-center shrink-0 rounded-xl cursor-pointer"
                  >
                    {isSubmittingMessage ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-3">
                <p className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest text-center">
                  Sesi negosiasi ini telah selesai / ditutup. Obrolan dinonaktifkan.
                </p>
                {activeNeg.status === 'accepted' && user?.role === 'UMKM' && (
                  <Button
                    onClick={() => navigate(`/checkout?negotiationId=${activeNeg.id}`)}
                    className="w-full max-w-md h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    Checkout dengan Harga Deal <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border/50 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-center gap-4 p-8 sm:p-10 w-full max-w-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30 animate-pulse">
              <MessageSquareText size={32} className="sm:w-10 sm:h-10" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-base sm:text-lg">Negosiasi Harga</p>
              <p className="text-[10px] text-muted-foreground font-bold max-w-xs leading-relaxed uppercase tracking-wider">
                Pilih salah satu negosiasi untuk mulai melihat percakapan.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals */}
      <AnimatePresence>
        {showOfferModal && activeNeg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border/50 rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col z-10"
            >
              <h3 className="text-lg font-black tracking-tight text-foreground border-b border-border/50 pb-3">
                Kirim Penawaran Harga
              </h3>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">Harga Penawaran Unit (Rp)</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 font-bold text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">Kuantitas</label>
                  <input
                    type="number"
                    value={offerQuantity}
                    onChange={(e) => setOfferQuantity(Number(e.target.value))}
                    className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 font-bold text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">Catatan Tambahan</label>
                  <textarea
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="Catatan penawaran..."
                    rows={3}
                    className="w-full bg-muted/40 border border-border rounded-xl p-4 font-bold text-xs focus:outline-none resize-none"
                  />
                </div>

                {offerPrice > 0 && offerPrice < activeNeg.original_unit_price * 0.7 && (
                  <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 animate-pulse text-amber-500" />
                    <span>Peringatan: Harga penawaran di bawah 70% dari harga asli. Distributor mungkin akan menolak penawaran ini.</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowOfferModal(false)}
                    disabled={isSubmittingAction}
                    className="flex-1 h-11 font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSendOffer}
                    disabled={isSubmittingAction}
                    className="flex-1 h-11 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    {isSubmittingAction ? <Loader2 className="animate-spin" size={14} /> : 'Kirim'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border/50 rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col z-10"
            >
              <h3 className="text-lg font-black tracking-tight text-rose-500 border-b border-border/50 pb-3">
                Tolak Penawaran Harga
              </h3>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase">Alasan Penolakan</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Harap jelaskan alasan penolakan..."
                    rows={3}
                    className="w-full bg-muted/40 border border-border rounded-xl p-4 font-bold text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(false)}
                    disabled={isSubmittingAction}
                    className="flex-1 h-11 font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => rejectingMessageId && handleRejectOffer(rejectingMessageId)}
                    disabled={isSubmittingAction}
                    className="flex-1 h-11 bg-rose-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    {isSubmittingAction ? <Loader2 className="animate-spin" size={14} /> : 'Tolak & Kirim'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}} />
    </div>
    </div>
  );
};
