import React, { useState, useEffect } from 'react';
import { X, TrendingDown, Loader2 } from 'lucide-react';
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
      await negotiationService.createNegotiation(
        umkmId,
        umkmName,
        productId,
        requestedPrice,
        quantity,
        note
      );
      toast.success('Pengajuan negosiasi berhasil dikirim.');
      onClose();
      navigate('/umkm/negosiasi-harga');
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
          className="relative w-full max-w-2xl bg-card border border-border/50 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                <TrendingDown size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Ajukan Negosiasi Harga</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  B2B Direct Quotation Console
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-muted/40 rounded-xl hover:bg-muted transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {/* Product Card Info */}
            <div className="flex gap-6 p-6 bg-muted/20 border border-border/50 rounded-3xl">
              <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                {productImage ? (
                  <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    P
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-primary uppercase tracking-wider">{distributorName}</p>
                <h4 className="text-lg font-black truncate text-foreground mt-0.5">{productName}</h4>
                <div className="flex gap-4 mt-2 text-xs font-bold text-muted-foreground uppercase">
                  <span>Harga Asli: Rp {originalPrice.toLocaleString('id-ID')}</span>
                  <span>•</span>
                  <span>Stok: {stock} {unit}</span>
                  <span>•</span>
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
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
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
                  className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Harga Penawaran Unit (Rp)
                </label>
                <input
                  type="number"
                  required
                  max={originalPrice - 1}
                  value={requestedPrice}
                  onChange={(e) => setRequestedPrice(Number(e.target.value))}
                  placeholder={`Maks Rp ${(originalPrice - 1).toLocaleString('id-ID')}`}
                  className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Catatan Awal (Opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Berikan alasan penawaran Anda (misal: untuk kemitraan jangka panjang, pemesanan volume berkala, dll)"
                rows={3}
                className="w-full bg-muted/30 border border-border rounded-2xl p-6 font-bold focus:border-primary focus:outline-none resize-none text-sm"
              />
            </div>

            {/* Calculations preview */}
            <div className="p-6 bg-gradient-to-br from-[#06110B] to-[#122A1E] border border-primary/20 rounded-3xl text-white">
              <div className="flex justify-between items-center text-xs font-black text-primary uppercase tracking-widest mb-4">
                <span>Estimasi Total</span>
                <span>Margin Penurunan</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black tracking-tight">
                    Rp {(requestedPrice * quantity).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] font-bold text-white/50 uppercase mt-1">
                    Sebelumnya: Rp {(originalPrice * quantity).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-400">
                    -{(originalPrice > 0 ? ((originalPrice - requestedPrice) / originalPrice) * 100 : 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-bold text-white/50 uppercase mt-1">
                    Hemat Rp {((originalPrice - requestedPrice) * quantity).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-14 rounded-2xl border-border font-black text-sm uppercase tracking-wider"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider shadow-xl shadow-primary/20"
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
