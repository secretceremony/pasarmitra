import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, 
  ShoppingBag, 
  MessageSquare, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Flag, 
  ShieldAlert, 
  X,
  Store,
  MapPin,
  Minus,
  Plus
} from 'lucide-react';
import { useAuthStore } from '../store/use-auth-store';
import { useCartStore, AddItemResult } from '../store/useCartStore';
import { inventoryService, Product } from '../features/inventory/services/inventoryService';
import { reviewService, ProductReview } from '../features/orders/services/reviewService';
import { NegotiationModal } from '../features/partners/components/NegotiationModal';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const PRODUCT_REPORT_REASONS = [
  "Harga mencurigakan",
  "Informasi produk tidak sesuai",
  "Produk dilarang/tidak relevan",
  "Indikasi penipuan",
  "Stok/harga menyesatkan",
  "Lainnya"
];

const REVIEW_REPORT_REASONS = [
  "Kasar / tidak pantas",
  "Spam / iklan",
  "Ulasan palsu",
  "Informasi tidak relevan",
  "Lainnya"
];

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [distributorProfile, setDistributorProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Quantity Selector
  const [quantity, setQuantity] = useState(1);

  // Negotiation Modal
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'PRODUCT' | 'REVIEW'>('PRODUCT');
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [selectedReasonOption, setSelectedReasonOption] = useState('');
  const [customReasonText, setCustomReasonText] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const fetchProductData = async () => {
    if (!productId) return;
    try {
      setIsLoading(true);
      setError(null);
      setIsUnavailable(false);

      const prodData = await inventoryService.getProductById(productId);
      if (!prodData) {
        setProduct(null);
        return;
      }

      // Fetch distributor profile to cross-check eligibility
      const distDoc = await getDoc(doc(db, 'profiles', prodData.distributor_id));
      if (!distDoc.exists()) {
        setIsUnavailable(true);
        return;
      }

      const distData = distDoc.data();
      setDistributorProfile({ id: distDoc.id, ...distData });
      setProduct(prodData);

      // Validate availability & distributor eligibility
      const isProductActive = prodData.is_active !== false;
      const isDistributorVerified = distData.is_verified === true;
      const isDistributorActive = distData.is_active !== false;
      const isDistributorNotSuspended = distData.is_suspended !== true;

      if (!isProductActive || !isDistributorVerified || !isDistributorActive || !isDistributorNotSuspended) {
        setIsUnavailable(true);
      }

      // Set default quantity to MOQ
      setQuantity(prodData.min_order_quantity || 1);

    } catch (err: any) {
      console.error("Gagal memuat detail produk:", err);
      setError("Gagal memuat detail produk.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!productId) return;
    try {
      setIsLoadingReviews(true);
      const data = await reviewService.getReviewsForProduct(productId);
      setReviews(data);
    } catch (err) {
      console.error("Gagal memuat ulasan:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchProductData();
    fetchReviews();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    if (isUnavailable) {
      toast.error("Produk ini sedang tidak tersedia.");
      return;
    }

    if (quantity < product.min_order_quantity) {
      toast.error(`Kuantitas minimal pembelian adalah ${product.min_order_quantity} ${product.unit_type}.`);
      return;
    }

    if (product.stock !== undefined && quantity > product.stock) {
      toast.error("Jumlah melebihi stok tersedia.");
      return;
    }

    const result = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      unit_type: product.unit_type || 'Unit',
      distributor_id: product.distributor_id,
      distributor_name: product.distributor_name || distributorProfile?.organization_name || 'Distributor',
      image_url: product.image_url,
      stock: product.stock
    }) as AddItemResult;

    if (result.success) {
      toast.success("Produk ditambahkan ke keranjang.");
    } else {
      if (result.error === 'OUT_OF_STOCK') {
        toast.error("Jumlah melebihi stok tersedia.");
      } else {
        toast.error("Gagal menambahkan produk ke keranjang.");
      }
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    const finalReason = selectedReasonOption === 'Lainnya' ? customReasonText.trim() : selectedReasonOption;
    if (!finalReason) {
      toast.error("Alasan laporan wajib diisi.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      if (reportType === 'PRODUCT') {
        await reviewService.reportProduct(
          product.id,
          product.name,
          product.distributor_id,
          product.distributor_name || distributorProfile?.organization_name || 'Distributor',
          finalReason,
          user.email
        );
        toast.success("Laporan produk berhasil dikirim.");
      } else if (reportType === 'REVIEW' && selectedReview) {
        await reviewService.reportReview(
          selectedReview.id!,
          selectedReview.rating,
          selectedReview.comment,
          selectedReview.buyer_name,
          finalReason,
          user.email
        );
        toast.success("Laporan ulasan berhasil dikirim.");
      }
      setIsReportModalOpen(false);
      setSelectedReasonOption('');
      setCustomReasonText('');
      setSelectedReview(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengirim laporan.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleIncrement = () => {
    if (!product) return;
    if (product.stock !== undefined && quantity >= product.stock) return;
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (!product) return;
    if (quantity <= product.min_order_quantity) return;
    setQuantity(prev => prev - 1);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product) return;
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    setQuantity(val);
  };

  const handleQuantityBlur = () => {
    if (!product) return;
    let val = quantity;
    if (val < product.min_order_quantity) val = product.min_order_quantity;
    if (product.stock !== undefined && val > product.stock) val = product.stock;
    setQuantity(val);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black text-xs uppercase tracking-widest">Memuat Detail Produk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black">{error}</h2>
        <Button onClick={() => navigate('/marketplace')} className="rounded-xl">
          Kembali ke Marketplace
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black">Produk tidak ditemukan.</h2>
        <Button onClick={() => navigate('/marketplace')} className="rounded-xl">
          Kembali ke Marketplace
        </Button>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black">Produk ini sedang tidak tersedia.</h2>
        <p className="text-muted-foreground text-sm font-medium">Produk tidak aktif atau distributor penyedia sedang ditangguhkan/belum diverifikasi.</p>
        <Button onClick={() => navigate('/marketplace')} className="rounded-xl">
          Kembali ke Marketplace
        </Button>
      </div>
    );
  }

  const canReportProduct = user && user.role === 'UMKM';
  const canReportReview = (rev: ProductReview) => {
    if (!user) return false;
    if (user.role === 'UMKM') return true;
    if (user.role === 'DISTRIBUTOR') {
      return product.distributor_id === user.id;
    }
    return false;
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => navigate('/marketplace')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Marketplace
        </button>
        <span>/</span>
        <span className="text-foreground">Detail Produk</span>
      </div>

      {/* Back navigation */}
      <button
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group animate-in fade-in slide-in-from-left-4 duration-300 cursor-pointer"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        <span>Kembali ke Marketplace</span>
      </button>

      {/* Main product detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 lg:gap-8 min-w-0 w-full animate-in fade-in duration-300">
        
        {/* Left Column: Image Container */}
        <div className="min-w-0 w-full">
          <div className="w-full aspect-square lg:aspect-[4/3] lg:max-h-[520px] rounded-3xl overflow-hidden bg-muted border border-border/30">
            <img 
              src={product.image_url || '/assets/fallback-product.png'} 
              className="w-full h-full object-cover" 
              alt={product.name} 
            />
          </div>
        </div>

        {/* Right Column: Info & CTAs */}
        <div className="min-w-0 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            
            {/* Category, Distributor, Report */}
            <div className="flex flex-wrap gap-2 items-center justify-between w-full">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">
                  {product.category || 'Sembako'}
                </span>
                <button
                  onClick={() => navigate(`/distributor/${product.distributor_id}`)}
                  className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors cursor-pointer"
                >
                  <Store size={12} />
                  {product.distributor_name || distributorProfile?.organization_name || 'Distributor'}
                </button>
                {distributorProfile?.is_verified && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase rounded-lg">
                    <ShieldCheck size={9} /> Terverifikasi
                  </span>
                )}
              </div>

              {canReportProduct && (
                <button
                  onClick={() => {
                    setReportType('PRODUCT');
                    setIsReportModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <Flag size={12} />
                  Laporkan Produk
                </button>
              )}
            </div>

            {/* Title & Location */}
            <div className="space-y-1.5">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-foreground break-words">
                {product.name}
              </h2>
              {distributorProfile?.business_district && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                  <MapPin size={13} className="text-primary" />
                  <span>Kecamatan {distributorProfile.business_district}, Balikpapan</span>
                </p>
              )}
            </div>

            {/* Price display */}
            <div className="bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Harga Per {product.unit_type || 'Unit'}</p>
                <p className="text-4xl md:text-5xl font-black text-foreground italic mt-0.5 break-words leading-none">
                  Rp {product.price.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-tighter mb-1 inline-block sm:block">Min. Pembelian</p>
                <p className="text-sm font-black italic">{product.min_order_quantity || 1} {product.unit_type || 'Unit'}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Deskripsi Produk</p>
              <p className="text-sm text-foreground/80 font-medium leading-relaxed whitespace-pre-line">
                {product.description || 'Tidak ada deskripsi produk.'}
              </p>
            </div>

            {/* Stock Level */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                product.stock > 50 ? "bg-emerald-500" : product.stock > 0 ? "bg-amber-500 animate-pulse" : "bg-rose-500"
              )} />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {product.stock > 50 ? `Stok Melimpah (${product.stock} ${product.unit_type || 'Unit'})` : product.stock > 0 ? `Stok Terbatas (${product.stock} ${product.unit_type || 'Unit'})` : "Stok Habis"}
              </span>
            </div>

            {/* Wholesale Tiered Pricing Table */}
            {product.tiered_pricing && product.tiered_pricing.length > 0 && (
              <div className="space-y-2 pt-2 w-full min-w-0">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Skema Harga Grosir Bertingkat
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {product.tiered_pricing.map((tier: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-3 rounded-xl min-w-0 w-full gap-2">
                      <span className="text-xs font-bold text-[#D4AF37] truncate">Beli ≥ {tier.min_quantity} {product.unit_type || 'Unit'}</span>
                      <span className="text-xs font-black text-foreground italic shrink-0">Rp {tier.price_per_unit.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Cart & Quantity & Negotiation Block */}
          {user?.role === 'UMKM' && (
            <div className="border-t border-border/30 pt-6 space-y-4">
              
              {/* Quantity selector */}
              <div className="flex items-center justify-between bg-muted/20 border border-border/30 rounded-2xl p-3 max-w-[200px]">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= (product.min_order_quantity || 1)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="text"
                  value={quantity}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  className="w-16 bg-transparent text-center text-sm font-black focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={product.stock !== undefined && quantity >= product.stock}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full pb-8 sm:pb-12">
                <Button 
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full sm:w-auto sm:flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/20 cursor-pointer flex gap-2 items-center justify-center text-center whitespace-normal px-4"
                >
                  <ShoppingBag size={18} className="shrink-0" />
                  Tambah ke Keranjang
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (user?.is_verified !== true) {
                      toast.error("Akun UMKM Anda belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.");
                      return;
                    }
                    setIsNegotiationOpen(true);
                  }}
                  className="w-full sm:w-auto sm:flex-1 h-12 rounded-xl border-primary/40 text-primary hover:bg-primary/5 font-black text-sm cursor-pointer flex gap-2 items-center justify-center text-center whitespace-normal px-4"
                >
                  <MessageSquare size={18} className="shrink-0" />
                  Ajukan Negosiasi Harga
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-border/30 pt-8 space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between border-b border-border/30 pb-4">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            <span>Ulasan Pembeli ({reviews.length})</span>
          </h3>
          {avgRating && (
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{avgRating} / 5.0</span>
            </div>
          )}
        </div>

        {isLoadingReviews ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase py-4">
            <Loader2 className="animate-spin text-primary" size={16} />
            <span>Memuat Ulasan...</span>
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-xs font-bold text-muted-foreground italic py-2">
            Belum ada ulasan untuk produk ini.
          </p>
        ) : (
          <div className="divide-y divide-border/20">
            {reviews.map((rev) => (
              <div key={rev.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-foreground">{rev.buyer_name}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(rev.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <svg
                        key={idx}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={idx < rev.rating ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-3.5 h-3.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-foreground/80 leading-relaxed mt-1 whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {canReportReview(rev) && (
                  <button
                    onClick={() => {
                      setReportType('REVIEW');
                      setSelectedReview(rev);
                      setIsReportModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider shrink-0 transition-all self-end sm:self-auto cursor-pointer"
                  >
                    <Flag size={10} />
                    Laporkan Ulasan
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Negotiation Modal */}
      {isNegotiationOpen && product && (
        <NegotiationModal
          isOpen={isNegotiationOpen}
          onClose={() => setIsNegotiationOpen(false)}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image_url,
            bulk: `${product.min_order_quantity} ${product.unit_type}`,
            unit: product.unit_type,
            distributor: product.distributor_name || distributorProfile?.organization_name || 'Distributor',
            distributorId: product.distributor_id,
            stock: product.stock
          }}
          umkmId={user?.id || ''}
          umkmName={user?.full_name || user?.email || 'Pembeli UMKM'}
        />
      )}

      {/* Custom Report Modal Overlay */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border/30">
              <div className="flex items-center gap-2 text-rose-500">
                <ShieldAlert size={20} />
                <h3 className="text-base font-black tracking-tight">
                  {reportType === 'PRODUCT' ? 'Laporkan Produk' : 'Laporkan Ulasan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setSelectedReasonOption('');
                  setCustomReasonText('');
                  setSelectedReview(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReportSubmit} className="space-y-4 pt-4">
              <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                {reportType === 'PRODUCT'
                  ? `Mengapa Anda ingin melaporkan produk "${product.name}"? Laporan Anda akan ditinjau oleh Admin.`
                  : `Mengapa Anda ingin melaporkan ulasan dari "${selectedReview?.buyer_name}"?`}
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Pilih Alasan Laporan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedReasonOption}
                  onChange={(e) => setSelectedReasonOption(e.target.value)}
                  disabled={isSubmittingReport}
                  className="w-full h-11 bg-muted/20 border border-border/60 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground cursor-pointer"
                >
                  <option value="">-- Pilih Alasan --</option>
                  {(reportType === 'PRODUCT' ? PRODUCT_REPORT_REASONS : REVIEW_REPORT_REASONS).map((reason) => (
                    <option key={reason} value={reason} className="bg-card text-foreground">{reason}</option>
                  ))}
                </select>
              </div>

              {selectedReasonOption === 'Lainnya' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Detail Alasan Lainnya <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tuliskan alasan lengkap laporan Anda di sini..."
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    disabled={isSubmittingReport}
                    className="w-full bg-muted/20 border border-border/60 rounded-xl p-4 text-xs font-medium outline-none focus:border-primary/40 focus:bg-card transition-all resize-none text-foreground font-sans leading-relaxed"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setSelectedReasonOption('');
                    setCustomReasonText('');
                    setSelectedReview(null);
                  }}
                  disabled={isSubmittingReport}
                  className="h-10 flex-1 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="h-10 flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/10 flex items-center justify-center cursor-pointer"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    'Kirim Laporan'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
