import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText,
  LucideIcon 
} from 'lucide-react';

export type InventoryStatus = 'Active' | 'Low Stock' | 'Out of Stock' | 'Draft' | 'Unknown';

export interface InventoryStatusConfig {
  label: string;
  icon: LucideIcon;
  type: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  colorClass: string;
}

export const INVENTORY_STATUS_CONFIG: Record<InventoryStatus, InventoryStatusConfig> = {
  Active: {
    label: 'Active',
    icon: CheckCircle2,
    type: 'success',
    colorClass: 'bg-emerald-500/10 text-emerald-500',
  },
  'Low Stock': {
    label: 'Low Stock',
    icon: AlertTriangle,
    type: 'warning',
    colorClass: 'bg-amber-500/10 text-amber-500',
  },
  'Out of Stock': {
    label: 'Out of Stock',
    icon: XCircle,
    type: 'error',
    colorClass: 'bg-rose-500/10 text-rose-500',
  },
  Draft: {
    label: 'Draft',
    icon: FileText,
    type: 'neutral',
    colorClass: 'bg-slate-500/10 text-slate-500',
  },
  Unknown: {
    label: 'Unknown',
    icon: AlertTriangle,
    type: 'neutral',
    colorClass: 'bg-muted text-muted-foreground',
  },
};
