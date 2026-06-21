import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UserProfile, UserRole } from '../types/auth.types';

export const profileService = {
  /**
   * Fetches a user profile document from Firestore.
   */
  async getProfile(uid: string): Promise<UserProfile> {
    if (!uid) {
      throw new Error('UID pengguna tidak boleh kosong');
    }
    const docRef = doc(db, 'profiles', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Profil pengguna tidak ditemukan.');
    }
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  },

  /**
   * Updates a user profile in Firestore.
   * Restricts updates to a whitelisted set of safe editable fields.
   */
  async updateProfile(
    uid: string,
    role: UserRole,
    data: {
      full_name?: string;
      phone?: string;
      organization_name?: string;
      address?: string;
      description?: string;
      business_district?: string;
    }
  ): Promise<void> {
    if (!uid) {
      throw new Error('UID pengguna tidak boleh kosong');
    }

    // Common validations
    if (!data.full_name?.trim()) {
      throw new Error('Nama lengkap tidak boleh kosong');
    }
    if (data.phone && !/^\d{8,15}$/.test(data.phone.trim())) {
      throw new Error('Nomor telepon harus berupa angka antara 8 sampai 15 digit');
    }

    const timestamp = new Date().toISOString();
    
    // Construct safe whitelisted payload
    const updatePayload: Record<string, any> = {
      full_name: data.full_name.trim(),
      phone: data.phone?.trim() || '',
      updated_at: timestamp,
    };

    // Role-specific whitelisting and validations
    if (role === UserRole.UMKM || role === UserRole.DISTRIBUTOR) {
      if (!data.organization_name?.trim()) {
        throw new Error(role === UserRole.UMKM ? 'Nama toko tidak boleh kosong' : 'Nama bisnis tidak boleh kosong');
      }
      updatePayload.organization_name = data.organization_name.trim();
      updatePayload.address = data.address?.trim() || '';
      updatePayload.description = data.description?.trim() || '';
      updatePayload.business_district = data.business_district?.trim() || '';
    }

    const docRef = doc(db, 'profiles', uid);
    await updateDoc(docRef, updatePayload);
  }
};
