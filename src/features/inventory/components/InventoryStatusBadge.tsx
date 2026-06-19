import React from 'react';
import { InventoryStatus } from '../config/inventory-status.config';
import { getInventoryStatusMeta } from '../utils/getInventoryStatusMeta';
import { inventoryStatusBadgeVariants } from './inventory-variants';

interface InventoryStatusBadgeProps {
  status: InventoryStatus | string;
  className?: string;
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({ 
  status, 
  className 
}) => {
  const config = getInventoryStatusMeta(status);
  const Icon = config.icon;
  const intent = config.label === 'Unknown' ? 'unknown' : config.type;

  return (
    <span 
      role="status"
      aria-label={`Product status: ${config.label}`}
      className={inventoryStatusBadgeVariants({ intent: intent as any, className })}
    >
       <Icon size={12} aria-hidden="true" />
       {config.label}
    </span>
  );
};
