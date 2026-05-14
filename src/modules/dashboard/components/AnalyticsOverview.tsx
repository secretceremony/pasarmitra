import * as React from "react";
import { DollarSign, Package, Users, ShieldCheck } from "lucide-react";
import { AnalyticsCard } from "../../../components/common/AnalyticsCard";
import { Surface } from "../../../shared/ui/Surface";

export function AnalyticsOverview() {
  return (
    <div className="space-y-10">
      <h3 className="text-3xl font-black tracking-tight">Ecosystem Health</h3>
      <div className="grid grid-cols-2 gap-8 h-fit">
        <AnalyticsCard 
          title="Revenue Growth" 
          value="+ Rp 42.5M" 
          icon={DollarSign} 
          trend={{ value: 12.5, isUp: true }}
          className="rounded-[3rem] border-none shadow-2xl bg-sidebar/60 p-8"
        />
        <AnalyticsCard 
          title="Active Orders" 
          value="156" 
          icon={Package} 
          trend={{ value: 8.2, isUp: true }}
          className="rounded-[3rem] border-none shadow-2xl bg-sidebar/60 p-8"
        />
        <AnalyticsCard 
          title="Partnerships" 
          value="42" 
          icon={Users} 
          trend={{ value: 4.1, isUp: true }}
          className="rounded-[3rem] border-none shadow-2xl bg-sidebar/60 p-8"
        />
        <Surface 
          intent="none" 
          padding="lg"
          className="rounded-[3rem] border-none shadow-2xl bg-[#1B4332] ring-4 ring-primary/5 flex flex-col justify-center"
        >
          <div className="flex items-center gap-4 text-white">
            <ShieldCheck size={32} className="text-primary" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary">Purchase Class</p>
              <p className="text-2xl font-black">Gold Elite</p>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
