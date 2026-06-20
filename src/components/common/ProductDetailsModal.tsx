import * as React from "react";
import { X, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any; // Can be ProductSummary or MarketplaceProduct
  onAddToCart: (product: any) => void;
}

export function ProductDetailsModal({ isOpen, onClose, product, onAddToCart }: ProductDetailsModalProps) {
  const navigate = useNavigate();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 max-w-4xl w-full mx-4 shadow-2xl relative flex flex-col md:flex-row gap-8 sm:gap-10 animate-in fade-in-50 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-muted/40 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Product Image Column */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-[380px] rounded-3xl overflow-hidden bg-muted shrink-0 border border-border/40">
          <img src={image} className="w-full h-full object-cover" alt={name} />
        </div>

        {/* Product Info Column */}
        <div className="flex-1 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Category and Distributor */}
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
    </div>
  );
}
