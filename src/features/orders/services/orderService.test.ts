import { vi, describe, test, expect, beforeEach } from 'vitest';
import { orderService } from './orderService';
import { doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn((...args: any[]) => {
    if (args[2]) return { id: args[2] };
    if (typeof args[1] === 'string') return { id: args[1] };
    return { id: 'mock-dispute-id' };
  }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-server-timestamp')
}));

// Mock the firebase db
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

// Mock auth store
vi.mock('../../../store/use-auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'buyer-1', email: 'buyer@example.com', role: 'UMKM' }
    })
  }
}));

// Mock admin service audit log creation
vi.mock('../../admin/services/adminService', () => ({
  createAuditLog: vi.fn()
}));

describe('orderService.createDisputeFromOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('successfully creates a dispute when validation checks pass', async () => {
    const mockOrder = {
      buyer_id: 'buyer-1',
      total_amount: 150000,
      payment_status: 'paid',
      status: 'delivered',
      order_code: 'ORD-12345',
      distributor_id: 'dist-1',
      distributor_name: 'Distributor A'
    };

    // Mock getDoc for order details
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => mockOrder
    });

    // Mock getDocs for duplicate dispute query (no duplicate)
    (getDocs as any).mockResolvedValueOnce({
      docs: []
    });

    const payload = {
      reason: 'Barang rusak di jalan',
      evidence_note: 'Ada 2 botol pecah',
      requested_resolution: 'refund' as const
    };

    const result = await orderService.createDisputeFromOrder('order-1', 'buyer-1', payload);

    expect(result).toBeDefined();
    expect(result.reason).toBe('Barang rusak di jalan');
    expect(result.status).toBe('OPEN');
    expect(result.amount).toContain('150.000');
    expect(setDoc).toHaveBeenCalled();
  });

  test('throws error if order is not found', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => false
    });

    await expect(
      orderService.createDisputeFromOrder('order-invalid', 'buyer-1', { reason: 'Test reason' })
    ).rejects.toThrow('Order tidak ditemukan');
  });

  test('throws error if buyer is not the owner of the order', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => ({
        buyer_id: 'buyer-wrong',
        payment_status: 'paid',
        status: 'delivered'
      })
    });

    await expect(
      orderService.createDisputeFromOrder('order-1', 'buyer-1', { reason: 'Test reason' })
    ).rejects.toThrow('Anda tidak memiliki wewenang untuk mengajukan komplain pada pesanan ini.');
  });

  test('throws error if order is not paid', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => ({
        buyer_id: 'buyer-1',
        payment_status: 'unpaid',
        status: 'pending'
      })
    });

    await expect(
      orderService.createDisputeFromOrder('order-1', 'buyer-1', { reason: 'Test reason' })
    ).rejects.toThrow('Komplain hanya dapat diajukan untuk pesanan yang sudah dibayar.');
  });

  test('throws error if order is cancelled', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => ({
        buyer_id: 'buyer-1',
        payment_status: 'paid',
        status: 'cancelled'
      })
    });

    await expect(
      orderService.createDisputeFromOrder('order-1', 'buyer-1', { reason: 'Test reason' })
    ).rejects.toThrow('Pesanan telah dibatalkan, komplain tidak dapat diajukan.');
  });

  test('throws error if active dispute already exists', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => ({
        buyer_id: 'buyer-1',
        payment_status: 'paid',
        status: 'delivered'
      })
    });

    // Mock active dispute exists (status Open)
    (getDocs as any).mockResolvedValueOnce({
      docs: [{
        id: 'dsp-1',
        data: () => ({
          status: 'OPEN',
          order_id: 'order-1'
        })
      }]
    });

    await expect(
      orderService.createDisputeFromOrder('order-1', 'buyer-1', { reason: 'Test reason' })
    ).rejects.toThrow('Komplain aktif untuk pesanan ini sudah ada.');
  });

  test('allows new dispute if existing dispute is resolved', async () => {
    const mockOrder = {
      buyer_id: 'buyer-1',
      total_amount: 150000,
      payment_status: 'paid',
      status: 'delivered',
      order_code: 'ORD-12345',
      distributor_id: 'dist-1',
      distributor_name: 'Distributor A'
    };

    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      id: 'order-1',
      data: () => mockOrder
    });

    // Mock resolved dispute exists
    (getDocs as any).mockResolvedValueOnce({
      docs: [{
        id: 'dsp-1',
        data: () => ({
          status: 'RESOLVED',
          order_id: 'order-1'
        })
      }]
    });

    const payload = {
      reason: 'Barang rusak lagi',
      requested_resolution: 'admin_review' as const
    };

    const result = await orderService.createDisputeFromOrder('order-1', 'buyer-1', payload);
    expect(result).toBeDefined();
    expect(result.status).toBe('OPEN');
    expect(setDoc).toHaveBeenCalled();
  });
});
