import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

export function AuthInput({ label, icon: Icon, className, ...props }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          {...props}
          className={cn(
            "flex h-12 w-full rounded-xl border border-input bg-background px-11 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all",
            className
          )}
        />
      </div>
    </div>
  );
}
