import * as React from "react";
import { LucideIcon } from "lucide-react";

interface AuthHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function AuthHeader({ title, description, icon: Icon }: AuthHeaderProps) {
  return (
    <div className="mb-8">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
        <Icon size={24} />
      </div>
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
