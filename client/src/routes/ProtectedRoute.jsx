import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FAF5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3EAE5] flex items-center justify-center shadow-soft mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#16834A]" />
        </div>
        <p className="text-sm font-semibold text-[#17231C]">Validating QueueLess Session...</p>
        <p className="text-xs text-[#66736B] mt-1">Verifying encrypted HTTP-only credentials</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization enforcement on frontend
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own assigned dashboard based on their genuine role
    const fallbackPath =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'provider'
        ? '/provider/dashboard'
        : user.role === 'staff'
        ? '/staff/dashboard'
        : '/customer/dashboard';

    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

