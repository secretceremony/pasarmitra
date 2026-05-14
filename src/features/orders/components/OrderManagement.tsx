import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  MoreHorizontal, 
  AlertCircle,
  Package,
  FileText,
  MapPin,
  ExternalLink,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

const MOCK_ORDERS = [
  { 
    id: 'PM-98421', 
    buyer: 'Warung Barokah', 
    amount: 'Rp 4.250.000', 
    items: 12, 
    status: 'Pending', 
    date: '12 May, 09:42',
    address: 'Jl. Raya Soreang No. 12, Bandung'
  },
  { 
    id: 'PM-98420', 
    buyer: 'Toko Kelontong Jaya', 
    amount: 'Rp 12.500.000', 
    items: 45, 
    status: 'Processing', 
    date: '12 May, 08:15',
    address: 'Pasar Atas Lt. 2 Blok A, Cimahi'
  },
  { 
    id: 'PM-98419', 
    buyer: 'Minimarket Sejahtera', 
    amount: 'Rp 8.900.000', 
    items: 28, 
    status: 'Shipped', 
    date: '11 May, 16:30',
    address: 'Perumahan Bumi Asri C-14, Bandung'
  },
  { 
    id: 'PM-98418', 
    buyer: 'Koperasi Abadi', 
    amount: 'Rp 24.150.000', 
    items: 112, 
    status: 'Delivered', 
    date: '10 May, 11:20',
    address: 'Kawasan Industri Jababeka 1, Cikarang'
  },
];

export const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('All');
  const TABS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered'];

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Incoming Orders</h1>
          <p className="text-muted-foreground font-medium text-lg">Process fulfillment and track shipments across your partner network.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              Batch Process
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
              <Printer className="mr-2" size={20} />
              Print Invoices
           </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-card border border-border/50 rounded-3xl w-fit">
         {TABS.map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={cn(
               "px-6 py-3 rounded-2xl text-sm font-black transition-all",
               activeTab === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
             )}
           >
             {tab}
           </button>
         ))}
      </div>

      {/* Filtering & Search */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
               type="text" 
               placeholder="Search by Order ID, Buyer or Address..." 
               className="w-full bg-card/60 border border-border/50 focus:border-primary/40 focus:bg-card px-16 h-14 rounded-2xl text-sm transition-all focus:outline-none font-bold"
            />
         </div>
         <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 flex gap-3 font-bold">
            <Filter size={20} />
            Filter
         </Button>
      </div>

      {/* Orders List */}
      <div className="grid gap-6">
         {MOCK_ORDERS.map((order, i) => (
           <motion.div
             key={order.id}
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: i * 0.05 }}
             className="bg-card border border-border/50 rounded-[2.5rem] p-10 flex flex-col lg:flex-row lg:items-center gap-10 shadow-xl group hover:border-primary/30 transition-all"
           >
              {/* Order Info */}
              <div className="flex items-center gap-8 lg:w-1/4">
                 <div className={cn(
                   "w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-3xl font-black shadow-inner",
                   order.status === 'Pending' ? "bg-amber-500/10 text-amber-500" :
                   order.status === 'Processing' ? "bg-blue-500/10 text-blue-500" :
                   order.status === 'Shipped' ? "bg-emerald-500/10 text-emerald-500" :
                   "bg-muted/40 text-muted-foreground"
                 )}>
                    {order.id.slice(-2)}
                 </div>
                 <div>
                    <p className="text-2xl font-black tracking-tight">{order.id}</p>
                    <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest">{order.date}</p>
                 </div>
              </div>

              {/* Buyer & Address */}
              <div className="flex-1 space-y-4">
                 <div className="flex items-center gap-3">
                    <p className="text-xl font-black group-hover:text-primary transition-colors">{order.buyer}</p>
                    <span className="text-xs font-black text-muted-foreground bg-muted/40 px-3 py-1 rounded-full uppercase tracking-tighter">{order.items} Items</span>
                 </div>
                 <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin size={16} className="text-primary/60" />
                    <p className="text-sm font-bold truncate max-w-sm">{order.address}</p>
                 </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center justify-between lg:w-1/3 gap-10">
                 <div className="text-right">
                    <p className="text-2xl font-black">{order.amount}</p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Paid • Credit Term</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <span className={cn(
                      "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                      order.status === 'Pending' ? "bg-amber-500/20 text-amber-500" :
                      order.status === 'Processing' ? "bg-blue-500/20 text-blue-500" :
                      order.status === 'Shipped' ? "bg-emerald-500/20 text-emerald-500" :
                      "bg-muted/20 text-muted-foreground"
                    )}>
                       {order.status}
                    </span>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border group-hover:border-primary group-hover:text-primary transition-all">
                       <ChevronRight size={24} />
                    </Button>
                 </div>
              </div>
           </motion.div>
         ))}
      </div>

      {/* Empty State / Pagination Logic Placeholder */}
      <div className="flex justify-center pt-8">
         <Button variant="outline" className="h-14 px-12 rounded-2xl border-border font-black text-muted-foreground hover:text-primary">
            Load More Orders
         </Button>
      </div>
    </div>
  );
};
