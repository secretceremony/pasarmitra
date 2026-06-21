import * as React from "react";
import { X, ShieldCheck, ShoppingBag, Store, Flag, ShieldAlert, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/use-auth-store";
import { reviewService, ProductReview } from "../../features/orders/services/reviewService";
import { toast } from "sonner";

const PRODUCT_REPORT_REASONS = [
  "Produk palsu / imitasi",
  "Informasi produk menyesatkan",
  "Harga tidak wajar",
  "Produk ilegal / dilarang",
  "Lainnya"
];

const REVIEW_REPORT_REASONS = [
  "Kasar / tidak pantas",
  "Spam / iklan",
  "Ulasan palsu",
  "Informasi tidak relevan",
  "Lainnya"
];

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any; // Can be ProductSummary or MarketplaceProduct
  onAddToCart: (product: any) => void;
}

export function ProductDetailsModal({ isOpen, onClose, product, onAddToCart }: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [reviews, setReviews] = React.useState<ProductReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = React.useState(false);

  // Report Form States
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [reportType, setReportType] = React.useState<'PRODUCT' | 'REVIEW'>('PRODUCT');
  const [selectedReview, setSelectedReview] = React.useState<ProductReview | null>(null);
  const [selectedReasonOption, setSelectedReasonOption] = React.useState('');
  const [customReasonText, setCustomReasonText] = React.useState('');
  const [isSubmittingReport, setIsSubmittingReport] = React.useState(false);

  const fetchReviews = async () => {
    if (!product?.id) return;
    setIsLoadingReviews(true);
    try {
      const data = await reviewService.getReviewsForProduct(product.id);
      setReviews(data);
    } catch (err) {
      console.error("Gagal memuat ulasan:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && product?.id) {
      fetchReviews();
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  // Unify schema mappings for ProductSummary vs. MarketplaceProduct
  const name = product.name;
  const image = product.image || product.image_url;
  const category = product.category || "Sembako";
  
  const price = typeof product.price === 'object' ? product.price.amount : product.price;
  const unit = typeof product.price === 'object' ? product.price.unit : product.unit;
  
  const distributorName = product.supplier?.name || product.distributor || "Distributor";
  const distributorId = product.supplier?.id || product.distributorId;
  
  const stock = product.inventory?.stock !== undefined ? product.inventory.stock : (product.stock !== undefined ? product.stock : 0);
  const minQty = product.bulk || (product.min_order_quantity ? `${product.min_order_quantity} ${product.unit_type}` : `1 ${unit}`);
  
  const description = product.description || "Minyak goreng, beras, gula pasir, dan bahan kebutuhan pokok berkualitas tinggi langsung dari distributor vetted PasarMitra.";
  const tieredPricing = product.tiered_pricing || [];

  const handleDistributorClick = () => {
    onClose();
    if (distributorId) {
      navigate(`/distributor/${distributorId}`);
    }
  };

  const handleAddClick = () => {
    onClose();
    onAddToCart(product);
  };

  const canReportProduct = user && user.role === 'UMKM';
  const canReportReview = (rev: ProductReview) => {
    if (!user) return false;
    if (user.role === 'UMKM') return true;
    if (user.role === 'DISTRIBUTOR') {
      // Distributor can only report reviews on their own products
      return distributorId === user.id;
    }
    return false;
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
          name,
          distributorId,
          distributorName,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 max-w-4xl w-full mx-4 shadow-2xl relative flex flex-col animate-in fade-in-50 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-muted/40 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Product columns */}
        <div className="flex flex-col md:flex-row gap-8 sm:gap-10">
          {/* Product Image Column */}
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-[380px] rounded-3xl overflow-hidden bg-muted shrink-0 border border-border/40">
            <img src={image} className="w-full h-full object-cover" alt={name} />
          </div>

          {/* Product Info Column */}
          <div className="flex-1 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Category, Distributor, and Report Product */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {category}
                  </span>
                  <button 
                    onClick={handleDistributorClick}
                    className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors cursor-pointer"
                  >
                    <Store size={12} />
                    {distributorName}
                  </button>
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

              {/* Product Title */}
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-foreground">
                {name}
              </h2>

              {/* Price display */}
              <div className="bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Harga Per {unit}</p>
                  <p className="text-3xl font-black text-foreground italic mt-0.5">
                    Rp {price.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-tighter mb-1">Min. Order</p>
                  <p className="text-sm font-black italic">{minQty}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Deskripsi Produk</p>
                <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Stock Level */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  stock > 50 ? "bg-emerald-500" : stock > 0 ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                )} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {stock > 50 ? `Stok Melimpah (${stock} ${unit})` : stock > 0 ? `Stok Terbatas (${stock} ${unit})` : "Stok Habis"}
                </span>
              </div>

              {/* Wholesale Tiered Pricing Table */}
              {tieredPricing.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    Skema Harga Grosir Bertingkat
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {tieredPricing.map((tier: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-3 rounded-xl">
                        <span className="text-xs font-bold text-[#D4AF37]">Beli ≥ {tier.min_quantity} {unit}</span>
                        <span className="text-xs font-black text-foreground italic">Rp {tier.price_per_unit.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Add to Cart Actions */}
            <div className="flex gap-4 pt-4 border-t border-border/30">
              <Button 
                onClick={handleAddClick}
                disabled={stock === 0}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 cursor-pointer flex gap-2 items-center justify-center"
              >
                <ShoppingBag size={20} />
                Tambah ke Keranjang
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-border/30 pt-8 mt-8 w-full">
          <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <span>Ulasan Produk ({reviews.length})</span>
          </h3>

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
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-muted/10 border border-border/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
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
                    <p className="text-xs font-medium text-foreground/80 leading-relaxed mt-1">
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

      </div>

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
                  ? `Mengapa Anda ingin melaporkan produk "${name}"? Laporan Anda akan ditinjau oleh Admin.`
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
