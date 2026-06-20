import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock firebase/firestore functions used in the component
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn()
}));

// Mock the firebase db export
vi.mock('../../../lib/firebase', () => ({
  db: {}
}));

// Mock recharts to avoid rendering problems in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />
}));

import { getDocs, getDoc } from 'firebase/firestore';

describe('AdminDashboard', () => {
  test('renders operational dashboard with safe empty state fallbacks', async () => {
    // Mock firestore calls returning empty state / no data
    (getDocs as any).mockImplementation((colRef: any) => {
      return Promise.resolve({
        forEach: (cb: any) => {}
      });
    });

    (getDoc as any).mockResolvedValue({
      exists: () => false
    });

    render(<AdminDashboard />);

    // Wait for the loading state to complete
    await waitFor(() => {
      expect(screen.getByText(/Total Pengguna/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check that we display the operational Quick Action buttons
    expect(screen.getByText(/Tinjau Distributor/i)).toBeInTheDocument();
    expect(screen.getByText(/Arbitrase Sengketa/i)).toBeInTheDocument();

    // Check safe fallback values (Rp 0) for platform commission/subscriptions
    expect(screen.getAllByText(/Rp 0/i).length).toBeGreaterThan(0);

    // Verify new KPI cards are present
    expect(screen.getByText(/Komisi Bulan Ini/i)).toBeInTheDocument();
    expect(screen.getByText(/Langganan Bulan Ini/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendapatan dari paket distributor/i)).toBeInTheDocument();

    // Verify chart empty state is rendered correctly
    expect(screen.getByText(/Belum ada transaksi bulan ini/i)).toBeInTheDocument();
    expect(screen.getByText(/Data transaksi akan muncul setelah UMKM melakukan pembelian dari distributor\./i)).toBeInTheDocument();
    expect(screen.getByText(/Lihat Keuangan/i)).toBeInTheDocument();

    // Verify Platform Revenue summary section is present
    expect(screen.getByRole('heading', { name: /^Pendapatan Platform$/i })).toBeInTheDocument();

    // Verify Action Queue is present and shows the empty state correctly
    expect(screen.getByText(/Antrian Tindakan Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada tindakan tertunda/i)).toBeInTheDocument();
    expect(screen.getByText(/Semua operasional aman\./i)).toBeInTheDocument();

    // Verify recent activity feed section title is updated
    expect(screen.getByRole('heading', { name: /^Aktivitas Terbaru$/i })).toBeInTheDocument();
    expect(screen.getByText(/Belum ada aktivitas terbaru\./i)).toBeInTheDocument();
  }, 15000);
});
