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
  moderation_status?: string;
  distributor_name?: string;
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

  getActiveProducts: async () => {
    const q = query(
      collection(db, 'products'),
      where('is_active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    // Sort in memory to avoid requiring complex composite indexes in Firestore
    products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return products;
  },

  createProduct: async (product: Omit<Product, 'id' | 'created_at'>) => {
    let distributorName = 'Distributor';
    let isVerified = false;
    try {
      const distSnap = await getDoc(doc(db, 'profiles', product.distributor_id));
      if (distSnap.exists()) {
        const distData = distSnap.data();
        distributorName = distData.organization_name || distData.business_name || distData.full_name || 'Distributor';
        isVerified = distData.is_verified || false;
      }
    } catch (e) {
      console.error('Error fetching distributor profile for product creation:', e);
    }

    if (!isVerified) {
      throw new Error('Distributor belum terverifikasi secara legal dan tidak dapat menambahkan produk.');
    }

    const newProduct = {
      ...product,
      is_active: false, // Inactive by default until approved
      moderation_status: 'PENDING',
      distributor_name: distributorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save to products
    const docRef = await addDoc(collection(db, 'products'), newProduct);
    
    // Save to moderation_items
    const modItem = {
      type: 'PRODUCT',
      targetType: 'PRODUCT',
      targetId: docRef.id,
      productId: docRef.id,
      title: product.name,
      author: distributorName,
      distributor_id: product.distributor_id,
      status: 'pending',
      reason: 'Persetujuan Produk Baru',
      // Store as ISO string; display formatting happens in the UI layer via formatDateTime
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image: product.image_url || null,
    };
    
    await addDoc(collection(db, 'moderation_items'), modItem);
    
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

