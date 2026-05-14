import { ProductSummary } from '../../../core/types/commerce';

/**
 * Selectors extract or compute specific insights from data collections.
 * Keeping them pure and separate from hooks allows for easier testing 
 * and reuse in different context providers.
 */

export const dashboardSelectors = {
  /**
   * Filters out deals that are out of stock.
   */
  getAvailableDeals: (deals: ProductSummary[]) => 
    deals.filter(deal => deal.inventory.status !== 'OUT_OF_STOCK'),

  /**
   * Finds the single highest discount deal for a highlight section.
   */
  getHeroDeal: (deals: ProductSummary[]) => {
    if (!deals.length) return null;
    return [...deals].sort((a, b) => {
      const discountA = parseInt(a.discountTag?.replace(/[^\d]/g, '') || '0');
      const discountB = parseInt(b.discountTag?.replace(/[^\d]/g, '') || '0');
      return discountB - discountA;
    })[0];
  },

  /**
   * Calculates total potential savings if buying all featured deals.
   */
  calculateTotalSavings: (deals: ProductSummary[]) => {
    // Logic for complex business calculations would go here
    return 0;
  }
};
