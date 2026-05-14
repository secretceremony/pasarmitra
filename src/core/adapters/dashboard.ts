import { ProductSummary, SupplierSummary, AnalyticsMetric } from '../types/commerce';

/**
 * Adapters convert potentially messy server/external data 
 * into our strict internal Commerce types.
 */

export const dashboardAdapters = {
  /**
   * Adapts raw "Deal" data from a legacy or external API 
   * to our standard ProductSummary interface.
   */
  toProductSummary(raw: any): ProductSummary {
    return {
      id: String(raw.id),
      name: raw.name || 'Unknown Product',
      price: {
        amount: typeof raw.price === 'string' ? parseInt(raw.price.replace(/[^\d]/g, '')) : raw.price,
        currency: 'IDR',
        minOrder: raw.minOrder,
      },
      inventory: {
        stock: raw.stock || 0,
        status: raw.stock > 100 ? 'IN_STOCK' : raw.stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
        unitsLeft: raw.stock,
      },
      supplier: {
        name: raw.distributor,
      },
      image: raw.image,
      discountTag: raw.discount,
    };
  },

  /**
   * Adapts raw Distributor data.
   */
  toSupplierSummary(raw: any): SupplierSummary {
    return {
      id: String(raw.id),
      name: raw.name,
      location: raw.location,
      rating: raw.rating,
      isVerified: !!raw.verified,
      productCount: raw.products,
      reputation: raw.rating >= 4.8 ? 'elite' : raw.rating >= 4.0 ? 'trusted' : 'neutral',
    };
  }
};
