import React from 'react';
import { formatInventoryUnitsLeft } from '../utils/inventoryFormatters';
import { stockIndicatorVariants, stockTextVariants } from './inventory-variants';

interface StockIndicatorProps {
  unitsLeft: number;
  lowStockThreshold?: number;
}

export const StockIndicator: React.FC<StockIndicatorProps> = ({ 
  unitsLeft, 
  lowStockThreshold = 100 
}) => {
  const stockLevel = unitsLeft <= 0 ? 'out' : unitsLeft < lowStockThreshold ? 'low' : 'good';
  
  return (
    <div 
      className="space-y-1" 
      role="group" 
      aria-label={`Inventory level: ${formatInventoryUnitsLeft(unitsLeft)}`}
    >
       <p className="text-xl font-black" aria-hidden="true">{formatInventoryUnitsLeft(unitsLeft)}</p>
       <div className="flex items-center gap-2">
          <div 
            className="h-1.5 w-24 bg-border rounded-full overflow-hidden" 
            role="progressbar" 
            aria-valuenow={unitsLeft} 
            aria-valuemin={0} 
            aria-valuemax={Math.max(unitsLeft, 1000)}
          >
             <div className={stockIndicatorVariants({ stockLevel })} />
          </div>
          <span className={stockTextVariants({ stockLevel })} aria-hidden="true">
             {stockLevel.toUpperCase()}
          </span>
       </div>
    </div>
  );
};
