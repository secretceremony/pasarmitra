import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/use-auth-store';
import { UserRole } from '../../features/auth/types/auth.types';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, session, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading PasarMitra...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    let dashboardPath = '/umkm/dashboard';
    if (user.role === UserRole.ADMIN) dashboardPath = '/admin/dashboard';
    else if (user.role === UserRole.DISTRIBUTOR) dashboardPath = '/distributor/dashboard';
    
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
};
