import { vi, describe, test, expect, beforeEach } from 'vitest';
import { profileService } from './profileService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types/auth.types';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((dbInstance: any, path: string, id: string) => ({ id, path })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

// Mock the firebase db client
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    test('successfully retrieves profile when it exists', async () => {
      const mockProfile = {
        email: 'user@example.com',
        full_name: 'John Doe',
        role: UserRole.UMKM,
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'user-123',
        data: () => mockProfile,
      } as any);

      const result = await profileService.getProfile('user-123');
      expect(result).toEqual({ id: 'user-123', ...mockProfile });
      expect(getDoc).toHaveBeenCalled();
    });

    test('throws error when profile does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      await expect(profileService.getProfile('non-existent')).rejects.toThrow(
        'Profil pengguna tidak ditemukan.'
      );
    });

    test('throws error when uid is empty', async () => {
      await expect(profileService.getProfile('')).rejects.toThrow(
        'UID pengguna tidak boleh kosong'
      );
    });
  });

  describe('updateProfile', () => {
    test('successfully updates common and business fields for UMKM', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined as any);

      const updateData = {
        full_name: 'Mitra Sukses',
        phone: '081234567890',
        organization_name: 'Warung Sukses B2B',
        address: 'Jalan Raya 45, Bandung',
        description: 'Toko kelontong grosir terlengkap.'
      };

      await profileService.updateProfile('user-123', UserRole.UMKM, updateData);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          full_name: 'Mitra Sukses',
          phone: '081234567890',
          organization_name: 'Warung Sukses B2B',
          address: 'Jalan Raya 45, Bandung',
          description: 'Toko kelontong grosir terlengkap.',
          updated_at: expect.any(String)
        })
      );
    });

    test('successfully updates Admin profile, keeping only common whitelisted fields', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined as any);

      const updateData = {
        full_name: 'Super Admin',
        phone: '0899999999',
        organization_name: 'Hacker Group', // should be filtered out
        address: 'Private Area',           // should be filtered out
        description: 'Malicious note'       // should be filtered out
      };

      await profileService.updateProfile('admin-123', UserRole.ADMIN, updateData);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          full_name: 'Super Admin',
          phone: '0899999999',
          updated_at: expect.any(String)
        })
      );

      // Verify that business details were not included in Admin payload
      const calledArgs = vi.mocked(updateDoc).mock.calls[0][1];
      expect(calledArgs).not.toHaveProperty('organization_name');
      expect(calledArgs).not.toHaveProperty('address');
      expect(calledArgs).not.toHaveProperty('description');
    });

    test('rejects update if full_name is empty', async () => {
      await expect(
        profileService.updateProfile('user-123', UserRole.UMKM, {
          full_name: '   ',
          phone: '0812345678',
        })
      ).rejects.toThrow('Nama lengkap tidak boleh kosong');
    });

    test('rejects update if phone format is invalid', async () => {
      await expect(
        profileService.updateProfile('user-123', UserRole.UMKM, {
          full_name: 'Test name',
          phone: 'abc12345',
        })
      ).rejects.toThrow('Nomor telepon harus berupa angka antara 8 sampai 15 digit');

      await expect(
        profileService.updateProfile('user-123', UserRole.UMKM, {
          full_name: 'Test name',
          phone: '1234567', // too short
        })
      ).rejects.toThrow('Nomor telepon harus berupa angka antara 8 sampai 15 digit');

      await expect(
        profileService.updateProfile('user-123', UserRole.UMKM, {
          full_name: 'Test name',
          phone: '1234567890123456', // too long (16 chars)
        })
      ).rejects.toThrow('Nomor telepon harus berupa angka antara 8 sampai 15 digit');
    });

    test('rejects update if organization_name is empty for UMKM', async () => {
      await expect(
        profileService.updateProfile('user-123', UserRole.UMKM, {
          full_name: 'Mitra Sukses',
          phone: '081234567890',
          organization_name: '  ',
        })
      ).rejects.toThrow('Nama toko tidak boleh kosong');
    });

    test('rejects update if organization_name is empty for Distributor', async () => {
      await expect(
        profileService.updateProfile('user-123', UserRole.DISTRIBUTOR, {
          full_name: 'Distributor Pro',
          phone: '081234567890',
          organization_name: '',
        })
      ).rejects.toThrow('Nama bisnis tidak boleh kosong');
    });
  });
});
