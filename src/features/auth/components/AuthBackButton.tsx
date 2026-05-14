import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AuthBackButtonProps {
  to: string;
  label: string;
}

export function AuthBackButton({ to, label }: AuthBackButtonProps) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors group">
      <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
      {label}
    </Link>
  );
}
