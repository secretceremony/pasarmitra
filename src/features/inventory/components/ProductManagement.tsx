import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  TrendingUp, 
  ArrowUpDown,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { StockIndicator } from './StockIndicator';
import { inventoryService, Product } from '../services/inventoryService';
import { useAuthStore } from '../../../store/use-auth-store';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const ProductManagement = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Sembako');
  const [unitType, setUnitType] = useState('Box');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minOrder, setMinOrder] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState('');
  const [tiers, setTiers] = useState<{ min_quantity: number; price_per_unit: number }[]>([]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await inventoryService.getDistributorProducts(user.id);
      setProducts(data);
    } catch (err) {
      console.error("Gagal memuat produk:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  const handleAddTier = () => {
    setTiers([...tiers, { min_quantity: 10, price_per_unit: price || 10000 }]);
  };

  const handleTierChange = (index: number, field: 'min_quantity' | 'price_per_unit', value: number) => {
    const updated = [...tiers];
    updated[index][field] = value;
    setTiers(updated);
  };

  const handleRemoveTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.is_verified) {
      toast.error("Akun Anda belum terverifikasi secara legal. Silakan lengkapi berkas legalitas usaha Anda.");
      return;
    }
    try {
      const newProduct = await inventoryService.createProduct({
        name,
        category,
        description: 'Tidak ada deskripsi yang disediakan.',
        price,
        stock,
        min_order_quantity: minOrder,
        unit_type: unitType,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100',
        tiered_pricing: tiers,
        distributor_id: user.id,
        is_active: true,
      });
      setProducts([newProduct, ...products]);
      setIsAddModalOpen(false);
      // Reset form
      setName('');
      setCategory('Sembako');
      setUnitType('Box');
      setPrice(0);
      setStock(0);
      setMinOrder(1);
      setImageUrl('');
      setTiers([]);
      toast.success("Produk baru berhasil ditambahkan dan diajukan untuk verifikasi moderasi.");
    } catch (err: any) {
      console.error("Gagal menambahkan produk:", err);
      toast.error(err.message || "Gagal menambahkan produk.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    try {
      await inventoryService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Gagal menghapus produk:", err);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock < 100).length;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Manajemen Inventaris</h1>
          <p className="text-muted-foreground font-medium text-lg">Tambah, perbarui, dan kelola katalog produk grosir Anda.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          disabled={!user?.is_verified}
          className="h-16 px-10 rounded-[2rem] bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          title={!user?.is_verified ? 'Lengkapi verifikasi legalitas usaha Anda untuk menambah produk' : 'Tambah produk baru'}
        >
          <Plus size={24} className="mr-2" />
          Tambah Produk Baru
        </Button>
      </div>

      {/* Alert Banner for Unverified Distributors */}
      {!user?.is_verified && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-amber-800">Akun Belum Terverifikasi</h3>
              <p className="text-sm font-semibold text-amber-700/80 leading-relaxed mt-0.5">
                Anda harus melengkapi portofolio dokumen legalitas usaha Anda sebelum dapat mempublikasikan produk di PasarMitra.
              </p>
            </div>
          </div>
          <Link to="/distributor/legal-docs">
            <Button className="h-12 px-6 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 whitespace-nowrap">
              Lengkapi Dokumen
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl">
               {products.length}
            </div>
            <div>
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total SKU</p>
               <p className="text-3xl font-black">Katalog Aktif</p>
            </div>
         </div>
         <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex items-center gap-6 border-l-8 border-l-amber-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-2xl">
               {lowStockCount}
            </div>
            <div>
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Stok Menipis</p>
               <p className="text-3xl font-black text-amber-500">Perlu Perhatian</p>
            </div>
         </div>
         <div className="p-8 bg-[#06110B] border border-primary/20 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black text-2xl">
               <TrendingUp size={32} />
            </div>
            <div>
               <p className="text-sm font-bold text-primary/60 uppercase tracking-widest">Perputaran</p>
               <p className="text-3xl font-black text-white">4.2x / Bulan</p>
            </div>
         </div>
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Cari berdasarkan nama atau kategori..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <Filter size={20} />
            Kategori
         </Button>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <ArrowUpDown size={20} />
            Urutkan
         </Button>
      </div>

      {/* Products Table/Grid */}
      <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse">
               <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Detail Produk</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Inventaris</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Harga Grosir</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                     <th className="p-8 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/30">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-bold">
                        Memuat produk...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-bold">
                        Produk tidak ditemukan di katalog.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <motion.tr 
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-primary/5 transition-colors"
                      >
                         <td className="p-8">
                            <div className="flex items-center gap-6">
                               <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden">
                                  <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                               </div>
                               <div>
                                  <p className="font-black text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</p>
                                  <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{product.category} • {product.unit_type}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <StockIndicator unitsLeft={product.stock} />
                         </td>
                         <td className="p-8">
                            <div className="space-y-3">
                               <div className="flex items-center gap-3">
                                  <span className="text-sm font-black">Dasar: Rp {product.price.toLocaleString()}</span>
                               </div>
                               <div className="flex gap-2">
                                  {(product.tiered_pricing || []).slice(0, 2).map((tier, i) => (
                                    <div key={i} className="px-3 py-1 bg-primary/10 rounded-lg flex flex-col">
                                       <span className="text-[10px] font-black text-primary uppercase">{tier.min_quantity}+ {product.unit_type}</span>
                                       <span className="text-xs font-black">Rp {tier.price_per_unit.toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {(product.tiered_pricing || []).length > 2 && (
                                    <div className="px-3 py-1 bg-muted rounded-lg flex items-center justify-center">
                                       <span className="text-[10px] font-black text-muted-foreground">+{(product.tiered_pricing || []).length - 2}</span>
                                    </div>
                                  )}
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <InventoryStatusBadge status={product.stock > 100 ? 'Active' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'} />
                         </td>
                         <td className="p-8 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                               <Button 
                                 variant="outline" 
                                 size="icon" 
                                 className="h-12 w-12 rounded-xl border-border hover:border-rose-500 hover:text-rose-500"
                                 onClick={() => handleDelete(product.id)}
                               >
                                  <Trash2 size={18} />
                               </Button>
                            </div>
                         </td>
                      </motion.tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
         <div className="p-10 border-t border-border flex items-center justify-between bg-muted/10">
            <p className="text-sm font-bold text-muted-foreground">Menampilkan {filteredProducts.length} dari {products.length} produk</p>
         </div>
      </div>

      {/* Simplified Add Modal Layer */}
      <AnimatePresence>
         {isAddModalOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center p-6"
           >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setIsAddModalOpen(false)} />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden"
              >
                 <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                    <div className="p-12 border-b border-border flex justify-between items-center">
                       <div>
                          <h2 className="text-3xl font-black tracking-tighter">Tambah Produk Baru</h2>
                          <p className="text-muted-foreground font-medium">Tentukan produk grosir dan tingkatan harga Anda.</p>
                       </div>
                       <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-4 bg-muted/40 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                          <X size={24} />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                       {/* Basic Info */}
                       <div className="grid md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Nama Produk</label>
                                <input required type="text" placeholder="mis. Minyak Goreng Tropical 2L" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={name} onChange={e => setName(e.target.value)} />
                             </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Kategori</label>
                                   <select className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={category} onChange={e => setCategory(e.target.value)}>
                                      <option>Sembako</option>
                                      <option>F&B</option>
                                      <option>Camilan</option>
                                      <option>Kebersihan</option>
                                   </select>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Tipe Satuan</label>
                                   <input required type="text" placeholder="mis. Karton" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={unitType} onChange={e => setUnitType(e.target.value)} />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-8">
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Harga Dasar (Rp)</label>
                                   <input required type="number" placeholder="150000" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={price || ''} onChange={e => setPrice(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Stok Awal</label>
                                   <input required type="number" placeholder="100" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={stock || ''} onChange={e => setStock(Number(e.target.value))} />
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Min. Jml Pesanan</label>
                                   <input required type="number" placeholder="10" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={minOrder || ''} onChange={e => setMinOrder(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">URL Gambar (Opsional)</label>
                                   <input type="text" placeholder="https://..." className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Pricing Tiers Section */}
                       <div className="space-y-8">
                          <div className="flex items-center justify-between">
                             <h3 className="text-2xl font-black text-primary underline decoration-4 underline-offset-8">Tingkatan Harga Grosir</h3>
                             <Button type="button" onClick={handleAddTier} variant="outline" className="rounded-xl border-primary/30 text-primary h-12 px-6 font-black uppercase tracking-widest text-[10px]">Tambah Tingkat</Button>
                          </div>
                          <div className="grid gap-6">
                             {tiers.map((tier, index) => (
                               <div key={index} className="flex gap-6 items-end group p-6 bg-muted/20 border border-border rounded-3xl relative">
                                  <div className="flex-1 space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Min. Jumlah</label>
                                     <input required type="number" placeholder="50" className="w-full h-14 bg-card border border-border rounded-xl px-6 font-bold" value={tier.min_quantity} onChange={e => handleTierChange(index, 'min_quantity', Number(e.target.value))} />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Harga Per Unit (Rp)</label>
                                     <input required type="number" placeholder="140000" className="w-full h-14 bg-card border border-border rounded-xl px-6 font-bold" value={tier.price_per_unit} onChange={e => handleTierChange(index, 'price_per_unit', Number(e.target.value))} />
                                  </div>
                                  <button type="button" onClick={() => handleRemoveTier(index)} className="h-14 w-14 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-500/10">
                                     <Trash2 size={20} />
                                  </button>
                                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-[10px] font-black">{index + 1}</div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="p-12 border-t border-border bg-muted/10 flex gap-6">
                       <Button type="button" variant="ghost" className="h-16 flex-1 rounded-2xl font-black text-lg" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                       <Button type="submit" className="h-16 flex-1 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-2xl shadow-primary/30">Simpan Produk</Button>
                    </div>
                 </form>
              </motion.div>
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
