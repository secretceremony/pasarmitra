import { vi, describe, test, expect, beforeEach } from 'vitest';
import { updateDisputeStatus } from './adminService';
import { doc, getDoc, writeBatch } from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => {
  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn(() => Promise.resolve())
  };
  return {
    collection: vi.fn(),
    addDoc: vi.fn(),
    doc: vi.fn((_db, _coll, id) => ({ id: id || 'mock-id' })),
    getDoc: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
    serverTimestamp: vi.fn(() => 'mock-server-timestamp')
  };
});

// Mock the firebase db
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

describe('adminService.updateDisputeStatus', () => {
  let mockBatch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch = writeBatch(null as any);
  });

  test('successfully processes review action (mediator)', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        order_id: 'order-123',
        status: 'OPEN'
      })
    });

    await updateDisputeStatus('dispute-1', 'review', 'admin@example.com', {
      admin_note: 'Memerlukan review'
    });

    // Check updates committed to batch
    expect(mockBatch.update).toHaveBeenCalledTimes(2); // dispute and order docs
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispute-1' }),
      expect.objectContaining({
        status: 'IN_MEDIATION',
        admin_note: 'Memerlukan review',
        reviewed_by: 'admin@example.com'
      })
    );
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-123' }),
      expect.objectContaining({
        dispute_status: 'IN_MEDIATION'
      })
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  test('successfully processes refund action', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        order_id: 'order-123',
        status: 'OPEN'
      })
    });

    await updateDisputeStatus('dispute-1', 'refund', 'admin@example.com', {
      refund_amount: 150000,
      refund_note: 'Barang terbukti cacat'
    });

    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispute-1' }),
      expect.objectContaining({
        status: 'RESOLVED',
        resolution_type: 'REFUNDED',
        refund_amount: 150000,
        refund_note: 'Barang terbukti cacat'
      })
    );
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-123' }),
      expect.objectContaining({
        dispute_status: 'RESOLVED',
        refund_status: 'refunded',
        payment_status: 'refunded'
      })
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  test('successfully processes reject action', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        order_id: 'order-123',
        status: 'OPEN'
      })
    });

    await updateDisputeStatus('dispute-1', 'reject', 'admin@example.com', {
      rejection_reason: 'Bukti tidak mencukupi'
    });

    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispute-1' }),
      expect.objectContaining({
        status: 'RESOLVED',
        resolution_type: 'REJECTED',
        rejection_reason: 'Bukti tidak mencukupi'
      })
    );
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-123' }),
      expect.objectContaining({
        dispute_status: 'RESOLVED',
        refund_status: 'rejected'
      })
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  test('successfully processes resolve action without refund', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        order_id: 'order-123',
        status: 'OPEN'
      })
    });

    await updateDisputeStatus('dispute-1', 'resolve', 'admin@example.com', {});

    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispute-1' }),
      expect.objectContaining({
        status: 'RESOLVED',
        resolution_type: 'RESOLVED'
      })
    );
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-123' }),
      expect.objectContaining({
        dispute_status: 'RESOLVED'
      })
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  test('throws error if dispute is not found', async () => {
    (getDoc as any).mockResolvedValueOnce({
      exists: () => false
    });

    await expect(
      updateDisputeStatus('dispute-invalid', 'resolve', 'admin@example.com', {})
    ).rejects.toThrow('Data komplain tidak ditemukan.');
  });
});
