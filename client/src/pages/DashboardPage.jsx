import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-white">
        Welcome, <span className="text-[#00ff87]">{user?.username}</span>
      </h1>
      <button
        onClick={handleLogout}
        className="bg-white/10 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
