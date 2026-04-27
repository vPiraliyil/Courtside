import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ leftSlot }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = (user?.username?.[0] ?? '?').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#0a0f1e]/85 backdrop-blur border-b border-white/10">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {leftSlot}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-lg sm:text-xl font-bold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 rounded"
            aria-label="Go to dashboard"
          >
            Court<span className="text-[#00ff87]">side</span>
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="w-8 h-8 rounded-full bg-[#00ff87]/15 border border-[#00ff87]/40 text-[#00ff87] flex items-center justify-center font-bold text-sm"
              title={user.username}
              aria-label={`Logged in as ${user.username}`}
            >
              {initial}
            </div>
            <span className="hidden sm:inline text-white/60 text-sm">{user.username}</span>
            <button
              onClick={handleLogout}
              className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-white/15 active:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
