import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  ShoppingBag,
  Truck,
  MessageSquareText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnalyticsCard } from '../../../components/common/AnalyticsCard';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

const RECENT_ORDERS = [
  { id: 'ORD-7721', buyer: 'Warung Barokah', amount: 'Rp 4.200.000', status: 'Pending', time: '2 mins ago' },
  { id: 'ORD-7720', buyer: 'Toko Kelontong Jaya', amount: 'Rp 12.500.000', status: 'Processing', time: '45 mins ago' },
  { id: 'ORD-7719', buyer: 'Minimarket Sejahtera', amount: 'Rp 8.900.000', status: 'Shipped', time: '3 hours ago' },
];

const PENDING_NEGOTIATIONS = [
  { id: 'NEG-102', partner: 'Mitra UMKM Bandung', subject: 'Sugar Bulk Order', discount: '5%', status: 'Waiting' },
  { id: 'NEG-101', partner: 'Retailer Jakarta Central', subject: 'Oil Tier 3 Pricing', discount: '2%', status: 'Offered' },
];

export const DistributorDashboard = () => {
  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Distributor Control</h1>
          <p className="text-muted-foreground font-medium text-lg">Manage your inventory, partners, and logistics in real-time.</p>
        </div>
        <div className="flex gap-4">
           <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20">
              <Package className="mr-2" size={20} />
              Add Product
           </Button>
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              Export Reports
           </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard 
          title="Total Sales (MTD)" 
          value="Rp 1.28B" 
          icon={DollarSign} 
          trend={{ value: 18.4, isUp: true }}
          className="bg-emerald-500/5 border-emerald-500/20"
        />
        <AnalyticsCard 
          title="Active Dealers" 
          value="482" 
          icon={Users} 
          trend={{ value: 5.2, isUp: true }}
          className="bg-blue-500/5 border-blue-500/20"
        />
        <AnalyticsCard 
          title="Pending Shipments" 
          value="24" 
          icon={Truck} 
          trend={{ value: 2.1, isUp: false }}
          className="bg-amber-500/5 border-amber-500/20"
        />
        <AnalyticsCard 
          title="Avg. Margin" 
          value="12.4%" 
          icon={TrendingUp} 
          trend={{ value: 0.8, isUp: true }}
          className="bg-purple-500/5 border-purple-500/20"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-10">
          {/* Order Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black tracking-tight">Recent Incoming Orders</h3>
               <Button variant="link" className="text-primary font-bold">View All Orders</Button>
            </div>
            <div className="grid gap-4">
               {RECENT_ORDERS.map((order) => (
                 <motion.div 
                   key={order.id}
                   whileHover={{ x: 4 }}
                   className="p-4 sm:p-6 bg-card border border-border/50 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/30 transition-all"
                 >
                   <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                      <div className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0",
                        order.status === 'Pending' ? "bg-amber-500/10 text-amber-500" :
                        order.status === 'Processing' ? "bg-blue-500/10 text-blue-500" :
                        "bg-emerald-500/10 text-emerald-500"
                      )}>
                         <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                         <p className="font-black text-sm sm:text-lg leading-tight uppercase tracking-tight truncate">{order.id} • {order.buyer}</p>
                         <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-muted-foreground">{order.time}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs sm:text-sm font-black text-primary">{order.amount}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        order.status === 'Pending' ? "bg-amber-500/20 text-amber-500" :
                        order.status === 'Processing' ? "bg-blue-500/20 text-blue-500" :
                        "bg-emerald-500/20 text-emerald-500"
                      )}>
                        {order.status}
                      </span>
                      <Button size="sm" variant="outline" className="rounded-xl font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100">Process</Button>
                   </div>
                 </motion.div>
               ))}
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-card border border-border/50 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="font-black text-lg sm:text-xl">Inventory Turn Rate</h4>
                <div className="flex gap-2">
                   <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase">Daily</span>
                   <span className="px-3 py-1 bg-muted/40 text-muted-foreground text-xs font-black rounded-lg uppercase">Weekly</span>
                </div>
             </div>
             <div className="h-64 w-full bg-muted/20 rounded-3xl flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-end px-4 sm:px-12 gap-2 sm:gap-6 opacity-20">
                   {[40, 70, 45, 90, 65, 80, 55, 75].map((h, i) => (
                     <div key={i} className="flex-1 bg-primary rounded-t-lg sm:rounded-t-xl" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <p className="text-muted-foreground font-bold relative z-10 text-sm sm:text-base">Analytics Visualization Hooked</p>
             </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-10">
          {/* Active Negotiations */}
          <div className="space-y-6">
             <h3 className="text-2xl font-black tracking-tight">Open Negotiations</h3>
             <div className="grid gap-4">
                {PENDING_NEGOTIATIONS.map((neg) => (
                  <div key={neg.id} className="p-4 sm:p-6 bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-[2rem] space-y-4 shadow-sm">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                              <MessageSquareText size={18} />
                           </div>
                           <div>
                              <p className="font-black text-sm">{neg.partner}</p>
                              <p className="text-xs text-muted-foreground font-medium">{neg.subject}</p>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{neg.status}</span>
                     </div>
                     <div className="flex items-center justify-between bg-black/5 p-4 rounded-2xl">
                        <span className="text-xs font-bold text-muted-foreground">Requesting</span>
                        <span className="text-sm font-black text-primary">-{neg.discount} Discount</span>
                     </div>
                     <div className="flex gap-3">
                        <Button className="flex-1 h-10 rounded-xl bg-primary text-white text-xs font-black">Counter</Button>
                        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-black">Reject</Button>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Quick Tasks */}
          <div className="p-6 sm:p-8 bg-card border border-border/50 rounded-3xl sm:rounded-[2.5rem] space-y-6">
             <h4 className="font-black text-xl">Operational Checklist</h4>
             <div className="space-y-4">
                {[
                  { label: 'Update Stock Levels', completed: true },
                  { label: 'Upload Invoice #PM-102', completed: false },
                  { label: 'Verify KM Retailer', completed: false },
                  { label: 'Export Tax Statement', completed: false }
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                     <div className={cn(
                       "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                       task.completed ? "bg-primary border-primary text-primary-foreground" : "border-border group-hover:border-primary"
                     )}>
                        {task.completed && <CheckCircle2 size={14} />}
                     </div>
                     <span className={cn("text-sm font-bold", task.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                        {task.label}
                     </span>
                  </div>
                ))}
             </div>
             <Button variant="outline" className="w-full h-12 rounded-2xl border-border font-black text-sm uppercase tracking-widest">
                Add Task
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
