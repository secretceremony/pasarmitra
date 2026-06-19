import * as React from "react";
import { Users } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { HOVER_SCALE } from "../../../core/animations";

export function PremiumPromo() {
  return (
    <motion.div {...HOVER_SCALE}>
       <Surface 
          intent="none"
          padding="none"
          className="bg-gradient-to-br from-[#D4AF37]/30 via-[#D4AF37]/10 to-transparent border-2 border-[#D4AF37]/20 rounded-3xl md:rounded-[3.5rem] relative overflow-hidden group shadow-2xl cursor-pointer p-6 md:p-10"
       >
          <div className="relative z-10 space-y-6">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shadow-xl backdrop-blur-md">
               <Users className="w-6 h-6 md:w-8 md:h-8" />
             </div>
             <div className="space-y-2">
                <p className="font-black text-2xl md:text-3xl tracking-tighter text-[#D4AF37]">Premium Partners</p>
                <p className="text-base md:text-lg text-foreground/80 font-medium leading-relaxed max-w-[280px]">
                   Access exclusive pre-market releases from PT. Salim Ivomas.
                </p>
             </div>
             <Button className="bg-[#D4AF37] text-black font-black rounded-2xl hover:bg-[#D4AF37]/90 px-8 md:px-12 h-12 md:h-14 text-sm md:text-lg shadow-xl shadow-[#D4AF37]/20">
               Join Network
             </Button>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-[100px] group-hover:bg-[#D4AF37]/20 transition-all duration-700" />
          <Users className="absolute top-10 right-10 text-[#D4AF37]/5 shrink-0 transform -rotate-12 transition-transform group-hover:rotate-0 duration-700" size={240} />
       </Surface>
    </motion.div>
  );
}
