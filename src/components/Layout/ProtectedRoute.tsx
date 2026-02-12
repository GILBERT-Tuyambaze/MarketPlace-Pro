import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  skipMarketplaceLock?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, skipMarketplaceLock }) => {
  const { user, profile, loading, platformSettings } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    toast.error('Please log in to access this page');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // allow admins regardless of allowedRoles to inherit permissions
    if (profile.role === 'admin') return <>{children}</>;
    toast.error('You do not have permission to access this page');
    return <Navigate to="/" replace />;
  }

  // Check marketplace lock - block non-admin users from accessing marketplace features
  // Admins can always access admin dashboard with skipMarketplaceLock
  if (platformSettings.marketplace_locked && !skipMarketplaceLock && profile?.role !== 'admin') {
    toast.error('Marketplace is currently under maintenance. Please try again later.');
    // Redirect to login so user sees the locked page
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;