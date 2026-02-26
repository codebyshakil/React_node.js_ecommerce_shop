import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const AdminLogin = lazy(() => import('@/pages/AdminLogin'));

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // Staff users should use admin panel, not user dashboard
  if (userRole && STAFF_ROLES.includes(userRole)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const STAFF_ROLES = ['admin', 'sales_manager', 'account_manager', 'support_assistant', 'marketing_manager'];

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminLogin /></Suspense>;
  if (!userRole || !STAFF_ROLES.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md bg-card border border-border rounded-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground text-sm">You do not have permission to access this section.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
