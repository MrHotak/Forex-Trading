import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './ui.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/app" replace />;
  return children;
}

/** Login / register pages: signed-in users go straight to their dashboard. */
export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/app'} replace />;
  return children;
}
