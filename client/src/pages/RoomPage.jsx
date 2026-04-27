import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';
import Leaderboard from '../components/Leaderboard';

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function RoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState('');
  const [savingStake, setSavingStake] = useState(false);
  const [stakeError, setStakeError] = useState(null);
  const [picks, setPicks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickError, setPickError] = useState(null);
  const [settlements, setSettlements] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/rooms/${id}`),
      api.get(`/picks/room/${id}`),
    ])
      .then(([roomRes, picksRes]) => {
        setRoom(roomRes.data);
        setPicks(picksRes.data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load room'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket || !room) return;
    socket.emit('join:room', { roomId: id });

    const onScore = ({ gameId, homeScore, awayScore, status }) => {
      if (gameId !== room.game_id) return;
      setRoom((prev) => ({
        ...prev,
        home_score: homeScore,
        away_score: awayScore,
        game_status: status,
      }));
    };
    const onFinished = ({ gameId, winner }) => {
      if (gameId !== room.game_id) return;
      setRoom((prev) => ({ ...prev, game_status: 'finished', winner }));
    };
    const onSettlement = ({ roomId, settlements }) => {
      if (roomId !== id) return;
      setSettlements(settlements);
      navigate(`/rooms/${id}/settlement`);
    };

    socket.on('score:update', onScore);
    socket.on('game:finished', onFinished);
    socket.on('settlement:ready', onSettlement);
    return () => {
      socket.off('score:update', onScore);
      socket.off('game:finished', onFinished);
      socket.off('settlement:ready', onSettlement);
      socket.emit('leave:room', { roomId: id });
    };
  }, [socket, room?.game_id, id]);

  const inviteLink = `${window.location.origin}/join/${room?.invite_code}`;
  const myMember = room?.members?.find((m) => m.user_id === user?.id);
  const needsStake = myMember && Number(myMember.stake) === 0;
  const myPick = picks.find((p) => p.user_id === user?.id);
  const gameStarted = room?.game_status !== 'scheduled';
  const picksLocked = gameStarted || !!myPick;

  function handleCopy() {
    copyToClipboard(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStakeSave(e) {
    e.preventDefault();
    const val = parseFloat(stake);
    if (!val || val <= 0) return;
    setSavingStake(true);
    setStakeError(null);
    try {
      await api.patch(`/rooms/${id}/stake`, { stake: val });
      setRoom((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.user_id === user.id ? { ...m, stake: val } : m
        ),
      }));
      setStake('');
    } catch (err) {
      setStakeError(err.response?.data?.error || 'Failed to update stake');
    } finally {
      setSavingStake(false);
    }
  }

  async function handlePickSubmit(teamName) {
    setSubmitting(true);
    setPickError(null);
    try {
      const { data } = await api.post('/picks', { roomId: id, pickValue: teamName });
      setPicks((prev) => [...prev.filter((p) => p.user_id !== user.id), data]);
    } catch (err) {
      setPickError(err.response?.data?.error || 'Failed to submit pick');
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          ← Dashboard
        </button>
        <span className="text-xl font-bold tracking-tight">
          Court<span className="text-[#00ff87]">side</span>
        </span>
        <div className="w-24" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Room header */}
        <div>
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-white/50 mt-1">
            {room.away_team} @ {room.home_team}
          </p>
        </div>

        {/* Live scoreboard */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <span className="text-white/60 text-sm mb-1">{room.away_team}</span>
              <span className="text-4xl font-bold font-mono">{room.away_score ?? 0}</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                room.game_status === 'live'
                  ? 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40'
                  : room.game_status === 'finished'
                  ? 'bg-white/5 text-white/40 border border-white/10'
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}>
                {room.game_status === 'live' ? 'Live' : room.game_status === 'finished' ? 'Final' : 'Scheduled'}
              </span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-white/60 text-sm mb-1">{room.home_team}</span>
              <span className="text-4xl font-bold font-mono">{room.home_score ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Game-over banner */}
        {room.game_status === 'finished' && room.winner && (
          <div className="bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl px-4 py-4 text-center">
            <p className="text-white/60 text-sm uppercase tracking-wider">Game Over</p>
            <p className="text-[#00ff87] text-xl font-bold mt-1">{room.winner} win</p>
          </div>
        )}

        {/* Settlement banner */}
        {(settlements || room.game_status === 'finished') && (
          <button
            onClick={() => navigate(`/rooms/${id}/settlement`)}
            className="w-full bg-[#00ff87]/10 border border-[#00ff87]/30 hover:bg-[#00ff87]/20 transition-colors rounded-xl px-4 py-4 text-left"
          >
            <p className="text-[#00ff87] font-semibold mb-1">Settlement ready →</p>
            <p className="text-white/60 text-sm">View the final results and who pays who.</p>
          </button>
        )}

        {/* Stake banner */}
        {needsStake && (
          <div className="bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl px-4 py-4">
            <p className="text-[#00ff87] font-semibold mb-3">You haven't set your stake yet</p>
            <form onSubmit={handleStakeSave} className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="Enter amount ($)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#00ff87]/50"
              />
              <button
                type="submit"
                disabled={savingStake || !stake}
                className="bg-[#00ff87] text-[#0a0f1e] font-semibold px-4 py-2 rounded-lg hover:bg-[#00e87a] transition-colors disabled:opacity-50"
              >
                {savingStake ? 'Saving…' : 'Set Stake'}
              </button>
            </form>
            {stakeError && <p className="text-red-400 text-sm mt-2">{stakeError}</p>}
          </div>
        )}

        {/* Pick submission */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/50 text-sm">Your pick</p>
            {picksLocked && (
              <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {gameStarted ? 'Game started' : 'Pick locked'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[room.away_team, room.home_team].map((team) => {
              const selected = myPick?.pick_value === team;
              return (
                <button
                  key={team}
                  disabled={picksLocked || submitting}
                  onClick={() => handlePickSubmit(team)}
                  className={`py-3 px-4 rounded-xl font-semibold text-sm transition-colors
                    ${selected
                      ? 'bg-[#00ff87] text-[#0a0f1e]'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {team}
                </button>
              );
            })}
          </div>
          {pickError && <p className="text-red-400 text-sm mt-2">{pickError}</p>}
        </div>

        {/* Leaderboard */}
        <Leaderboard roomId={id} gameId={room.game_id} currentUserId={user?.id} />

        {/* Invite link */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-2">Invite link</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2 truncate font-mono">
              {inviteLink}
            </span>
            <button
              onClick={handleCopy}
              className="bg-white/10 text-white text-sm px-3 py-2 rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Members + picks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-3">Members ({room.members.length})</p>
          <div className="flex flex-col gap-2">
            {room.members.map((m) => {
              const memberPick = picks.find((p) => p.user_id === m.user_id);
              return (
                <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.username}</span>
                    {m.user_id === user?.id && (
                      <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">you</span>
                    )}
                    {m.user_id === room.created_by && (
                      <span className="text-xs text-[#00ff87]/60 bg-[#00ff87]/10 px-1.5 py-0.5 rounded">host</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono ${Number(m.stake) === 0 ? 'text-white/30' : 'text-white/70'}`}>
                      {Number(m.stake) === 0 ? 'No stake' : `$${Number(m.stake).toFixed(2)}`}
                    </span>
                    <span className={`text-sm ${memberPick ? 'text-[#00ff87]' : 'text-white/30'}`}>
                      {memberPick?.pick_value ?? (gameStarted ? 'No pick' : 'Waiting…')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
