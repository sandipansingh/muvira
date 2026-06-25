import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../shared/LoadingSpinner';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Gatekeeper component requiring a user to be authenticated.
 * Redirects unauthorized users to /login.
 */
export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  if (!isAuthenticated) {
    // Save location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Gatekeeper component requiring a user to have the admin role.
 * Displays a clean 403 Forbidden page if unauthorized.
 */
export const RequireAdmin: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-lightgrayColor text-center">
        <div className="bg-white p-8 md:p-12 border border-secondary200 rounded-xl max-w-md w-full shadow-lg">
          <span className="text-4xl text-rose-500 font-extrabold uppercase animate-pulse">403</span>
          <h2 className="text-lg font-bold text-darkColor mt-4 mb-2 tracking-wide">
            Access Denied
          </h2>
          <p className="text-xs md:text-sm text-secondary600 tracking-wide mb-6 leading-relaxed">
            You do not have the required administrative permissions to access this page. If you are an admin, please verify your login.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
