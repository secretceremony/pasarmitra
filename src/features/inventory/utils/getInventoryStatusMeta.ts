import { INVENTORY_STATUS_CONFIG, InventoryStatus, InventoryStatusConfig } from '../config/inventory-status.config';

/**
 * Resolves an inventory status string to its corresponding metadata configuration.
 * Provides a safe fallback to the 'Unknown' status if the input is unrecognized.
 * 
 * @param status The status string to resolve
 * @returns The configuration object for the status
 */
export function getInventoryStatusMeta(status: string | undefined | null): InventoryStatusConfig {
  if (!status) return INVENTORY_STATUS_CONFIG.Unknown;
  
  // Check if the status is a valid key in our config
  if (status in INVENTORY_STATUS_CONFIG) {
    return INVENTORY_STATUS_CONFIG[status as InventoryStatus];
  }
  
  // Fallback for unrecognized statuses
  return INVENTORY_STATUS_CONFIG.Unknown;
}
