import React from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Button } from '../../../components/ui/button';
import { AnalyticsCard } from '../../../components/common/AnalyticsCard';

const SALES_DATA = [
  { name: 'Jan', value: 420 },
  { name: 'Feb', value: 380 },
  { name: 'Mar', value: 512 },
  { name: 'Apr', value: 440 },
  { name: 'May', value: 620 },
  { name: 'Jun', value: 580 },
];

const CATEGORY_DATA = [
  { name: 'Sembako', value: 65, color: '#22c55e' },
  { name: 'F&B', value: 20, color: '#3b82f6' },
  { name: 'Other', value: 15, color: '#f59e0b' },
];

export const SalesAnalytics = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Sales & Network Intelligence</h1>
          <p className="text-muted-foreground font-medium text-lg">Real-time data insights into your distribution ecosystem.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/40 font-black">
              <Calendar className="mr-2" size={20} />
              Last 30 Days
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
              <Download className="mr-2" size={20} />
              Export PDF
           </Button>
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <AnalyticsCard 
            title="Net Revenue" 
            value="Rp 12.8B" 
            icon={DollarSign} 
            trend={{ value: 12.4, isUp: true }}
            className="p-10 bg-card border-none shadow-2xl rounded-[3rem]"
         />
         <AnalyticsCard 
            title="Order Velocity" 
            value="14.2 / hr" 
            icon={Activity} 
            trend={{ value: 2.1, isUp: true }}
            className="p-10 bg-card border-none shadow-2xl rounded-[3rem]"
         />
         <AnalyticsCard 
            title="Retention Rate" 
            value="98.2%" 
            icon={Users} 
            trend={{ value: 0.5, isUp: true }}
            className="p-10 bg-card border-none shadow-2xl rounded-[3rem]"
         />
      </div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-card border border-border/50 rounded-[3.5rem] p-12 shadow-2xl space-y-10">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black tracking-tight">Revenue Trajectory</h3>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-primary" />
                     <span className="text-xs font-bold text-muted-foreground">Current Period</span>
                  </div>
               </div>
            </div>
            
            <div className="h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SALES_DATA}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 900 }} 
                      dy={20}
                    />
                    <YAxis 
                      hide
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#22c55e' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#22c55e" 
                      strokeWidth={6}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-[#06110B] border border-primary/20 rounded-[3.5rem] p-12 shadow-2xl space-y-10">
            <h3 className="text-2xl font-black tracking-tight text-white">Product Mix</h3>
            <div className="h-[300px] w-full flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CATEGORY_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={15}
                      dataKey="value"
                      stroke="none"
                    >
                      {CATEGORY_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="space-y-6">
               {CATEGORY_DATA.map((cat) => (
                 <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                       <span className="text-sm font-black text-white/70">{cat.name}</span>
                    </div>
                    <span className="text-sm font-black text-white">{cat.value}%</span>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Bottom Insights Row */}
      <div className="grid lg:grid-cols-2 gap-8">
         <div className="p-10 bg-card border border-border/50 rounded-[3rem] shadow-xl space-y-8">
            <h4 className="text-xl font-black tracking-tight">Top Performing Partners</h4>
            <div className="space-y-6">
               {[
                 { name: 'Warung Barokah', grow: '+24%', vol: 'Rp 1.2B' },
                 { name: 'Koperasi Abadi', grow: '+18%', vol: 'Rp 2.4B' },
                 { name: 'Minimarket Sejahtera', grow: '+12%', vol: 'Rp 850M' }
               ].map((partner, i) => (
                 <div key={i} className="flex items-center justify-between p-6 bg-muted/20 rounded-3xl group hover:bg-primary/5 transition-all transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          {partner.name[0]}
                       </div>
                       <p className="font-black text-lg">{partner.name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black">{partner.vol}</p>
                       <p className="text-xs font-bold text-emerald-500">{partner.grow} ROI</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="p-10 bg-primary/5 border border-primary/20 rounded-[3rem] shadow-xl space-y-8 relative overflow-hidden">
            <div className="relative z-10 space-y-6">
               <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                  <TrendingUp size={28} />
               </div>
               <div>
                  <h4 className="text-3xl font-black tracking-tighter">Inventory Forecast</h4>
                  <p className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] mt-1">Based on Network Velocity</p>
               </div>
               <p className="text-lg font-medium leading-relaxed max-w-md text-foreground/80">
                 Expected stockout for <span className="text-primary font-black">Minyak Goreng 2L</span> in 4 days. Recommended restock order: 450 Units.
               </p>
               <Button className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black shadow-2xl shadow-primary/30">
                  Draft Restock Order
               </Button>
            </div>
            <BarChart3 className="absolute -bottom-10 -right-10 text-primary/5 w-80 h-80 transform -rotate-12" />
         </div>
      </div>
    </div>
  );
};
