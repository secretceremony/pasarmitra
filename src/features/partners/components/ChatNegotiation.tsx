import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  Search, 
  MessageSquareText, 
  FileText, 
  History, 
  CheckCircle2, 
  X,
  Plus,
  ArrowDownCircle,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useChat } from '../hooks/useChat';
import { useAuthStore } from '../../../store/use-auth-store';
import { partnerService } from '../services/partnerService';

export const ChatNegotiation = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  
  const { user } = useAuthStore();
  const { messages, isLoading: isLoadingMessages, sendMessage, isTyping, setTyping } = useChat(activeChat?.id || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      try {
        setIsLoadingChats(true);
        const data = await partnerService.getActiveChats(user.id, user.role);
        setChats(data);
        if (data.length > 0) {
          setActiveChat(data[0]);
        }
      } catch (err) {
        console.error('Error loading chats:', err);
      } finally {
        setIsLoadingChats(false);
      }
    };
    loadChats();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setTyping(false);
    await sendMessage(inputText);
    setInputText('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Typing indicator logic
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherTyping = Object.entries(isTyping).filter(([uid, typing]) => uid !== user?.id && typing);

  return (
    <div className="h-[calc(100vh-160px)] flex gap-8">
      {/* Sidebar - Chat List */}
      <div className="w-96 flex flex-col gap-6">
         <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex flex-col gap-6 h-full shadow-xl">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black tracking-tight font-sans">Pesan</h2>
               <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                  <Plus size={20} />
               </div>
            </div>

            <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
               <input 
                  type="text" 
                  placeholder="Cari obrolan..." 
                  className="w-full bg-muted/30 border border-border/50 focus:border-primary/40 focus:bg-card px-12 h-12 rounded-xl text-xs transition-all focus:outline-none font-bold"
               />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
               {isLoadingChats ? (
                  <div className="flex items-center justify-center h-full">
                     <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
               ) : chats.length === 0 ? (
                  <div className="text-center py-10 text-xs font-bold text-muted-foreground">
                     Tidak ada mitra aktif.
                  </div>
               ) : (
                  chats.map((chat) => (
                    <motion.button
                      key={chat.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setActiveChat(chat)}
                      className={cn(
                        "w-full p-6 rounded-2xl flex items-center gap-5 transition-all text-left group relative",
                        activeChat?.id === chat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                      )}
                    >
                       <div className="relative">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg",
                            activeChat?.id === chat.id ? "bg-white/20" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                          )}>
                             {chat.partner[0]}
                          </div>
                          {chat.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-card rounded-full shadow-lg" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                             <p className="font-black truncate tracking-tight">{chat.partner}</p>
                             <span className="text-[10px] font-bold opacity-60 shrink-0">{chat.time}</span>
                          </div>
                          <p className={cn("text-xs truncate transition-opacity", activeChat?.id === chat.id ? "opacity-80" : "text-muted-foreground")}>
                             {chat.lastMsg}
                          </p>
                       </div>
                       {chat.unread > 0 && <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-pulse">{chat.unread}</div>}
                    </motion.button>
                  ))
               )}
            </div>
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
         {activeChat ? (
            <div className="flex-1 bg-card border border-border/50 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
               {/* Header */}
               <div className="p-8 border-b border-border/50 flex items-center justify-between bg-muted/10 backdrop-blur-md">
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shadow-inner">
                        {activeChat.partner[0]}
                     </div>
                     <div>
                        <h3 className="text-xl font-black tracking-tight">{activeChat.partner}</h3>
                        <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full", activeChat.online ? "bg-emerald-500" : "bg-muted-foreground")} />
                           <span className="text-xs font-bold text-muted-foreground">{activeChat.online ? 'Aktif Sekarang' : 'Offline'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <Button variant="outline" size="icon" className="rounded-xl border-border hover:border-primary">
                        <History size={20} />
                     </Button>
                     <Button variant="outline" size="icon" className="rounded-xl border-border hover:border-primary">
                        <MoreVertical size={20} />
                     </Button>
                  </div>
               </div>

               {/* Messages Area */}
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div className="flex justify-center">
                     <span className="px-4 py-1.5 bg-muted/40 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hari Ini</span>
                  </div>

                  {isLoadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                       <Loader2 className="animate-spin text-primary" size={32} />
                       <p className="font-black text-xs uppercase tracking-widest">Menyinkronkan Saluran Aman...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
                       <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                          <MessageSquareText size={40} />
                       </div>
                       <div className="space-y-1">
                          <p className="font-black text-lg">Belum ada pesan</p>
                          <p className="text-sm text-muted-foreground font-medium max-w-[240px]">Mulai negosiasi dengan mengirimkan pesan di bawah ini.</p>
                       </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={cn(
                          "flex group",
                          isMe ? "justify-end" : "justify-start"
                        )}>
                           <div className={cn(
                             "max-w-[70%] space-y-2",
                             isMe ? "items-end" : "items-start"
                           )}>
                              <div className={cn(
                                "p-6 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                                isMe 
                                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                                  : "bg-muted/40 text-foreground rounded-tl-none border border-border/50"
                              )}>
                                 {msg.text}
                              </div>
                              <div className={cn(
                                "flex items-center gap-3 px-2 transition-opacity group-hover:opacity-100",
                                isMe ? "flex-row-reverse opacity-0" : "opacity-0"
                              )}>
                                 <span className="text-[10px] font-bold text-muted-foreground">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                                 {isMe && <CheckCircle2 size={12} className="text-primary" />}
                              </div>
                           </div>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Offer Widget - The "Negotiation" logic viz */}
                  <div className="flex justify-center py-6">
                     <motion.div 
                       initial={{ scale: 0.95, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="w-full max-w-md bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden"
                     >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[40px]" />
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black">
                              <TrendingUp size={24} />
                           </div>
                           <h4 className="font-black text-lg text-white">Penawaran Harga Khusus</h4>
                        </div>
                        <p className="text-sm text-white/50 font-medium">Buat harga kustom untuk pesanan ini guna menyepakati kemitraan.</p>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-primary uppercase">Harga Saat Ini</label>
                              <p className="text-xl font-black text-white">Rp 142.000</p>
                           </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-rose-400 uppercase">Harga Target</label>
                              <p className="text-xl font-black text-white">Rp 135.000</p>
                           </div>
                        </div>
                        <div className="space-y-2 pt-2">
                           <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-widest">
                              <span>Dampak Margin</span>
                              <span className="text-rose-400">-4.2%</span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 w-[40%]" />
                           </div>
                        </div>
                        <Button className="w-full h-12 bg-primary text-primary-foreground font-black rounded-xl shadow-xl shadow-primary/20">Kirim Penawaran Balik</Button>
                     </motion.div>
                  </div>
               </div>

               {/* Input Area */}
               <div className="p-8 border-t border-border/50 bg-background/50 backdrop-blur-md">
                  <div className="flex items-center gap-6">
                     <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all">
                           <Paperclip size={24} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all">
                           <ArrowDownCircle size={24} />
                        </Button>
                     </div>
                     <div className="flex-1 relative group">
                        <input 
                           type="text" 
                           value={inputText}
                           onChange={handleInputChange}
                           onKeyDown={handleKeyDown}
                           placeholder="Ketik pesan Anda atau negosiasikan harga..." 
                           className="w-full h-14 bg-muted/30 border border-border/50 focus:border-primary/40 focus:bg-card px-8 rounded-2xl text-sm transition-all focus:outline-none font-bold"
                        />
                        <Button 
                          onClick={handleSend}
                          disabled={!inputText.trim() || isLoadingMessages}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale"
                        >
                           <Send size={18} />
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="flex-1 bg-card border border-border/50 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center gap-4 p-10">
               <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                  <MessageSquareText size={40} />
               </div>
               <div className="space-y-1">
                  <p className="font-black text-lg">Pilih Mitra</p>
                  <p className="text-sm text-muted-foreground font-medium max-w-[240px]">Silakan pilih salah satu mitra dari daftar di sebelah kiri untuk memulai obrolan negosiasi.</p>
               </div>
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
