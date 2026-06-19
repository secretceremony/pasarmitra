import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface TieredPrice {
  min_quantity: number;
  price_per_unit: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  min_order_quantity: number;
  unit_type: string;
  image_url: string;
  tiered_pricing: TieredPrice[];
  distributor_id: string;
  is_active: boolean;
  created_at: string;
}

export const inventoryService = {
  getDistributorProducts: async (distributorId: string) => {
    const q = query(
      collection(db, 'products'),
      where('distributor_id', '==', distributorId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    return products;
  },

  createProduct: async (product: Omit<Product, 'id' | 'created_at'>) => {
    const newProduct = {
      ...product,
      created_at: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'products'), newProduct);
    return { id: docRef.id, ...newProduct } as Product;
  },

  updateProduct: async (id: string, updates: Partial<Product>) => {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, updates);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Product not found');
    }
    return { id: snap.id, ...snap.data() } as Product;
  },

  deleteProduct: async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  }
};

