import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { FADE_UP } from "../../../core/animations";

interface HeroSectionProps {
  onViewSuppliers?: () => void;
}

export function HeroSection({ onViewSuppliers }: HeroSectionProps) {
  const navigate = useNavigate();

  const handleBrowseCatalog = () => {
    const el = document.getElementById("marketplace-toolbar");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 440, behavior: "smooth" });
    }
  };

  const handleViewVerifiedSellers = () => {
    if (onViewSuppliers) {
      onViewSuppliers();
      return;
    }
    navigate("/umkm/distributors");
  };

  return (
    <motion.div {...FADE_UP}>
      <Surface 
        intent="none" 
        padding="none" 
        className="relative w-full overflow-hidden rounded-[2rem] group flex flex-col justify-center min-h-[460px] sm:min-h-[360px] md:min-h-[400px] lg:min-h-[440px]"
      >
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 rounded-[2rem]"
          alt="Marketplace"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06110B] via-[#06110B]/75 to-transparent rounded-[2rem]" />
        
        <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-12 sm:py-10 md:px-16 md:py-12 max-w-2xl gap-3 md:gap-4 w-full">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 w-fit">
             <CheckCircle2 size={12} className="text-primary" />
             <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">JARINGAN B2B TERVERIFIKASI</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1]">
            Kembangkan Bisnismu <br />
            <span className="text-primary italic">bersama mitra</span> terpercaya.
          </h1>
          
          <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium max-w-lg leading-relaxed">
            Temukan distributor terverifikasi untuk kebutuhan usaha Anda. Terhubung langsung, bandingkan penawaran, dan dapatkan harga grosir terbaik.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2 md:pt-3 w-full">
             <Button 
               onClick={handleBrowseCatalog}
               className="h-11 md:h-13 px-5 md:px-8 rounded-xl bg-primary text-primary-foreground font-black text-xs md:text-sm shadow-2xl shadow-primary/20 hover:scale-105 transition-transform cursor-pointer w-full sm:w-auto justify-center"
             >
                Jelajahi Produk
             </Button>
             <Button 
               variant="outline" 
               onClick={handleViewVerifiedSellers}
               className="h-11 md:h-13 px-5 md:px-8 rounded-xl bg-white/5 backdrop-blur-md border-white/10 text-white font-black text-xs md:text-sm hover:bg-white/10 cursor-pointer w-full sm:w-auto justify-center"
             >
                Cari Distributor
             </Button>
          </div>
        </div>
      </Surface>
    </motion.div>
  );
}
