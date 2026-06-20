import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './providers/auth-provider';
import { ThemeProvider } from './providers/theme-provider';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { UserRole, ProfileSettings } from './features/auth';
import { useAuthStore } from './store/use-auth-store';

import { RealtimeProvider } from './providers/RealtimeProvider';
import { Toaster } from 'sonner';

// Pages
import { Login, Register, RegisterUniversal, ForgotPassword } from './features/auth';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import { DistributorProfile } from './features/marketplace/components/DistributorProfile';
import { CheckoutWizard } from './features/checkout/components/CheckoutWizard';

// Admin Features
import { AdminDashboard } from './features/admin/components/AdminDashboard';
import { UserManagement } from './features/admin/components/UserManagement';
import { DistributorVerification } from './features/admin/components/DistributorVerification';
import { FinancialDashboard } from './features/admin/components/FinancialDashboard';
import { CommissionManagement } from './features/admin/components/CommissionManagement';
import { ModerationSystem } from './features/admin/components/ModerationSystem';
import { DisputeManagement } from './features/admin/components/DisputeManagement';
import { AuditLogSystem } from './features/admin/components/AuditLogSystem';

// Distributor Features
import { ProductManagement } from './features/inventory/components/ProductManagement';
import { OrderManagement } from './features/orders/components/OrderManagement';
import { ChatNegotiation } from './features/partners/components/ChatNegotiation';
import { LegalDocuments } from './features/inventory/components/LegalDocuments';

const DashboardRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === UserRole.DISTRIBUTOR) return <Navigate to="/distributor/dashboard" replace />;
  return <Navigate to="/umkm/dashboard" replace />;
};

const NegotiationsRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === UserRole.DISTRIBUTOR) return <Navigate to="/distributor/negosiasi-harga" replace />;
  if (user?.role === UserRole.UMKM) return <Navigate to="/umkm/negosiasi-harga" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <RealtimeProvider>
            <ThemeProvider>
              <Toaster position="top-right" expand={true} richColors />
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-universal" element={<RegisterUniversal />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                   <Route path="/dashboard" element={<DashboardRedirect />} />
                   <Route path="/distributor/:id" element={<DistributorProfile />} />
                   <Route path="/my-partners" element={<Navigate to="/dashboard" replace />} />
                   
                   {/* UMKM Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.UMKM]} />}>
                     <Route path="/marketplace" element={<Marketplace />} />
                     <Route path="/checkout" element={<CheckoutWizard />} />
                     <Route path="/umkm/dashboard" element={<Dashboard />} />
                     <Route path="/umkm/profile" element={<ProfileSettings />} />
                     <Route path="/umkm/negosiasi-harga" element={<ChatNegotiation />} />
                   </Route>
                   
                   {/* Admin Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                     <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                     <Route path="/admin/dashboard" element={<AdminDashboard />} />
                     <Route path="/admin/users" element={<UserManagement />} />
                     <Route path="/admin/verifications" element={<DistributorVerification />} />
                     <Route path="/admin/finances" element={<FinancialDashboard />} />
                     <Route path="/admin/commissions" element={<CommissionManagement />} />
                     <Route path="/admin/moderation" element={<ModerationSystem />} />
                     <Route path="/admin/disputes" element={<DisputeManagement />} />
                     <Route path="/admin/audit" element={<AuditLogSystem />} />
                     <Route path="/admin/profile" element={<ProfileSettings />} />
                   </Route>
                   
                   {/* General Protected Routes */}
                   <Route path="/negotiations" element={<NegotiationsRedirect />} />
                   <Route path="/orders" element={<OrderManagement />} />
                   
                   {/* Distributor Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.DISTRIBUTOR, UserRole.ADMIN]} />}>
                     <Route path="/inventory" element={<ProductManagement />} />
                     <Route path="/distributor/legal-docs" element={<LegalDocuments />} />
                     <Route path="/distributor/profile" element={<ProfileSettings />} />
                     <Route path="/distributor/negosiasi-harga" element={<ChatNegotiation />} />
                     
                     {/* Redirect removed distributor routes */}
                     <Route path="/distributor/dashboard" element={<Dashboard />} />
                     <Route path="/legal" element={<Navigate to="/distributor/legal-docs" replace />} />
                     <Route path="/partners" element={<Navigate to="/distributor/dashboard" replace />} />
                     <Route path="/analytics" element={<Navigate to="/distributor/dashboard" replace />} />
                     <Route path="/shipping" element={<Navigate to="/distributor/dashboard" replace />} />
                   </Route>
                </Route>
              </Route>

              {/* Error Routes */}
              <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center">Unauthorized Access</div>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ThemeProvider>
        </RealtimeProvider>
      </AuthProvider>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

