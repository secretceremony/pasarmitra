import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { FADE_UP } from "../../../core/animations";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <motion.div {...FADE_UP}>
      <Surface intent="none" padding="none" className="relative h-[320px] sm:h-[380px] md:h-[440px] overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          alt="Marketplace"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06110B] via-[#06110B]/70 to-transparent flex flex-col justify-center px-6 md:px-16">
           <div className="max-w-2xl space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 w-fit">
                 <CheckCircle2 size={12} className="text-primary" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Verified B2B Network</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter leading-[1.1]">
                Grow your business <br />
                <span className="text-primary italic">with trusted</span> partners.
              </h1>
              <p className="text-xs sm:text-sm md:text-lg text-white/70 font-medium max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-none">
                The largest ecosystem for verified distributors and retailers in Indonesia. Direct connection, wholesale pricing.
              </p>
              <div className="flex flex-wrap gap-2 md:gap-4 pt-2 md:pt-4">
                 <Button 
                   onClick={() => navigate('/marketplace')}
                   className="h-12 md:h-16 px-6 md:px-12 rounded-xl md:rounded-2xl bg-primary text-primary-foreground font-black text-sm md:text-xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform cursor-pointer"
                 >
                    Explore Products
                 </Button>
                 <Button 
                   variant="outline" 
                   onClick={() => navigate('/marketplace')}
                   className="h-12 md:h-16 px-6 md:px-12 rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-md border-white/10 text-white font-black text-sm md:text-xl hover:bg-white/10 cursor-pointer"
                 >
                    Find Distributors
                 </Button>
              </div>
           </div>
        </div>
      </Surface>
    </motion.div>
  );
}

