import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    live:      'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40',
    scheduled: 'bg-white/10 text-white/60 border border-white/20',
    finished:  'bg-white/5 text-white/40 border border-white/10',
  };
  const labels = { live: 'Live', scheduled: 'Scheduled', finished: 'Final' };
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status] || styles.scheduled}`}>
      {labels[status] || status}
    </span>
  );
}

function GameCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-white/10 rounded" />
        <div className="h-5 w-20 bg-white/10 rounded-full" />
      </div>
      <div className="mt-3 h-4 w-24 bg-white/10 rounded" />
    </div>
  );
}

function formatTime(startsAt) {
  return new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/games')
      .then((res) => setGames(res.data))
      .catch(() => setError('Failed to load games.'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">
          Court<span className="text-[#00ff87]">side</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="bg-white/10 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Today's Games</h2>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="text-5xl mb-4">🏀</span>
            <p className="text-lg font-medium">No games today</p>
            <p className="text-sm mt-1">Check back later or sync games via the admin endpoint.</p>
          </div>
        )}

        {!loading && !error && games.length > 0 && (
          <div className="flex flex-col gap-3">
            {games.map((game) => (
              <div key={game.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{game.away_team}</span>
                    <span className="text-white/40 text-sm">@</span>
                    <span className="font-semibold">{game.home_team}</span>
                    {game.status !== 'scheduled' && (
                      <span className="text-white/60 text-sm font-mono">
                        {game.away_score} – {game.home_score}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={game.status} />
                </div>
                <div className="mt-2 text-white/40 text-sm">
                  {game.status === 'scheduled' ? formatTime(game.starts_at) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
