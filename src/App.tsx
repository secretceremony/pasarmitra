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
import Notifications from './pages/Notifications';
import Cart from './pages/Cart';
import { DistributorProfile } from './features/marketplace/components/DistributorProfile';
import { CheckoutWizard } from './features/checkout/components/CheckoutWizard';
import DistributorsList from './pages/DistributorsList';
import { ProductDetailPage } from './pages/ProductDetailPage';

// Admin Features
import { AdminDashboard } from './features/admin/components/AdminDashboard';
import { UserManagement } from './features/admin/components/UserManagement';
import { DistributorVerification } from './features/admin/components/DistributorVerification';
import { ModerationSystem } from './features/admin/components/ModerationSystem';
import { DisputeManagement } from './features/admin/components/DisputeManagement';
import { AuditLogSystem } from './features/admin/components/AuditLogSystem';
import { AdminPayouts } from './features/admin/components/AdminPayouts';

// Distributor Features
import { ProductManagement } from './features/inventory/components/ProductManagement';
import { OrderManagement } from './features/orders/components/OrderManagement';
import { OrderDetail } from './features/orders/components/OrderDetail';
import { ChatNegotiation } from './features/partners/components/ChatNegotiation';
import { LegalDocuments } from './features/inventory/components/LegalDocuments';
import { DistributorWallet } from './features/distributor/components/DistributorWallet';

// Dispute Features
import { UMKMDisputesList } from './features/orders/components/UMKMDisputesList';
import { UMKMDisputeDetail } from './features/orders/components/UMKMDisputeDetail';
import { DistributorDisputesList } from './features/orders/components/DistributorDisputesList';
import { DistributorDisputeDetail } from './features/orders/components/DistributorDisputeDetail';

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
                   
                   {/* General Marketplace & Product Detail Routes (Accessible by UMKM, Distributor, Admin) */}
                   <Route path="/marketplace" element={<Marketplace />} />
                   <Route path="/umkm/products/:productId" element={<ProductDetailPage />} />

                   {/* UMKM Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.UMKM]} />}>
                      <Route path="/checkout" element={<CheckoutWizard />} />
                      <Route path="/umkm/cart" element={<Cart />} />
                      <Route path="/umkm/dashboard" element={<Dashboard />} />
                      <Route path="/umkm/profile" element={<ProfileSettings />} />
                      <Route path="/umkm/negosiasi-harga" element={<ChatNegotiation />} />
                      <Route path="/umkm/distributors" element={<DistributorsList />} />
                      <Route path="/umkm/orders/:orderId" element={<OrderDetail />} />
                      <Route path="/umkm/disputes" element={<UMKMDisputesList />} />
                      <Route path="/umkm/disputes/:disputeId" element={<UMKMDisputeDetail />} />
                   </Route>
                   
                   {/* Admin Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                     <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                     <Route path="/admin/dashboard" element={<AdminDashboard />} />
                     <Route path="/admin/users" element={<UserManagement />} />
                     <Route path="/admin/verifications" element={<DistributorVerification />} />
                     <Route path="/admin/finances" element={<Navigate to="/admin/dashboard" replace />} />
                     <Route path="/admin/commissions" element={<Navigate to="/admin/dashboard" replace />} />
                     <Route path="/admin/moderation" element={<ModerationSystem />} />
                     <Route path="/admin/disputes" element={<DisputeManagement />} />
                     <Route path="/admin/audit" element={<AuditLogSystem />} />
                     <Route path="/admin/profile" element={<ProfileSettings />} />
                     <Route path="/admin/orders/:orderId" element={<OrderDetail />} />
                     <Route path="/admin/payouts" element={<AdminPayouts />} />
                   </Route>
                   
                   {/* General Protected Routes */}
                   <Route path="/negotiations" element={<NegotiationsRedirect />} />
                   <Route path="/orders" element={<OrderManagement />} />
                   <Route path="/notifications" element={<Notifications />} />
                   
                   {/* Distributor Only Routes */}
                   <Route element={<ProtectedRoute allowedRoles={[UserRole.DISTRIBUTOR, UserRole.ADMIN]} />}>
                     <Route path="/inventory" element={<ProductManagement />} />
                     <Route path="/distributor/legal-docs" element={<LegalDocuments />} />
                     <Route path="/distributor/profile" element={<ProfileSettings />} />
                     <Route path="/distributor/negosiasi-harga" element={<ChatNegotiation />} />
                     <Route path="/distributor/orders/:orderId" element={<OrderDetail />} />
                     <Route path="/distributor/disputes" element={<DistributorDisputesList />} />
                     <Route path="/distributor/disputes/:disputeId" element={<DistributorDisputeDetail />} />
                     <Route path="/distributor/wallet" element={<DistributorWallet />} />
                     
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
              <Route path="/unauthorized" element={
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
                  <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto border border-rose-500/20">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-white">Akses Dibatasi</h2>
                      <p className="text-sm text-slate-400 font-medium">Anda tidak memiliki izin atau peran Anda telah berubah. Silakan kembali ke dashboard.</p>
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard'} 
                      className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                </div>
              } />
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

