import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function Navbar({ leftSlot }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 bg-[#080808]/90 backdrop-blur border-b border-white/[0.07]">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {leftSlot}
          <button
            onClick={() => navigate('/dashboard')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 rounded"
            aria-label="Go to dashboard"
          >
            <span className="font-display text-2xl tracking-wide">
              COURT<span className="text-[#00FF87]">SIDE</span>
            </span>
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar
              username={user.username}
              size={32}
              className="ring-1 ring-[#00FF87]/30"
            />
            <span className="hidden sm:inline text-white/40 text-sm">{user.username}</span>
            <button
              onClick={handleLogout}
              className="bg-white/[0.07] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-white/[0.12] active:bg-white/[0.16] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
