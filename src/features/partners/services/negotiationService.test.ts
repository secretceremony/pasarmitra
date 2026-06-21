import { vi, describe, test, expect, beforeEach } from 'vitest';
import { negotiationService } from './negotiationService';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { createAuditLog } from '../../admin/services/adminService';

const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn((dbInstance: any, path: string, id?: string) => ({ id: id || 'mock-doc-id', path })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  writeBatch: vi.fn(() => ({
    update: mockUpdate,
    set: mockSet,
    commit: mockCommit
  }))
}));

// Mock the firebase db client
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

// Mock the admin service audit log
vi.mock('../../admin/services/adminService', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('negotiationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNegotiation', () => {
    test('successfully creates a negotiation when inputs are valid', async () => {
      const mockProduct = {
        distributor_id: 'dist-123',
        distributor_name: 'Super Distributor',
        name: 'Minyak Goreng 2L',
        price: 35000,
        stock: 50,
        min_order_quantity: 5,
        is_active: true
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProduct
      } as any);

      // Mock check for existing active negotiation room
      vi.mocked(getDocs).mockResolvedValueOnce({
        forEach: (callback: any) => {}
      } as any);

      vi.mocked(addDoc)
        .mockResolvedValueOnce({ id: 'neg-123' } as any) // addDoc for negotiation
        .mockResolvedValueOnce({ id: 'msg-123' } as any); // addDoc for message

      const result = await negotiationService.createNegotiation(
        'umkm-123',
        'Warung Budi',
        'prod-123',
        32000,
        10,
        'Minta diskon grosir'
      );

      expect(result.id).toBe('neg-123');
      expect(result.requested_unit_price).toBe(32000);
      expect(result.quantity).toBe(10);
      expect(result.status).toBe('waiting_distributor');
      expect(addDoc).toHaveBeenCalledTimes(3);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        event: 'NEGOTIATION_CREATED',
        status: 'SUCCESS'
      }));
    });

    test('throws error if quantity is less than MOQ', async () => {
      const mockProduct = {
        distributor_id: 'dist-123',
        name: 'Minyak Goreng 2L',
        price: 35000,
        stock: 50,
        min_order_quantity: 10,
        is_active: true
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProduct
      } as any);

      await expect(negotiationService.createNegotiation(
        'umkm-123',
        'Warung Budi',
        'prod-123',
        32000,
        5, // less than MOQ of 10
        ''
      )).rejects.toThrow('Jumlah pesanan minimal adalah 10.');
    });

    test('throws error if quantity exceeds stock', async () => {
      const mockProduct = {
        distributor_id: 'dist-123',
        name: 'Minyak Goreng 2L',
        price: 35000,
        stock: 15,
        min_order_quantity: 5,
        is_active: true
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProduct
      } as any);

      await expect(negotiationService.createNegotiation(
        'umkm-123',
        'Warung Budi',
        'prod-123',
        32000,
        20, // exceeds stock of 15
        ''
      )).rejects.toThrow('Stok tidak mencukupi. Stok tersedia: 15.');
    });

    test('throws error if product is inactive', async () => {
      const mockProduct = {
        distributor_id: 'dist-123',
        name: 'Minyak Goreng 2L',
        price: 35000,
        stock: 50,
        min_order_quantity: 5,
        is_active: false
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProduct
      } as any);

      await expect(negotiationService.createNegotiation(
        'umkm-123',
        'Warung Budi',
        'prod-123',
        32000,
        10,
        ''
      )).rejects.toThrow('Produk sedang tidak aktif.');
    });

    test('throws error if negotiating with own business', async () => {
      const mockProduct = {
        distributor_id: 'dist-123', // same as umkmId below
        name: 'Minyak Goreng 2L',
        price: 35000,
        stock: 50,
        min_order_quantity: 5,
        is_active: true
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProduct
      } as any);

      await expect(negotiationService.createNegotiation(
        'dist-123', // same as distributorId
        'Warung Budi',
        'prod-123',
        32000,
        10,
        ''
      )).rejects.toThrow('Anda tidak dapat melakukan negosiasi dengan bisnis Anda sendiri.');
    });
  });

  describe('counterOffer', () => {
    test('successfully counters from distributor', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'pending',
        product_id: 'prod-123',
        negotiation_code: 'NEG-12345'
      };

      const mockProduct = {
        stock: 100,
        is_active: true
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any) // neg snap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockProduct } as any); // product snap

      // Mock query messages snap (for expiring pending offers)
      vi.mocked(getDocs).mockResolvedValueOnce({
        forEach: (callback: any) => {}
      } as any);

      await negotiationService.counterOffer(
        'neg-123',
        'dist-123',
        'DISTRIBUTOR',
        'Super Distributor',
        33000,
        15,
        'Tawaran balik distributor'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'waiting_buyer',
          requested_unit_price: 33000,
          quantity: 15
        })
      );
      expect(mockSet).toHaveBeenCalled();
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        event: 'NEGOTIATION_COUNTERED',
        user: 'Super Distributor'
      }));
    });

    test('throws error if non-participant tries to counter', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'pending',
        product_id: 'prod-123'
      };

      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any);

      await expect(negotiationService.counterOffer(
        'neg-123',
        'stranger-456',
        'DISTRIBUTOR',
        'Stranger Distributor',
        33000,
        15,
        ''
      )).rejects.toThrow('Akses ditolak.');
    });

    test('throws error if status is already in terminal state', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'rejected',
        product_id: 'prod-123'
      };

      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any);

      await expect(negotiationService.counterOffer(
        'neg-123',
        'dist-123',
        'DISTRIBUTOR',
        'Super Distributor',
        33000,
        15,
        ''
      )).rejects.toThrow('Negosiasi sudah selesai atau dibatalkan.');
    });
  });

  describe('acceptOffer', () => {
    test('successfully accepts an offer', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'waiting_buyer',
        product_id: 'prod-123',
        quantity: 10,
        negotiation_code: 'NEG-12345'
      };

      const mockMsg = {
        offer: {
          unit_price: 32000,
          quantity: 10,
          status: 'pending',
          offer_by: 'DISTRIBUTOR'
        }
      };

      const mockProduct = {
        stock: 50,
        is_active: true
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any) // neg snap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockMsg } as any) // msg snap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockProduct } as any); // product snap

      await negotiationService.acceptOffer('neg-123', 'msg-123', 'umkm-123', 'UMKM', 'Warung Budi');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'accepted',
          agreed_unit_price: 32000
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        event: 'NEGOTIATION_ACCEPTED'
      }));
    });
  });

  describe('rejectOffer', () => {
    test('successfully rejects a negotiation', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'waiting_distributor',
        negotiation_code: 'NEG-12345'
      };

      const mockMsg = {
        offer: {
          unit_price: 32000,
          quantity: 10,
          status: 'pending',
          offer_by: 'UMKM'
        }
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockMsg } as any);

      await negotiationService.rejectOffer(
        'neg-123',
        'msg-123',
        'dist-123',
        'DISTRIBUTOR',
        'Super Distributor',
        'Harga terlalu rendah'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'rejected',
          last_message: 'Penawaran ditolak oleh Distributor. Alasan: Harga terlalu rendah'
        })
      );
    });
  });

  describe('cancelNegotiation', () => {
    test('successfully cancels the negotiation if user is the UMKM', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'pending',
        negotiation_code: 'NEG-12345'
      };

      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any);

      await negotiationService.cancelNegotiation('neg-123', 'umkm-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'cancelled'
        })
      );
    });

    test('throws error if distributor tries to cancel', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'pending'
      };

      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any);

      await expect(negotiationService.cancelNegotiation('neg-123', 'dist-123')).rejects.toThrow(
        'Akses ditolak. Hanya pembeli yang dapat membatalkan negosiasi.'
      );
    });
  });

  describe('checkoutNegotiation', () => {
    test('successfully converts accepted negotiation to order', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        umkm_name: 'Warung Budi',
        distributor_id: 'dist-123',
        distributor_name: 'Super Distributor',
        status: 'accepted',
        product_id: 'prod-123',
        product_name: 'Minyak Goreng 2L',
        product_image: 'image.jpg',
        original_unit_price: 35000,
        agreed_unit_price: 32000,
        quantity: 10,
        negotiation_code: 'NEG-12345'
      };

      const mockProduct = {
        stock: 50,
        min_order_quantity: 5,
        is_active: true,
        unit_type: 'Pcs'
      };

      const mockDistributor = {
        is_suspended: false
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any) // neg snap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockProduct } as any) // product snap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockDistributor } as any); // dist snap

      const result = await negotiationService.checkoutNegotiation(
        'neg-123',
        'umkm-123',
        'Budi Santoso',
        'budi@example.com',
        'Jl. Menteng No. 42',
        'Credit Term (30 Days)'
      );

      expect(result.id).toBeDefined();
      expect(result.order_code).toMatch(/^ORD-\d+-\d+/);
      expect(mockSet).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'checked_out',
          converted_order_id: expect.any(String)
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        event: 'NEGOTIATION_CONVERTED_TO_ORDER'
      }));
    });

    test('throws error if distributor is suspended', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        distributor_id: 'dist-123',
        status: 'accepted',
        product_id: 'prod-123',
        quantity: 10
      };

      const mockProduct = {
        stock: 50,
        min_order_quantity: 5,
        is_active: true
      };

      const mockDistributor = {
        is_suspended: true // distributor suspended
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockProduct } as any)
        .mockResolvedValueOnce({ exists: () => true, data: () => mockDistributor } as any);

      await expect(negotiationService.checkoutNegotiation(
        'neg-123',
        'umkm-123',
        'Budi Santoso',
        'budi@example.com',
        'Jl. Menteng No. 42',
        'Credit Term'
      )).rejects.toThrow('Akun distributor sedang ditangguhkan.');
    });

    test('throws error if already converted to order', async () => {
      const mockNeg = {
        umkm_id: 'umkm-123',
        status: 'converted_to_order'
      };

      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => mockNeg } as any);

      await expect(negotiationService.checkoutNegotiation(
        'neg-123',
        'umkm-123',
        'Budi Santoso',
        'budi@example.com',
        'Jl. Menteng No. 42',
        'Credit Term'
      )).rejects.toThrow('Negosiasi ini sudah diproses menjadi pesanan sebelumnya.');
    });
  });
});
