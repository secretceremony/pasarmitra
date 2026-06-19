/**
 * Formats the number of units left in inventory.
 * 
 * @param units The number of units remaining
 * @returns A formatted string (e.g., "1 unit left", "4 units left", "Out of stock")
 */
export function formatInventoryUnitsLeft(units: number | undefined | null): string {
  if (units === undefined || units === null || units <= 0) {
    return 'Out of stock';
  }
  
  if (units === 1) {
    return '1 unit left';
  }
  
  return `${units.toLocaleString()} units left`;
}
