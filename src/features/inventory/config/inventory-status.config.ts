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
}

export const INVENTORY_STATUS_CONFIG: Record<InventoryStatus, InventoryStatusConfig> = {
  Active: {
    label: 'Active',
    icon: CheckCircle2,
    type: 'success',
  },
  'Low Stock': {
    label: 'Low Stock',
    icon: AlertTriangle,
    type: 'warning',
  },
  'Out of Stock': {
    label: 'Out of Stock',
    icon: XCircle,
    type: 'error',
  },
  Draft: {
    label: 'Draft',
    icon: FileText,
    type: 'neutral',
  },
  Unknown: {
    label: 'Unknown',
    icon: AlertTriangle,
    type: 'neutral',
  },
};
