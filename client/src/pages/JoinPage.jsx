import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Avatar from '../components/Avatar';
import TeamLogo from '../components/TeamLogo';

function JoinSkeleton() {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 animate-pulse">
      <div className="h-6 w-48 bg-white/10 rounded mb-2" />
      <div className="h-4 w-32 bg-white/10 rounded mb-6" />
      <div className="bg-white/[0.04] rounded-2xl p-4 mb-6">
        <div className="h-3 w-12 bg-white/10 rounded mb-2" />
        <div className="h-5 w-56 bg-white/10 rounded mb-2" />
        <div className="h-4 w-40 bg-white/10 rounded" />
      </div>
      <div className="h-3 w-24 bg-white/10 rounded mb-3" />
      <div className="flex gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="w-10 h-10 rounded-full bg-white/10" />
      </div>
      <div className="h-12 w-full bg-white/10 rounded-xl mb-4" />
      <div className="h-12 w-full bg-white/10 rounded-xl" />
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
    if (room) document.title = `Courtside — Join ${room.name}`;
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
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-display text-5xl text-[#00FF87] tracking-wide">COURTSIDE</span>
          <p className="text-white/25 text-xs tracking-[0.4em] uppercase mt-1">Pick'em</p>
        </div>

        {loading && <JoinSkeleton />}

        {error && !loading && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 text-center">
            <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white/35 text-sm hover:text-white/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 rounded px-2 py-1"
            >
              Back to dashboard
            </button>
          </div>
        )}

        {room && !loading && !error && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6">
            <h2 className="font-display text-2xl tracking-wide mb-1">You're Invited</h2>
            <p className="text-white/40 text-sm mb-6">{room.name}</p>

            <div className="bg-white/[0.04] rounded-2xl p-4 mb-6">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Game</p>
              <div className="flex items-center gap-2 font-semibold flex-wrap">
                <TeamLogo teamName={room.away_team} size={20} />
                <span>{room.away_team}</span>
                <span className="text-white/30">@</span>
                <TeamLogo teamName={room.home_team} size={20} />
                <span>{room.home_team}</span>
              </div>
              <p className="text-white/35 text-sm mt-0.5">
                {new Date(room.starts_at).toLocaleString([], {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            {room.members.length > 0 && (
              <div className="mb-6">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-3">
                  {room.members.length} {room.members.length === 1 ? 'member' : 'members'} already in
                </p>
                <div className="flex flex-wrap gap-3">
                  {room.members.map((m) => (
                    <div key={m.user_id} className="flex flex-col items-center gap-1">
                      <Avatar username={m.username} size={40} />
                      <span className="text-[10px] text-white/35 max-w-[48px] truncate text-center">{m.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-2" htmlFor="stake">Your stake ($)</label>
                <input
                  id="stake"
                  autoFocus
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 focus:border-[#00FF87]/40 transition-colors"
                />
                <p className="text-white/25 text-xs mt-2">You'll owe this if you lose the pick.</p>
              </div>

              {joinError && (
                <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-xl px-4 py-2 text-sm">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                disabled={joining || !stake}
                className="w-full bg-[#00FF87] text-[#080808] font-bold py-3.5 rounded-xl hover:bg-[#00e87a] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50"
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
