export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviewCount?: number;
  bulk: string;
  unit: string;
  distributor: string;
  distributorId: string;
  stock?: number;
}
