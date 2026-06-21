import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  Settings, 
  Package, 
  ShoppingBag, 
  Truck, 
  MapPin, 
  Coins,
  CreditCard, 
  ShieldCheck,
  ShieldAlert,
  LogOut, 
  Menu, 
  X, 
  Bell,
  Search,
  ChevronDown,
  Leaf,
  Box,
  ShoppingCart,
  LayoutDashboard,
  Users,
  Handshake,
  MessageSquareText,
  TrendingUp,
  Wallet,
  Zap,
  ChevronRight,
  Heart,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../../store/use-auth-store';
import { useUIStore } from '../../store/use-ui-store';
import { useCartStore } from '../../store/useCartStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  { label: 'Sembako', icon: ShoppingBag, href: '/marketplace?category=sembako' },
  { label: 'Makanan & Minuman', icon: Leaf, href: '/marketplace?category=f&b' },
  { label: 'Rumah Tangga', icon: Box, href: '/marketplace?category=home' },
  { label: 'Elektronik', icon: Zap, href: '/marketplace?category=elektronik' },
  { label: 'Fashion', icon: Package, href: '/marketplace?category=fashion' },
  { label: 'Kesehatan', icon: ShieldCheck, href: '/marketplace?category=health' },
  { label: 'Industri', icon: Settings, href: '/marketplace?category=industrial' },
];

const UMKM_NAV_ITEMS = [
  { label: 'Dashboard', href: '/umkm/dashboard', icon: LayoutDashboard },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Keranjang', href: '/umkm/cart', icon: ShoppingCart },
  { label: 'Pesanan', href: '/orders', icon: ShoppingBag },
  { label: 'Negosiasi Harga', href: '/umkm/negosiasi-harga', icon: MessageSquareText },
  { label: 'Komplain Saya', href: '/umkm/disputes', icon: ShieldAlert },
];

const DISTRIBUTOR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/distributor/dashboard', icon: LayoutDashboard },
  { label: 'Inventaris', href: '/inventory', icon: Package },
  { label: 'Pesanan Masuk', href: '/orders', icon: ShoppingBag },
  { label: 'Saldo & Pencairan', href: '/distributor/wallet', icon: Wallet },
  { label: 'Negosiasi Harga', href: '/distributor/negosiasi-harga', icon: MessageSquareText },
  { label: 'Komplain Masuk', href: '/distributor/disputes', icon: ShieldAlert },
  { label: 'Dokumen Legal', href: '/distributor/legal-docs', icon: ShieldCheck },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Verifikasi', href: '/admin/verifications', icon: ShieldCheck },
  { label: 'Moderasi', href: '/admin/moderation', icon: Handshake },
  { label: 'Sengketa', href: '/admin/disputes', icon: ShieldAlert },
  { label: 'Pencairan Dana', href: '/admin/payouts', icon: Coins },
  { label: 'Log Audit', href: '/admin/audit', icon: Settings },
];

export const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, theme, setTheme } = useUIStore();
  const { totalItems } = useCartStore();
  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const [isMd, setIsMd] = useState(window.innerWidth >= 768);

  const sidebarRef = useRef<HTMLElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';
  
  let navItems = UMKM_NAV_ITEMS;
  if (isAdmin) navItems = ADMIN_NAV_ITEMS;
  else if (isDistributor) navItems = DISTRIBUTOR_NAV_ITEMS;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1280);
      setIsMd(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // run initially
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-foreground overflow-x-hidden">
      {/* Sidebar - Left */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 96 }}
        className="hidden md:flex flex-col bg-sidebar border-r border-sidebar-border fixed left-0 top-0 bottom-0 h-screen overflow-hidden z-50 shadow-2xl"
      >
        <div className="p-8">
          <Link to="/dashboard" className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 p-1 shadow-xl shadow-primary/5">
              <img src="/logo-PM.png" alt="Logo PasarMitra" className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter leading-none">PasarMitra</span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-primary mt-1">
                   {isAdmin ? 'System Admin' : isDistributor ? 'Distributor Pro' : 'B2B Network'}
                </span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link 
                key={item.label} 
                to={item.href || '#'} 
                className={cn(
                   "flex items-center gap-4 p-5 rounded-3xl transition-all group relative overflow-hidden",
                   isActive 
                     ? "bg-primary/10 text-primary" 
                     : "text-sidebar-foreground/70 hover:text-primary hover:bg-primary/5"
                )}
              >
                <item.icon size={24} className={cn(
                  "shrink-0 transition-transform duration-300",
                  isActive ? "text-primary" : "group-hover:scale-110"
                )} />
                {sidebarOpen && <span className="font-black text-sm tracking-tight">{item.label}</span>}
                {isActive && (
                  <motion.div layoutId="active-nav" className="absolute left-0 w-1.5 h-8 bg-primary rounded-r-xl shadow-[0_0_15px_rgba(234,88,12,0.4)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 mt-auto border-t border-sidebar-border/30 bg-sidebar/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 h-14 rounded-2xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all font-black"
            onClick={logout}
          >
            <LogOut size={22} className={sidebarOpen ? "" : "mx-auto"} />
            {sidebarOpen && <span className="text-sm uppercase tracking-widest">Keluar</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Main Container */}
      <motion.div 
        initial={false}
        animate={{ paddingLeft: isMd ? (sidebarOpen ? 300 : 96) : 0 }}
        className="flex-1 flex flex-col min-w-0 min-h-screen relative bg-background"
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-border px-4 md:px-8 py-4 flex items-center gap-3 md:gap-12 h-20 md:h-24">
          <button className="md:hidden p-2 text-foreground bg-card rounded-xl border border-border" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="hidden sm:flex flex-1 max-w-3xl items-center gap-2 md:gap-4">
             <div className="relative flex-1 group">
                <Search className="absolute left-3.5 md:left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4 md:w-5 md:h-5" />
                <input 
                  type="text" 
                  placeholder={isAdmin ? "Cari pengguna, distributor, produk, invoice, atau transaksi..." : "Cari produk, distributor, atau merek..."} 
                  className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card pl-10 pr-4 md:px-14 py-2.5 md:py-4 rounded-2xl md:rounded-3xl text-xs md:text-sm transition-all focus:outline-none shadow-sm font-bold tracking-tight h-10 md:h-14"
                />
              </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4 ml-auto">
            {!isAdmin && (
              <>
                <div className="relative">
                  <Link to="/notifications">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn(
                        "h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-[1.25rem] border-border bg-card/40 relative hover:border-primary/30 transition-all",
                        location.pathname === "/notifications" && "border-primary/50 bg-primary/10"
                      )}
                    >
                       <Bell className={cn("w-5 h-5 md:w-6 md:h-6 text-muted-foreground", location.pathname !== "/notifications" && unreadCount > 0 && "animate-bounce")} />
                       {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 md:top-4 md:right-4 w-2 h-2 md:w-2.5 md:h-2.5 bg-primary rounded-full border-2 border-background shadow-[0_0_10px_rgba(234,88,12,0.4)]" />}
                    </Button>
                  </Link>
                </div>
                {user?.role === 'UMKM' && (
                  <Link to="/umkm/cart">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn(
                        "h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-[1.25rem] border-border bg-card/40 hover:border-primary/30 transition-all relative", 
                        location.pathname === "/umkm/cart" && "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                       <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                       {totalItems() > 0 && (
                         <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-primary text-primary-foreground rounded-full border-2 border-background flex items-center justify-center text-[8px] md:text-[10px] font-black group-hover:scale-110 transition-transform">
                           {totalItems()}
                         </span>
                       )}
                    </Button>
                  </Link>
                )}

              </>
            )}

            {/* Theme Toggle */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-[1.25rem] border-border bg-card/40 hover:border-primary/30 transition-all relative cursor-pointer"
              title={theme === 'dark' ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
               {theme === 'dark' ? (
                 <Sun className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
               ) : (
                 <Moon className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
               )}
            </Button>

            <div className="h-8 md:h-10 w-px bg-border mx-0.5 md:mx-2 opacity-50" />

            <Link 
              to={isAdmin ? '/admin/profile' : isDistributor ? '/distributor/profile' : '/umkm/profile'} 
              className="flex items-center gap-4 pl-2 group cursor-pointer hover:no-underline"
            >
              <div className="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity hidden xl:flex">
                 <span className="text-sm font-black tracking-tight text-foreground">{user?.email?.split('@')[0]}</span>
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">Mitra Terverifikasi</span>
              </div>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/20 p-0.5 border-2 border-transparent group-hover:border-primary transition-all overflow-hidden shadow-lg shrink-0">
                 <div className="w-full h-full rounded-[10px] md:rounded-[14px] bg-primary flex items-center justify-center text-primary-foreground font-black text-sm md:text-xl">
                    {user?.email?.[0].toUpperCase()}
                 </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 flex">
          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-12 scroll-smooth">
            <Outlet />
          </main>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-[100] bg-sidebar flex flex-col md:hidden"
          >
             <div className="p-8 flex items-center justify-between border-b border-sidebar-border">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 p-1 shadow-md">
                      <img src="/logo-PM.png" alt="Logo PasarMitra" className="w-full h-full object-contain" />
                   </div>
                   <span className="font-black text-3xl tracking-tighter text-sidebar-foreground">PasarMitra</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-3 bg-white/5 rounded-2xl">
                  <X size={28} className="text-sidebar-foreground" />
                </button>
             </div>
             <nav className="flex-1 p-8 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <Link 
                    key={item.href} 
                    to={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-5 p-5 rounded-3xl text-xl font-black text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    <item.icon size={28} />
                    {item.label}
                  </Link>
                ))}
             </nav>
             <div className="p-8 border-t border-sidebar-border/30 bg-sidebar/50 mt-auto">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-4 h-14 rounded-2xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all font-black"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={22} />
                  <span className="text-sm uppercase tracking-widest">Keluar</span>
                </Button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}} />
    </div>
  );
};
