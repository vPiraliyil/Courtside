import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

function JoinSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
      <div className="h-6 w-48 bg-white/10 rounded mb-2" />
      <div className="h-4 w-32 bg-white/10 rounded mb-6" />
      <div className="bg-white/5 rounded-xl p-4 mb-6">
        <div className="h-3 w-12 bg-white/10 rounded mb-2" />
        <div className="h-5 w-56 bg-white/10 rounded mb-2" />
        <div className="h-4 w-40 bg-white/10 rounded" />
      </div>
      <div className="h-3 w-24 bg-white/10 rounded mb-3" />
      <div className="flex gap-2 mb-6">
        <div className="h-7 w-20 bg-white/10 rounded-full" />
        <div className="h-7 w-20 bg-white/10 rounded-full" />
      </div>
      <div className="h-10 w-full bg-white/10 rounded-lg mb-4" />
      <div className="h-11 w-full bg-white/10 rounded-xl" />
    </div>
  );
}

export default function JoinPage() {
  const { inviteCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stake, setStake] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    document.title = 'Courtside — Join room';
  }, []);

  useEffect(() => {
    if (room) {
      document.title = `Courtside — Join ${room.name}`;
    }
  }, [room]);

  useEffect(() => {
    api.get(`/rooms/invite/${inviteCode}`)
      .then((res) => {
        const data = res.data;
        if (data.members?.some((m) => m.user_id === user?.id)) {
          navigate(`/rooms/${data.id}`, { replace: true });
          return;
        }
        setRoom(data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Room not found'))
      .finally(() => setLoading(false));
  }, [inviteCode, user]);

  async function handleJoin(e) {
    e.preventDefault();
    const val = parseFloat(stake);
    if (!val || val <= 0) return;
    setJoining(true);
    setJoinError(null);
    try {
      const { data } = await api.post('/rooms/join', { inviteCode, stake: val });
      navigate(`/rooms/${data.id}`);
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join room');
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold tracking-tight">
            Court<span className="text-[#00ff87]">side</span>
          </span>
        </div>

        {loading && <JoinSkeleton />}

        {error && !loading && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white/50 text-sm hover:text-white/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 rounded px-2 py-1"
            >
              Back to dashboard
            </button>
          </div>
        )}

        {room && !loading && !error && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-1">You're invited to join</h2>
            <p className="text-white/50 text-sm mb-6">{room.name}</p>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Game</p>
              <p className="font-semibold">{room.away_team} @ {room.home_team}</p>
              <p className="text-white/40 text-sm mt-0.5">
                {new Date(room.starts_at).toLocaleString([], {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            {room.members.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                  {room.members.length} {room.members.length === 1 ? 'member' : 'members'} already in
                </p>
                <div className="flex flex-wrap gap-2">
                  {room.members.map((m) => (
                    <span key={m.user_id} className="bg-white/10 text-white/70 text-sm px-2.5 py-1 rounded-full">
                      {m.username}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2" htmlFor="stake">Your stake ($)</label>
                <input
                  id="stake"
                  autoFocus
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87]/50 transition-colors"
                />
                <p className="text-white/30 text-xs mt-2">
                  You'll owe this amount if you lose the pick.
                </p>
              </div>

              {joinError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                disabled={joining || !stake}
                className="w-full bg-[#00ff87] text-[#0a0f1e] font-bold py-3 rounded-xl hover:bg-[#00e87a] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
              >
                {joining ? 'Joining…' : 'Join Room'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
