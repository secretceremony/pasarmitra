import * as React from "react";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { FADE_UP } from "../../../core/animations";

export function HeroSection() {
  return (
    <motion.div {...FADE_UP}>
      <Surface intent="none" padding="none" className="relative h-[440px] overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          alt="Marketplace"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06110B] via-[#06110B]/70 to-transparent flex flex-col justify-center px-16">
           <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 w-fit">
                 <CheckCircle2 size={16} className="text-primary" />
                 <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Verified B2B Network</span>
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter leading-[1.1]">
                Grow your business <br />
                <span className="text-primary italic">with trusted</span> partners.
              </h1>
              <p className="text-lg text-white/70 font-medium max-w-lg leading-relaxed">
                The largest ecosystem for verified distributors and retailers in Indonesia. Direct connection, wholesale pricing.
              </p>
              <div className="flex gap-4 pt-4">
                 <Button className="h-16 px-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                    Explore Products
                 </Button>
                 <Button variant="outline" className="h-16 px-12 rounded-2xl bg-white/5 backdrop-blur-md border-white/10 text-white font-black text-xl hover:bg-white/10">
                    Find Distributors
                 </Button>
              </div>
           </div>
        </div>
        
        {/* Flash Deal Overlay */}
        <div className="absolute top-12 right-12 hidden lg:block">
           <Surface intent="elevated" padding="lg" className="w-72 space-y-6">
              <div className="flex justify-between items-center">
                 <div className="p-4 bg-primary/20 rounded-2xl text-primary"><ShoppingBag size={28} /></div>
                 <span className="text-[10px] font-black text-white/40 tracking-widest">FLASH DEAL</span>
              </div>
              <div>
                 <p className="text-white font-black text-lg">Min. Transaction</p>
                 <p className="text-sm text-white/50">Unlock Gold Benefits</p>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-primary w-[75%]" />
              </div>
              <p className="text-right text-sm font-black text-primary">Rp 42.5M / 50M</p>
           </Surface>
        </div>
      </Surface>
    </motion.div>
  );
}
