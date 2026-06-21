import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface ProductReview {
  id?: string;
  order_id: string;
  product_id: string;
  distributor_id: string;
  buyer_id: string;
  buyer_name: string;
  rating: number;
  comment: string;
  is_hidden?: boolean;
  status: 'visible' | 'hidden' | 'reported' | 'removed';
  created_at: string;
  updated_at: string;
}

export const reviewService = {
  // Fetch active reviews for a product
  getReviewsForProduct: async (productId: string): Promise<ProductReview[]> => {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('product_id', '==', productId)
      );
      const querySnapshot = await getDocs(q);
      const list: ProductReview[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.is_hidden !== true && data.status !== 'removed' && data.status !== 'hidden') {
          list.push({ id: docSnap.id, ...data } as ProductReview);
        }
      });
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } catch (err) {
      console.error('Error in getReviewsForProduct:', err);
      return [];
    }
  },

  // Fetch reviews for a specific order
  getReviewsForOrder: async (orderId: string): Promise<ProductReview[]> => {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('order_id', '==', orderId)
      );
      const querySnapshot = await getDocs(q);
      const list: ProductReview[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ProductReview);
      });
      return list;
    } catch (err) {
      console.error('Error in getReviewsForOrder:', err);
      return [];
    }
  },

  // Create a product review
  createReview: async (reviewData: Omit<ProductReview, 'id' | 'status' | 'is_hidden' | 'created_at' | 'updated_at'>): Promise<ProductReview> => {
    const timestamp = new Date().toISOString();
    const newReview: ProductReview = {
      ...reviewData,
      status: 'visible',
      is_hidden: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    const docRef = await addDoc(collection(db, 'reviews'), newReview);

    // Send notification to the distributor
    try {
      let productName = 'Produk Anda';
      const prodSnap = await getDoc(doc(db, 'products', reviewData.product_id));
      if (prodSnap.exists()) {
        productName = prodSnap.data().name || 'Produk Anda';
      }

      await addDoc(collection(db, 'notifications'), {
        user_id: reviewData.distributor_id,
        title: 'Ulasan Baru Diterima',
        message: `Pembeli ${reviewData.buyer_name} memberikan ulasan Bintang ${reviewData.rating} untuk produk ${productName}.`,
        type: 'info',
        is_read: false,
        created_at: timestamp
      });
    } catch (e) {
      console.error('Error creating review notification for distributor:', e);
    }

    return { ...newReview, id: docRef.id };
  },

  // Check if target was already reported by the user with the same reason
  hasAlreadyReported: async (targetId: string, reportedByEmail: string, reason: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'moderation_items'),
        where('targetId', '==', targetId),
        where('reportedBy', '==', reportedByEmail),
        where('reason', '==', reason)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (err) {
      console.error('Error checking duplicate report:', err);
      return false;
    }
  },

  // Report a product
  reportProduct: async (
    productId: string, 
    productName: string, 
    distributorId: string, 
    distributorName: string, 
    reason: string, 
    reportedByEmail: string
  ) => {
    const isDuplicate = await reviewService.hasAlreadyReported(productId, reportedByEmail, reason);
    if (isDuplicate) {
      throw new Error('Anda sudah melaporkan item ini.');
    }

    const report = {
      title: productName,
      author: distributorName || 'Distributor',
      targetType: 'PRODUCT',
      targetId: productId,
      status: 'PENDING_MODERATION',
      reason: reason,
      severity: 'MEDIUM',
      reportedBy: reportedByEmail,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleDateString('id-ID')
    };

    await addDoc(collection(db, 'moderation_items'), report);
  },

  // Report a review
  reportReview: async (
    reviewId: string,
    rating: number,
    comment: string,
    buyerName: string,
    reason: string,
    reportedByEmail: string
  ) => {
    const isDuplicate = await reviewService.hasAlreadyReported(reviewId, reportedByEmail, reason);
    if (isDuplicate) {
      throw new Error('Anda sudah melaporkan ulasan ini.');
    }

    const report = {
      title: `Ulasan Bintang ${rating} oleh ${buyerName}`,
      author: buyerName || 'UMKM Buyer',
      targetType: 'REVIEW',
      targetId: reviewId,
      status: 'PENDING_MODERATION',
      reason: reason,
      content: comment,
      severity: 'MEDIUM',
      reportedBy: reportedByEmail,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleDateString('id-ID')
    };

    await addDoc(collection(db, 'moderation_items'), report);
  }
};
