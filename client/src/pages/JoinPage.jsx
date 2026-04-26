import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

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
    api.get(`/rooms/invite/${inviteCode}`)
      .then((res) => {
        const data = res.data;
        // Already a member — go straight to the room
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-white/40 text-sm hover:text-white/60">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight">
            Court<span className="text-[#00ff87]">side</span>
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-1">You're invited to join</h2>
          <p className="text-white/50 text-sm mb-6">{room.name}</p>

          {/* Game info */}
          <div className="bg-white/5 rounded-xl px-4 py-3 mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Game</p>
            <p className="font-semibold">{room.away_team} @ {room.home_team}</p>
            <p className="text-white/40 text-sm mt-0.5">
              {new Date(room.starts_at).toLocaleString([], {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* Current members */}
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

          {/* Stake input */}
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Your stake ($)</label>
              <input
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#00ff87]/50"
              />
              <p className="text-white/30 text-xs mt-1.5">
                You'll owe this amount if you lose the pick.
              </p>
            </div>

            {joinError && <p className="text-red-400 text-sm">{joinError}</p>}

            <button
              type="submit"
              disabled={joining || !stake}
              className="w-full bg-[#00ff87] text-[#0a0f1e] font-bold py-2.5 rounded-xl hover:bg-[#00e87a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? 'Joining…' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
