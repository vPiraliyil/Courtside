import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <span className="text-white">Loading...</span>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}
