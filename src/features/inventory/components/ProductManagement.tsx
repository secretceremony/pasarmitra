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
  AlertCircle,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { StockIndicator } from './StockIndicator';
import { inventoryService, Product } from '../services/inventoryService';
import { useAuthStore } from '../../../store/use-auth-store';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Pagination } from '../../../components/common/Pagination';

export const ProductManagement = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editProductId = queryParams.get('edit');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

      // Run backfill database migration for demo products once per session
      const sessionKey = `PM_PRODUCT_OWNER_BACKFILL_DONE_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        await inventoryService.backfillProductDistributorFields(user.id);
        sessionStorage.setItem(sessionKey, 'true');
      }

      const data = await inventoryService.getProductsByDistributor(user.id);
      setProducts(data);

      // Debug logs
      if (import.meta.env.DEV) {
        console.log('[ProductManagement] distributorId:', user.id);
        console.log('[ProductManagement] products found:', data.length);
      }
    } catch (err) {
      console.error("Gagal memuat produk:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  useEffect(() => {
    if (editProductId && products.length > 0) {
      const target = products.find(p => p.id === editProductId);
      if (target) {
        handleEditClick(target);
      }
    }
  }, [editProductId, products]);

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setName('');
    setCategory('Sembako');
    setUnitType('Box');
    setPrice(0);
    setStock(0);
    setMinOrder(1);
    setImageUrl('');
    setTiers([]);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setUnitType(product.unit_type);
    setPrice(product.price);
    setStock(product.stock);
    setMinOrder(product.min_order_quantity);
    setImageUrl(product.image_url || '');
    setTiers(product.tiered_pricing || []);
    setIsAddModalOpen(true);
  };

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
      if (editingProduct) {
        const updated = await inventoryService.updateProduct(editingProduct.id, {
          name,
          category,
          price,
          stock,
          min_order_quantity: minOrder,
          unit_type: unitType,
          image_url: imageUrl || '/assets/fallback-product.png',
          tiered_pricing: tiers,
          updated_at: new Date().toISOString()
        });
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
        toast.success("Produk berhasil diperbarui.");
      } else {
        const newProduct = await inventoryService.createProduct({
          name,
          category,
          description: 'Tidak ada deskripsi yang disediakan.',
          price,
          stock,
          min_order_quantity: minOrder,
          unit_type: unitType,
          image_url: imageUrl || '/assets/fallback-product.png',
          tiered_pricing: tiers,
          distributor_id: user.id,
          is_active: true,
        });
        setProducts([newProduct, ...products]);
        toast.success("Produk baru berhasil ditambahkan dan diajukan untuk verifikasi.");
      }
      handleCloseModal();
    } catch (err: any) {
      console.error("Gagal menyimpan produk:", err);
      toast.error(err.message || "Gagal menyimpan produk.");
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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const lowStockCount = products.filter(p => p.stock < 100).length;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Inventaris</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Manajemen Inventaris</h1>
          <p className="text-muted-foreground font-medium text-xs sm:text-sm">Perbarui dan kelola katalog produk grosir Anda.</p>
        </div>
        {/* Tambah Produk Baru disabled as per business policy (Distributor cannot add new items) */}
      </div>

      {/* Alert Banner for Unverified Distributors */}
      {!user?.is_verified && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-amber-800">Akun Belum Terverifikasi</h3>
              <p className="text-xs font-semibold text-amber-700/80 leading-relaxed mt-0.5">
                Anda harus melengkapi portofolio dokumen legalitas usaha Anda sebelum dapat mempublikasikan produk di PasarMitra.
              </p>
            </div>
          </div>
          <Link to="/distributor/legal-docs">
            <Button className="h-9 px-4 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 whitespace-nowrap text-xs">
              Lengkapi Dokumen
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="p-4 bg-card border border-border/50 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
               {products.length}
            </div>
            <div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total SKU</p>
               <p className="text-lg font-extrabold">Katalog Aktif</p>
            </div>
         </div>
         <div className="p-4 bg-card border border-border/50 rounded-xl flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-lg">
               {lowStockCount}
            </div>
            <div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stok Menipis</p>
               <p className="text-lg font-extrabold text-amber-500">Perlu Perhatian</p>
            </div>
         </div>
         <div className="p-4 bg-[#06110B] border border-primary/20 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xl">
               <TrendingUp size={22} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Perputaran</p>
               <p className="text-lg font-extrabold text-white">4.2x / Bulan</p>
            </div>
         </div>
      </div>

      {/* Filtering & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
         <div className="relative w-full sm:flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
            <input 
               type="text" 
               placeholder="Cari berdasarkan nama atau kategori..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card pl-10 pr-4 h-10 rounded-lg text-xs transition-all focus:outline-none font-semibold"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="h-10 px-4 rounded-lg border-border bg-card/40 flex gap-2 font-bold text-xs flex-1 sm:flex-initial justify-center">
               <Filter size={16} />
               Kategori
            </Button>
            <Button variant="outline" className="h-10 px-4 rounded-lg border-border bg-card/40 flex gap-2 font-bold text-xs flex-1 sm:flex-initial justify-center">
               <ArrowUpDown size={16} />
               Urutkan
            </Button>
         </div>
      </div>

      {/* Products Table/Grid */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-md">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[850px]">
               <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                     <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Detail Produk</th>
                     <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Inventaris</th>
                     <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Harga Grosir</th>
                     <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                     <th className="p-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Aksi</th>
                  </tr>
               </thead>
                <tbody className="divide-y divide-border/30">
                   {isLoading ? (
                     <tr>
                       <td colSpan={5} className="p-6 text-center text-muted-foreground font-bold text-sm">
                         Memuat produk...
                       </td>
                     </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold text-sm space-y-1">
                          <p>Belum ada produk.</p>
                          <p className="text-xs text-muted-foreground/75 font-normal">
                            Tambahkan produk pertama Anda untuk mulai tampil di marketplace setelah moderasi admin.
                          </p>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground font-bold text-sm">
                          Produk tidak ditemukan di katalog.
                        </td>
                      </tr>
                    ) : (
                     paginatedProducts.map((product) => (
                       <motion.tr 
                         key={product.id}
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="group hover:bg-primary/5 transition-colors"
                       >
                          <td className="p-4">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                                   <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                                </div>
                                <div>
                                   <p className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{product.name}</p>
                                   <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">{product.category} • {product.unit_type}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-4">
                             <StockIndicator unitsLeft={product.stock} />
                          </td>
                          <td className="p-4">
                             <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                   <span className="text-xs font-bold">Dasar: Rp {product.price.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-1.5">
                                   {(product.tiered_pricing || []).slice(0, 2).map((tier, i) => (
                                     <div key={i} className="px-2 py-0.5 bg-primary/10 rounded flex flex-col">
                                        <span className="text-[9px] font-bold text-primary uppercase">{tier.min_quantity}+ {product.unit_type}</span>
                                        <span className="text-[11px] font-bold">Rp {tier.price_per_unit.toLocaleString()}</span>
                                     </div>
                                   ))}
                                   {(product.tiered_pricing || []).length > 2 && (
                                     <div className="px-2 py-0.5 bg-muted rounded flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-muted-foreground">+{(product.tiered_pricing || []).length - 2}</span>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </td>
                          <td className="p-4">
                             <InventoryStatusBadge status={product.stock > 100 ? 'Active' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'} />
                          </td>
                           <td className="p-4 text-right">
                              <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-2 md:group-hover:translate-x-0">
                                 <Button 
                                   variant="outline" 
                                   size="icon" 
                                   className="h-8 w-8 rounded-lg border-border hover:border-primary hover:text-primary"
                                   onClick={() => handleEditClick(product)}
                                 >
                                    <Edit size={14} />
                                 </Button>
                                 <Button 
                                   variant="outline" 
                                   size="icon" 
                                   className="h-8 w-8 rounded-lg border-border hover:border-rose-500 hover:text-rose-500"
                                   onClick={() => handleDelete(product.id)}
                                 >
                                    <Trash2 size={14} />
                                 </Button>
                              </div>
                           </td>
                       </motion.tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
          {filteredProducts.length > 0 && (
             <div className="px-4 py-2 border-t border-border bg-muted/10">
                <Pagination
                   currentPage={currentPage}
                   totalPages={totalPages}
                   onPageChange={setCurrentPage}
                   totalItems={filteredProducts.length}
                   itemsPerPage={itemsPerPage}
                />
             </div>
          )}
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
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={handleCloseModal} />              <motion.div 
                 initial={{ scale: 0.95, y: 15 }}
                 animate={{ scale: 1, y: 0 }}
                 className="relative bg-card border border-border w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-xl flex flex-col overflow-hidden"
               >
                  <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                     <div className="p-5 md:p-6 border-b border-border flex justify-between items-center">
                        <div>
                           <h2 className="text-lg md:text-xl font-bold tracking-tight">
                              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                           </h2>
                           <p className="text-muted-foreground text-xs font-medium">Tentukan produk grosir dan tingkatan harga Anda.</p>
                        </div>
                        <button type="button" onClick={handleCloseModal} className="p-2 bg-muted/40 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                           <X size={18} />
                        </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-5">
                           <div className="space-y-4">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Nama Produk</label>
                                 <input required type="text" placeholder="mis. Minyak Goreng Tropical 2L" className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={name} onChange={e => setName(e.target.value)} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Kategori</label>
                                    <select className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={category} onChange={e => setCategory(e.target.value)}>
                                       <option>Sembako</option>
                                       <option>F&B</option>
                                       <option>Camilan</option>
                                       <option>Kebersihan</option>
                                    </select>
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Tipe Satuan</label>
                                    <input required type="text" placeholder="mis. Karton" className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={unitType} onChange={e => setUnitType(e.target.value)} />
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Harga Dasar (Rp)</label>
                                    <input required type="number" placeholder="150000" className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={price || ''} onChange={e => setPrice(Number(e.target.value))} />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Stok Awal</label>
                                    <input required type="number" placeholder="100" className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={stock || ''} onChange={e => setStock(Number(e.target.value))} />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Min. Jml Pesanan</label>
                                    <input required type="number" placeholder="10" className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={minOrder || ''} onChange={e => setMinOrder(Number(e.target.value))} />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">URL Gambar (Opsional)</label>
                                    <input type="text" placeholder="https://..." className="w-full h-10 bg-muted/30 border border-border rounded-lg px-4 text-xs font-semibold focus:border-primary focus:outline-none" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Pricing Tiers Section */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <h3 className="text-base font-bold text-primary underline decoration-2 underline-offset-4">Tingkatan Harga Grosir</h3>
                              <Button type="button" onClick={handleAddTier} variant="outline" className="rounded-lg border-primary/30 text-primary h-8 px-4 font-bold uppercase tracking-wider text-[9px]">Tambah Tingkat</Button>
                           </div>
                           <div className="grid gap-3">
                              {tiers.map((tier, index) => (
                                <div key={index} className="flex gap-4 items-end group p-4 bg-muted/20 border border-border rounded-xl relative">
                                   <div className="flex-1 space-y-1">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Min. Jumlah</label>
                                      <input required type="number" placeholder="50" className="w-full h-9 bg-card border border-border rounded-lg px-3 text-xs font-semibold" value={tier.min_quantity} onChange={e => handleTierChange(index, 'min_quantity', Number(e.target.value))} />
                                   </div>
                                   <div className="flex-1 space-y-1">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Harga Per Unit (Rp)</label>
                                      <input required type="number" placeholder="140000" className="w-full h-9 bg-card border border-border rounded-lg px-3 text-xs font-semibold" value={tier.price_per_unit} onChange={e => handleTierChange(index, 'price_per_unit', Number(e.target.value))} />
                                   </div>
                                   <button type="button" onClick={() => handleRemoveTier(index)} className="h-9 w-9 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10">
                                      <Trash2 size={16} />
                                   </button>
                                   <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-[9px] font-black">{index + 1}</div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="p-5 md:p-6 border-t border-border bg-muted/10 flex gap-4">
                        <Button type="button" variant="ghost" className="h-10 flex-1 rounded-lg font-bold text-sm" onClick={handleCloseModal}>Batal</Button>
                        <Button type="submit" className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/30">
                           {editingProduct ? 'Perbarui Produk' : 'Simpan Produk'}
                        </Button>
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
