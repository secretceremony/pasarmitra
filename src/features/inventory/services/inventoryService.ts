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
  deleteDoc,
  documentId,
  writeBatch
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
  updated_at?: string;
}

export const inventoryService = {
  getProductsByDistributor: async (distributorId: string) => {
    try {
      const qSnap = await getDocs(collection(db, 'products'));
      const products: Product[] = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        const pId = data.distributor_id || data.distributorId || data.seller_id || data.owner_id || data.created_by;
        if (pId === distributorId) {
          products.push({ id: doc.id, ...data } as Product);
        }
      });
      return products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (err) {
      console.error('Error in getProductsByDistributor:', err);
      return [];
    }
  },

  getDistributorProducts: async (distributorId: string) => {
    return inventoryService.getProductsByDistributor(distributorId);
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

    // Collect unique distributor IDs to cross-check their verification status
    const distributorIds = [...new Set(products.map(p => p.distributor_id).filter(Boolean))];

    if (distributorIds.length === 0) {
      return products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    // Firestore 'in' queries support max 30 items per batch
    const verifiedDistributorIds = new Set<string>();
    const batchSize = 30;
    for (let i = 0; i < distributorIds.length; i += batchSize) {
      const batch = distributorIds.slice(i, i + batchSize);
      const profilesSnap = await getDocs(
        query(collection(db, 'profiles'), where(documentId(), 'in', batch))
      );
      profilesSnap.forEach((profileDoc) => {
        const data = profileDoc.data();
        // Only include products from distributors that are verified, active, and not suspended
        if (
          data.is_verified === true &&
          data.is_active !== false &&
          data.is_suspended !== true
        ) {
          verifiedDistributorIds.add(profileDoc.id);
        }
      });
    }

    // Filter out products from invalid distributors
    const validProducts = products.filter(p => verifiedDistributorIds.has(p.distributor_id));

    // Sort in memory to avoid requiring complex composite indexes in Firestore
    return validProducts.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Product;
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
      distributor_id: product.distributor_id,
      distributor_name: distributorName,
      created_by: product.distributor_id,
      owner_id: product.distributor_id,
      seller_id: product.distributor_id,
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
  },

  backfillProductDistributorFields: async (distributorId: string) => {
    try {
      const distRef = doc(db, 'profiles', distributorId);
      const distSnap = await getDoc(distRef);
      if (!distSnap || typeof distSnap.exists !== 'function' || !distSnap.exists()) return;
      const distData = distSnap.data();
      const distributorName = distData.organization_name || distData.business_name || distData.full_name || 'Distributor Sembako Utama';

      const demoProductIds = [
        'demo-product-bimoli',
        'demo-product-pandan-wangi',
        'demo-product-gulaku',
        'demo-product-sariwangi',
        'demo-product-garam-kapal',
        'demo-product-beras',
        'demo-product-gula',
        'demo-product-teh',
        'demo-product-garam'
      ];

      const batch = writeBatch(db);
      let needCommit = false;

      for (const id of demoProductIds) {
        const prodRef = doc(db, 'products', id);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap && typeof prodSnap.exists === 'function' && prodSnap.exists()) {
          const data = prodSnap.data();
          const pId = data.distributor_id || data.distributorId || data.seller_id || data.owner_id;

          if (!pId || pId !== distributorId || !data.distributor_name) {
            batch.update(prodRef, {
              distributor_id: distributorId,
              created_by: distributorId,
              owner_id: distributorId,
              seller_id: distributorId,
              distributor_name: distributorName,
              updated_at: new Date().toISOString()
            });
            needCommit = true;
          }
        }
      }

      if (needCommit) {
        await batch.commit();
        console.log('[inventoryService] Demo product owner fields backfilled successfully.');
      }
    } catch (err) {
      console.error('Failed to backfill product distributor fields:', err);
    }
  }
};
