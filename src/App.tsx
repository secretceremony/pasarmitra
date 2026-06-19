import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './providers/auth-provider';
import { ThemeProvider } from './providers/theme-provider';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { UserRole } from './features/auth';

import { RealtimeProvider } from './providers/RealtimeProvider';
import { Toaster } from 'sonner';

// Pages
import { Login, Register, RegisterUniversal, ForgotPassword } from './features/auth';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import { DistributorProfile } from './features/marketplace/components/DistributorProfile';
import { CheckoutWizard } from './features/checkout/components/CheckoutWizard';
import { MyPartners } from './features/partners/components/MyPartners';

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
import { PartnershipManagement } from './features/partners/components/PartnershipManagement';
import { OrderManagement } from './features/orders/components/OrderManagement';
import { ChatNegotiation } from './features/partners/components/ChatNegotiation';
import { SalesAnalytics } from './features/analytics/components/SalesAnalytics';
import { LegalDocuments } from './features/inventory/components/LegalDocuments';

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
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/distributor/:id" element={<DistributorProfile />} />
                  <Route path="/checkout" element={<CheckoutWizard />} />
                  <Route path="/my-partners" element={<MyPartners />} />
                  
                  {/* Admin Only Routes */}
                  <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/verifications" element={<DistributorVerification />} />
                    <Route path="/admin/finances" element={<FinancialDashboard />} />
                    <Route path="/admin/commissions" element={<CommissionManagement />} />
                    <Route path="/admin/moderation" element={<ModerationSystem />} />
                    <Route path="/admin/disputes" element={<DisputeManagement />} />
                    <Route path="/admin/audit" element={<AuditLogSystem />} />
                  </Route>
                  
                  {/* General Protected Routes */}
                  <Route path="/negotiations" element={<ChatNegotiation />} />
                  <Route path="/orders" element={<OrderManagement />} />
                  
                  {/* Distributor Only Routes */}
                  <Route element={<ProtectedRoute allowedRoles={[UserRole.DISTRIBUTOR, UserRole.ADMIN]} />}>
                    <Route path="/inventory" element={<ProductManagement />} />
                    <Route path="/partners" element={<PartnershipManagement />} />
                    <Route path="/analytics" element={<SalesAnalytics />} />
                    <Route path="/legal" element={<LegalDocuments />} />
                    <Route path="/shipping" element={<div className="p-8"><h2 className="text-2xl font-bold italic tracking-tighter">Shipping & Logistics Engine</h2><p className="text-muted-foreground font-medium mt-4">Real-time truck tracking and last-mile routing is being initialized...</p></div>} />
                  </Route>
                  
                  <Route path="/settings" element={<div className="p-8"><h2 className="text-2xl font-bold">Settings Coming Soon</h2></div>} />
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

