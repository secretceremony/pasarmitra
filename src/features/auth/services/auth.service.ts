import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export const authService = {
  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
    return true;
  },

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  },

  async register(email: string, password: string, metadata?: any) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save metadata to user's profile document in Firestore
    if (metadata) {
      await setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        email: email,
        created_at: new Date().toISOString(),
        ...metadata
      });
    }
    
    return userCredential;
  },

  async logout() {
    await signOut(auth);
  },

  async submitDistributorVerification(distributorId: string, payload: {
    company_name: string;
    nib: string;
    npwp: string;
    business_address: string;
    phone: string;
    warehouse_permit?: string;
    email?: string;
  }) {
    const profileRef = doc(db, 'profiles', distributorId);
    const requestRef = doc(collection(db, 'verification_requests'));

    await runTransaction(db, async (transaction) => {
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists()) {
        throw new Error('Profil distributor tidak ditemukan.');
      }

      const profileData = profileSnap.data();
      const currentStatus = profileData.verification_status;

      // Prevent duplicate pending submissions
      if (currentStatus === 'PENDING_REVIEW' || currentStatus === 'ESCALATED') {
        throw new Error('Anda sudah memiliki pengajuan verifikasi yang sedang ditinjau.');
      }

      const timestamp = serverTimestamp();

      // 1. Update Profile Document
      transaction.update(profileRef, {
        organization_name: payload.company_name,
        address: payload.business_address,
        phone: payload.phone,
        nib: payload.nib,
        npwp: payload.npwp,
        warehouse_permit: payload.warehouse_permit || '',
        nib_url: `https://pasarmitra.com/docs/nib-${distributorId}.pdf`,
        npwp_url: `https://pasarmitra.com/docs/npwp-${distributorId}.pdf`,
        warehouse_permit_url: payload.warehouse_permit ? `https://pasarmitra.com/docs/permit-${distributorId}.pdf` : '',
        is_verified: false,
        verification_status: 'PENDING_REVIEW',
        updated_at: timestamp,
        legal_info: {
          company_name: payload.company_name,
          nib: payload.nib,
          npwp: payload.npwp,
          business_address: payload.business_address,
          phone: payload.phone,
          submitted_at: timestamp
        }
      });

      // 2. Create Verification Request Record
      transaction.set(requestRef, {
        distributor_id: distributorId,
        distributor_name: payload.company_name,
        distributor_email: payload.email || profileData.email || '',
        company_name: payload.company_name,
        nib: payload.nib,
        npwp: payload.npwp,
        business_address: payload.business_address,
        phone: payload.phone,
        status: 'PENDING_REVIEW',
        submitted_at: timestamp,
        updated_at: timestamp
      });
    });
  }
};

