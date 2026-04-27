import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';
import Leaderboard from '../components/Leaderboard';
import Navbar from '../components/Navbar';

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {});
}

function RoomSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-64 bg-white/10 rounded" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-10 w-12 bg-white/10 rounded" />
          </div>
          <div className="h-5 w-16 bg-white/10 rounded-full" />
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-10 w-12 bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="h-4 w-20 bg-white/10 rounded mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="h-5 w-28 bg-white/10 rounded mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 border border-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
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
  const [scoreFlash, setScoreFlash] = useState({ home: 0, away: 0 });

  useEffect(() => {
    document.title = 'Courtside — Room';
  }, []);

  useEffect(() => {
    if (room) {
      document.title = `Courtside — ${room.away_team} vs ${room.home_team}`;
    }
  }, [room?.away_team, room?.home_team]);

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

  const prevScoresRef = useRef({ home: null, away: null });

  useEffect(() => {
    if (!socket || !room) return;
    socket.emit('join:room', { roomId: id });

    const onScore = ({ gameId, homeScore, awayScore, status }) => {
      if (gameId !== room.game_id) return;
      const prev = prevScoresRef.current;
      const homeChanged = prev.home != null && prev.home !== homeScore;
      const awayChanged = prev.away != null && prev.away !== awayScore;
      prevScoresRef.current = { home: homeScore, away: awayScore };
      if (homeChanged || awayChanged) {
        setScoreFlash({ home: homeChanged ? Date.now() : 0, away: awayChanged ? Date.now() : 0 });
      }
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
  }, [socket, room?.game_id, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white">
        <Navbar />
        <RoomSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm w-full text-center">
            {error}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/50 text-sm hover:text-white/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 rounded px-2 py-1"
          >
            Back to dashboard
          </button>
        </main>
      </div>
    );
  }

  const inviteLink = `${window.location.origin}/join/${room.invite_code}`;
  const myMember = room.members?.find((m) => m.user_id === user?.id);
  const needsStake = myMember && Number(myMember.stake) === 0;
  const myPick = picks.find((p) => p.user_id === user?.id);
  const gameStarted = room.game_status !== 'scheduled';
  const picksLocked = gameStarted || !!myPick;
  const otherMembers = room.members.filter((m) => m.user_id !== user?.id);
  const noOtherMembers = otherMembers.length === 0;
  const noPicksYet = picks.length === 0;

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

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Room header */}
        <div>
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-white/50 mt-1">
            {room.away_team} @ {room.home_team}
          </p>
        </div>

        {/* Live scoreboard */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="text-white/60 text-xs sm:text-sm mb-1 truncate max-w-full">{room.away_team}</span>
              <span
                key={`away-${scoreFlash.away}`}
                className={`text-3xl sm:text-4xl font-bold font-mono ${scoreFlash.away ? 'animate-[score-flash_0.7s_ease-out]' : ''}`}
              >
                {room.away_score ?? 0}
              </span>
            </div>
            <div className="flex flex-col items-center px-2 sm:px-3">
              <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                room.game_status === 'live'
                  ? 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40'
                  : room.game_status === 'finished'
                  ? 'bg-white/5 text-white/40 border border-white/10'
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}>
                {room.game_status === 'live' ? 'Live' : room.game_status === 'finished' ? 'Final' : 'Scheduled'}
              </span>
            </div>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="text-white/60 text-xs sm:text-sm mb-1 truncate max-w-full">{room.home_team}</span>
              <span
                key={`home-${scoreFlash.home}`}
                className={`text-3xl sm:text-4xl font-bold font-mono ${scoreFlash.home ? 'animate-[score-flash_0.7s_ease-out]' : ''}`}
              >
                {room.home_score ?? 0}
              </span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes score-flash {
            0% { color: #00ff87; transform: scale(1.1); text-shadow: 0 0 24px #00ff87; }
            100% { color: #ffffff; transform: scale(1); text-shadow: none; }
          }
        `}</style>

        {/* Game-over banner */}
        {room.game_status === 'finished' && room.winner && (
          <div className="bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl p-4 text-center">
            <p className="text-white/60 text-xs uppercase tracking-wider">Game Over</p>
            <p className="text-[#00ff87] text-xl font-bold mt-1">{room.winner} win</p>
          </div>
        )}

        {/* Settlement banner */}
        {(settlements || room.game_status === 'finished') && (
          <button
            onClick={() => navigate(`/rooms/${id}/settlement`)}
            className="w-full bg-[#00ff87]/10 border border-[#00ff87]/30 hover:bg-[#00ff87]/20 active:bg-[#00ff87]/25 transition-colors rounded-xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
          >
            <p className="text-[#00ff87] font-semibold mb-1">Settlement ready →</p>
            <p className="text-white/60 text-sm">View the final results and who pays who.</p>
          </button>
        )}

        {/* Stake banner */}
        {needsStake && (
          <div className="bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl p-4">
            <p className="text-[#00ff87] font-semibold mb-3">You haven't set your stake yet</p>
            <form onSubmit={handleStakeSave} className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="Enter amount ($)"
                aria-label="Stake amount"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87]/50 transition-colors"
              />
              <button
                type="submit"
                disabled={savingStake || !stake}
                className="bg-[#00ff87] text-[#0a0f1e] font-semibold px-4 py-2 rounded-lg hover:bg-[#00e87a] active:scale-[0.98] transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
              >
                {savingStake ? 'Saving…' : 'Set Stake'}
              </button>
            </form>
            {stakeError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm mt-3">
                {stakeError}
              </div>
            )}
          </div>
        )}

        {/* Pick submission */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-white/50 text-sm">Your pick</p>
            {picksLocked && (
              <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded whitespace-nowrap">
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
                  className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all transform active:scale-95
                    ${selected
                      ? 'bg-[#00ff87] text-[#0a0f1e] shadow-[0_0_24px_-4px_#00ff87] ring-2 ring-[#00ff87]/40'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 active:bg-white/15'}
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60`}
                >
                  {team}
                </button>
              );
            })}
          </div>
          {pickError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm mt-3">
              {pickError}
            </div>
          )}
          {!myPick && !gameStarted && noPicksYet && (
            <p className="text-white/40 text-xs mt-3 text-center">Be the first to lock in your pick.</p>
          )}
        </div>

        {/* Leaderboard — comes after picks on mobile by virtue of source order */}
        <Leaderboard roomId={id} gameId={room.game_id} currentUserId={user?.id} />

        {/* Invite link */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-2">Invite link</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2 truncate font-mono">
              {inviteLink}
            </span>
            <button
              onClick={handleCopy}
              aria-label="Copy invite link"
              className={`text-sm px-3 py-2 rounded-lg transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 ${
                copied
                  ? 'bg-[#00ff87] text-[#0a0f1e] font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {noOtherMembers && (
            <p className="text-white/40 text-xs mt-3">Share your invite link to get friends in.</p>
          )}
        </div>

        {/* Members + picks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-3">Members ({room.members.length})</p>
          <div className="flex flex-col gap-2">
            {room.members.map((m) => {
              const memberPick = picks.find((p) => p.user_id === m.user_id);
              return (
                <div key={m.user_id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{m.username}</span>
                    {m.user_id === user?.id && (
                      <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">you</span>
                    )}
                    {m.user_id === room.created_by && (
                      <span className="text-xs text-[#00ff87]/60 bg-[#00ff87]/10 px-1.5 py-0.5 rounded">host</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
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
