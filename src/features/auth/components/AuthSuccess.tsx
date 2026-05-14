import * as React from "react";
import { Mail } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface AuthSuccessProps {
  title: string;
  message: React.ReactNode;
  onAction: () => void;
  actionLabel: string;
}

export function AuthSuccess({ title, message, onAction, actionLabel }: AuthSuccessProps) {
  return (
    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-3 text-emerald-600 font-bold mb-2">
        <Mail size={20} />
        {title}
      </div>
      <div className="text-sm text-emerald-600/80">
        {message}
      </div>
      <Button variant="outline" className="w-full mt-6 hover:bg-emerald-500/5 transition-colors" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
