import React, { useState, useEffect } from 'react';
import { X, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { negotiationService } from '../services/negotiationService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  umkmId: string;
  umkmName: string;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  isOpen,
  onClose,
  product,
  umkmId,
  umkmName
}) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState<number>(1);
  const [requestedPrice, setRequestedPrice] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize product properties
  const productId = product?.id || '';
  const productName = product?.name || '';
  const originalPrice = product?.price || 0;
  const productImage = product?.image || product?.image_url || '';
  const distributorName = product?.distributor || product?.distributor_name || 'Distributor';
  
  // Extract MOQ & Stock
  let moq = 1;
  if (product?.min_order_quantity !== undefined) {
    moq = product.min_order_quantity;
  } else if (product?.bulk) {
    const match = product.bulk.match(/\d+/);
    if (match) {
      moq = parseInt(match[0], 10);
    }
  }

  const stock = product?.stock !== undefined ? product.stock : 999;
  const unit = product?.unit || product?.unit_type || 'Unit';

  useEffect(() => {
    if (product) {
      setQuantity(moq);
      setRequestedPrice(originalPrice);
      setNote('');
      setError(null);
    }
  }, [product, moq, originalPrice]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedPrice <= 0) {
      setError('Harga penawaran harus lebih besar dari Rp 0.');
      return;
    }
    if (requestedPrice >= originalPrice) {
      setError('Harga penawaran harus lebih rendah dari harga asli produk.');
      return;
    }
    if (quantity < moq) {
      setError(`Jumlah barang minimal adalah ${moq} ${unit}.`);
      return;
    }
    if (quantity > stock) {
      setError(`Stok tidak mencukupi. Tersedia: ${stock} ${unit}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const neg = await negotiationService.createNegotiation(
        umkmId,
        umkmName,
        productId,
        requestedPrice,
        quantity,
        note
      );
      toast.success('Pengajuan negosiasi berhasil dikirim.');
      onClose();
      navigate(`/umkm/negosiasi-harga?id=${neg.id}`);
    } catch (err: any) {
      console.error('Error creating negotiation:', err);
      setError(err.message || 'Gagal memulai negosiasi harga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-card border border-border/50 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4 sm:pb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-lg sm:rounded-xl flex items-center justify-center font-black shrink-0">
                <TrendingDown size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">Ajukan Negosiasi Harga</h3>
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 sm:mt-1">
                  B2B Direct Quotation Console
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:p-3 bg-muted/40 rounded-lg sm:rounded-xl hover:bg-muted transition-all"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-6 sm:mt-8 w-full max-w-full">
            {/* Product Card Info */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-muted/20 border border-border/50 rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                {productImage ? (
                  <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    P
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-wider">{distributorName}</p>
                <h4 className="text-base sm:text-lg font-black truncate text-foreground mt-0.5">{productName}</h4>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1.5 sm:gap-4 mt-2 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase">
                  <span className="col-span-2 sm:col-span-1">Harga Asli: Rp {originalPrice.toLocaleString('id-ID')}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Stok: {stock} {unit}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>MOQ: {moq} {unit}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl text-sm font-bold border border-rose-500/20">
                {error}
              </div>
            )}

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Jumlah Barang ({unit})
                </label>
                <input
                  type="number"
                  required
                  min={moq}
                  max={stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder={`${moq}`}
                  className="w-full h-12 sm:h-16 bg-muted/30 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 font-bold focus:border-primary focus:outline-none text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Harga Penawaran Unit (Rp)
                </label>
                <input
                  type="number"
                  required
                  max={originalPrice - 1}
                  value={requestedPrice}
                  onChange={(e) => setRequestedPrice(Number(e.target.value))}
                  placeholder={`Maks Rp ${(originalPrice - 1).toLocaleString('id-ID')}`}
                  className="w-full h-12 sm:h-16 bg-muted/30 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 font-bold focus:border-primary focus:outline-none text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">
                Catatan Awal (Opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Berikan alasan penawaran Anda (misal: untuk kemitraan jangka panjang, pemesanan volume berkala, dll)"
                rows={3}
                className="w-full bg-muted/30 border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 font-bold focus:border-primary focus:outline-none resize-none text-xs sm:text-sm"
              />
            </div>

            {requestedPrice > 0 && requestedPrice < originalPrice * 0.7 && (
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/20 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 animate-pulse text-amber-500" />
                <span>Peringatan: Harga penawaran di bawah 70% dari harga asli. Penawaran yang terlalu rendah berisiko tinggi ditolak oleh distributor.</span>
              </div>
            )}

            {/* Calculations preview */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-2xl sm:rounded-3xl text-white w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest">
                    Estimasi Total
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight">
                    Rp {(requestedPrice * quantity).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] font-bold text-white/50 uppercase mt-1">
                    Sebelumnya: Rp {(originalPrice * quantity).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="sm:text-right space-y-1">
                  <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest">
                    Margin Penurunan
                  </p>
                  <p className="text-lg sm:text-xl font-black text-emerald-400">
                    -{(originalPrice > 0 ? ((originalPrice - requestedPrice) / originalPrice) * 100 : 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-bold text-white/50 uppercase mt-1">
                    Hemat Rp {((originalPrice - requestedPrice) * quantity).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl border-border font-black text-xs sm:text-sm uppercase tracking-wider"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-primary/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Penawaran'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
