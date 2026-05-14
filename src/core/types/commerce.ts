export type CurrencyCode = 'IDR';

export interface Price {
  amount: number;
  currency: CurrencyCode;
  minOrder?: string;
  unit?: string;
}

export interface Inventory {
  stock: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRE_ORDER';
  unitsLeft?: number;
}

export interface SupplierSummary {
  id: string;
  name: string;
  location: string;
  rating: number;
  isVerified: boolean;
  productCount?: string;
  reputation: 'elite' | 'trusted' | 'neutral' | 'risky';
}

export interface ProductSummary {
  id: string;
  name: string;
  price: Price;
  inventory: Inventory;
  supplier: Partial<SupplierSummary>;
  image: string;
  discountTag?: string;
}

export interface AnalyticsTrend {
  value: number;
  isUp: boolean;
}

export interface AnalyticsMetric {
  title: string;
  value: string;
  iconName: string; // Storing string name to decouple from library in types
  trend?: AnalyticsTrend;
  variant?: 'default' | 'highlight';
}
