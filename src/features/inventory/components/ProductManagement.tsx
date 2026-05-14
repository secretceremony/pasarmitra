import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Layers,
  ArrowUpDown,
  History,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { INVENTORY_STATUS_CONFIG } from '../config/inventory-status.config';

// Mock data for initial UI build
const MOCK_PRODUCTS = [
  { 
    id: '1', 
    name: 'Sembako Premium Package A', 
    category: 'Sembako', 
    price: 150000, 
    stock: 1240, 
    min_order: 10,
    status: 'Active',
    unit: 'Box',
    tiers: [
      { min: 10, price: 150000 },
      { min: 50, price: 142000 },
      { min: 100, price: 135000 },
    ]
  },
  { 
    id: '2', 
    name: 'Minyak Goreng Refill 2L (Carton)', 
    category: 'Sembako', 
    price: 384000, 
    stock: 85, 
    min_order: 5,
    status: 'Low Stock',
    unit: 'Carton',
    tiers: [
      { min: 5, price: 384000 },
      { min: 20, price: 370000 },
    ]
  },
  { 
    id: '3', 
    name: 'Beras Pandan Wangi 25kg', 
    category: 'Sembako', 
    price: 345000, 
    stock: 560, 
    min_order: 2,
    status: 'Active',
    unit: 'Sack',
    tiers: [
      { min: 2, price: 345000 },
      { min: 10, price: 330000 },
    ]
  },
];

export const ProductManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Inventory Management</h1>
          <p className="text-muted-foreground font-medium">Add, update and manage your wholesale product catalog.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-16 px-10 rounded-[2rem] bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus size={24} className="mr-2" />
          Add New Product
        </Button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl">
               84
            </div>
            <div>
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total SKUs</p>
               <p className="text-3xl font-black">Active Catalogue</p>
            </div>
         </div>
         <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] flex items-center gap-6 border-l-8 border-l-amber-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-2xl">
               12
            </div>
            <div>
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Low Stock</p>
               <p className="text-3xl font-black text-amber-500">Needs Attention</p>
            </div>
         </div>
         <div className="p-8 bg-[#06110B] border border-primary/20 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black text-2xl">
               <TrendingUp size={32} />
            </div>
            <div>
               <p className="text-sm font-bold text-primary/60 uppercase tracking-widest">Turnover</p>
               <p className="text-3xl font-black text-white">4.2x / Month</p>
            </div>
         </div>
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Search by SKU, name or category..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <Filter size={20} />
            Categories
         </Button>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <ArrowUpDown size={20} />
            Sort
         </Button>
      </div>

      {/* Products Table/Grid */}
      <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse">
               <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Product Details</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Inventory</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Wholesale Pricing</th>
                     <th className="p-8 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                     <th className="p-8 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/30">
                  {MOCK_PRODUCTS.map((product) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-primary/5 transition-colors"
                    >
                       <td className="p-8">
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden">
                                <img src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100`} className="w-full h-full object-cover" />
                             </div>
                             <div>
                                <p className="font-black text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</p>
                                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{product.category} • {product.unit}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-8">
                          <div className="space-y-1">
                             <p className="text-xl font-black">{product.stock} Units</p>
                             <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                                   <div className={cn(
                                     "h-full rounded-full transition-all",
                                     product.stock < 100 ? "bg-amber-500 w-[20%]" : "bg-primary w-[70%]"
                                   )} />
                                </div>
                                <span className={cn("text-[10px] font-black", product.stock < 100 ? "text-amber-500" : "text-primary")}>
                                   {product.stock < 100 ? 'LOW' : 'GOOD'}
                                </span>
                             </div>
                          </div>
                       </td>
                       <td className="p-8">
                          <div className="space-y-3">
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-black">Base: Rp {product.price.toLocaleString()}</span>
                             </div>
                             <div className="flex gap-2">
                                {product.tiers.slice(0, 2).map((tier, i) => (
                                  <div key={i} className="px-3 py-1 bg-primary/10 rounded-lg flex flex-col">
                                     <span className="text-[10px] font-black text-primary uppercase">{tier.min}+ {product.unit}</span>
                                     <span className="text-xs font-black">Rp {tier.price.toLocaleString()}</span>
                                  </div>
                                ))}
                                {product.tiers.length > 2 && (
                                  <div className="px-3 py-1 bg-muted rounded-lg flex items-center justify-center">
                                     <span className="text-[10px] font-black text-muted-foreground">+{product.tiers.length - 2}</span>
                                  </div>
                                )}
                             </div>
                          </div>
                       </td>
                       <td className="p-8">
                          {(() => {
                            const config = INVENTORY_STATUS_CONFIG[product.status as keyof typeof INVENTORY_STATUS_CONFIG] || INVENTORY_STATUS_CONFIG.Unknown;
                            const Icon = config.icon;
                            return (
                              <span className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit",
                                config.colorClass
                              )}>
                                 <Icon size={12} />
                                 {config.label}
                              </span>
                            );
                          })()}
                       </td>
                       <td className="p-8 text-right">
                          <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                             <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border hover:border-primary hover:text-primary">
                                <Edit2 size={18} />
                             </Button>
                             <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border hover:border-rose-500 hover:text-rose-500">
                                <History size={18} />
                             </Button>
                             <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border hover:border-rose-500 hover:text-rose-500">
                                <Trash2 size={18} />
                             </Button>
                          </div>
                       </td>
                    </motion.tr>
                  ))}
               </tbody>
            </table>
         </div>
         <div className="p-10 border-t border-border flex items-center justify-between bg-muted/10">
            <p className="text-sm font-bold text-muted-foreground">Showing 1-10 of 84 products</p>
            <div className="flex gap-2">
               <Button variant="outline" className="h-12 px-6 rounded-xl border-border font-black">Previous</Button>
               <Button variant="outline" className="h-12 px-6 rounded-xl border-border font-black bg-primary text-primary-foreground">1</Button>
               <Button variant="outline" className="h-12 px-6 rounded-xl border-border font-black">2</Button>
               <Button variant="outline" className="h-12 px-6 rounded-xl border-border font-black">Next</Button>
            </div>
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
                 <div className="p-12 border-b border-border flex justify-between items-center">
                    <div>
                       <h2 className="text-3xl font-black tracking-tighter">Add New Product</h2>
                       <p className="text-muted-foreground font-medium">Define your wholesale product and price tiers.</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-muted/40 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                       <X size={24} />
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid md:grid-cols-2 gap-10">
                       <div className="space-y-8">
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Product Name</label>
                             <input type="text" placeholder="e.g. Minyak Goreng Tropical 2L" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Category</label>
                                <select className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none">
                                   <option>Sembako</option>
                                   <option>F&B</option>
                                </select>
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Unit Type</label>
                                <input type="text" placeholder="e.g. Carton" className="w-full h-16 bg-muted/30 border border-border rounded-2xl px-6 font-bold focus:border-primary focus:outline-none" />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-8">
                          <div className="space-y-2 text-center">
                             <div className="w-full h-48 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                                <Plus size={32} className="text-muted-foreground" />
                                <p className="text-sm font-black text-muted-foreground">Upload Product Image</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Pricing Tiers Section */}
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black text-primary underline decoration-4 underline-offset-8">Wholesale Pricing Tiers</h3>
                          <Button variant="outline" className="rounded-xl border-primary/30 text-primary h-12 px-6 font-black uppercase tracking-widest text-[10px]">Add Tier</Button>
                       </div>
                       <div className="grid gap-6">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex gap-6 items-end group p-6 bg-muted/20 border border-border rounded-3xl relative">
                               <div className="flex-1 space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Min. Quantity</label>
                                  <input type="number" placeholder="50" className="w-full h-14 bg-card border border-border rounded-xl px-6 font-bold" />
                               </div>
                               <div className="flex-1 space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Price Per Unit (Rp)</label>
                                  <input type="number" placeholder="140.000" className="w-full h-14 bg-card border border-border rounded-xl px-6 font-bold" />
                               </div>
                               <button className="h-14 w-14 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-500/10">
                                  <Trash2 size={20} />
                               </button>
                               <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-[10px] font-black">{i}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="p-12 border-t border-border bg-muted/10 flex gap-6">
                    <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black text-lg" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                    <Button className="h-16 flex-1 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-2xl shadow-primary/30">Save Product</Button>
                 </div>
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
