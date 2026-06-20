import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import { CommissionManagement } from './CommissionManagement';

// Mock firebase/firestore functions used in the component
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}));

// Mock the firebase db export
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

// Mock auth store
vi.mock('../../../store/use-auth-store', () => ({
  useAuthStore: vi.fn(() => ({ user: { email: 'admin@example.com' } }))
}));

// Mock admin service audit log creation
vi.mock('../services/adminService', () => ({
  createAuditLog: vi.fn()
}));

// Provide dummy data for getDocs and getDoc
import { getDocs, getDoc } from 'firebase/firestore';

const mockTierData = [
  {
    id: 'DISTRIBUTOR-fallback',
    data: () => ({
      name: 'DISTRIBUTOR',
      partnerType: 'DISTRIBUTOR',
      partnersActive: 0,
      platformFee: 1.5,
      description: '',
      isActive: true,
      updatedAt: null
    })
  }
];

(getDocs as any).mockResolvedValue({
  forEach: (cb: (doc: any) => void) => mockTierData.forEach(cb)
});

(getDoc as any).mockResolvedValue({
  exists: () => true,
  data: () => ({ globalBaseline: 1.375 })
});

describe('CommissionManagement', () => {
  test('renders without deprecated buttons', async () => {
    render(<CommissionManagement />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/Mesin Komisi Platform/i)).toBeInTheDocument();
    });

    // Recalibrate button should not exist
    expect(screen.queryByText(/Kalibrasi Ulang Dasar Komisi/i)).not.toBeInTheDocument();
    // Auto‑balancer button should not exist
    expect(screen.queryByText(/Jalankan Penyeimbang Otomatis/i)).not.toBeInTheDocument();
  });
});
