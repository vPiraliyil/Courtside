import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';
import Leaderboard from '../components/Leaderboard';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import CountdownTimer from '../components/CountdownTimer';
import TeamLogo from '../components/TeamLogo';

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {});
}

function RoomSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 animate-pulse">
      <div className="text-center">
        <div className="h-3 w-24 bg-white/10 rounded mx-auto mb-3" />
        <div className="h-16 w-80 bg-white/10 rounded mx-auto" />
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-16 w-14 bg-white/10 rounded" />
          </div>
          <div className="h-5 w-16 bg-white/10 rounded-full" />
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-16 w-14 bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[68px] bg-white/[0.04] border border-white/[0.08] rounded-2xl" />
        <div className="h-[68px] bg-white/[0.04] border border-white/[0.08] rounded-2xl" />
      </div>
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5">
        <div className="h-5 w-28 bg-white/10 rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[88px] bg-white/[0.04] border border-white/[0.07] rounded-2xl mb-2" />
        ))}
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
    if (room) document.title = `Courtside — ${room.away_team} vs ${room.home_team}`;
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
      setRoom((prev) => ({ ...prev, home_score: homeScore, away_score: awayScore, game_status: status }));
    };
    const onFinished = ({ gameId, winner }) => {
      if (gameId !== room.game_id) return;
      setRoom((prev) => ({ ...prev, game_status: 'finished', winner }));
    };
    const onSettlement = ({ roomId }) => {
      if (roomId !== id) return;
      setSettlements(true);
      navigate(`/rooms/${id}/settlement`);
    };
    const onMemberJoined = ({ userId, username, stake }) => {
      setRoom((prev) => {
        if (!prev || prev.members.some((m) => m.user_id === userId)) return prev;
        return { ...prev, members: [...prev.members, { user_id: userId, username, stake }] };
      });
    };

    socket.on('score:update', onScore);
    socket.on('game:finished', onFinished);
    socket.on('settlement:ready', onSettlement);
    socket.on('member:joined', onMemberJoined);
    return () => {
      socket.off('score:update', onScore);
      socket.off('game:finished', onFinished);
      socket.off('settlement:ready', onSettlement);
      socket.off('member:joined', onMemberJoined);
      socket.emit('leave:room', { roomId: id });
    };
  }, [socket, room?.game_id, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-white">
        <Navbar />
        <RoomSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080808] text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-4">
          <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-2xl px-4 py-3 text-sm w-full text-center">
            {error}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/40 text-sm hover:text-white/70 transition-colors"
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
  const noOtherMembers = room.members.filter((m) => m.user_id !== user?.id).length === 0;
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
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">

        {/* Matchup header */}
        <div className="text-center py-2">
          <p className="text-white/30 text-xs uppercase tracking-[0.3em] mb-4">{room.name}</p>
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo teamName={room.away_team} size={56} />
              <span className="font-display text-2xl sm:text-4xl leading-none tracking-wide text-center">{room.away_team}</span>
            </div>
            <span className="font-display text-3xl sm:text-5xl text-white/20 flex-shrink-0">@</span>
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo teamName={room.home_team} size={56} />
              <span className="font-display text-2xl sm:text-4xl leading-none tracking-wide text-center">{room.home_team}</span>
            </div>
          </div>
        </div>

        {/* Scoreboard or Countdown */}
        {room.game_status === 'scheduled' ? (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-5">Tip-off in</p>
            <CountdownTimer targetDate={room.starts_at} />
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-white/40 text-xs mb-1 truncate max-w-full">{room.away_team}</span>
                <span
                  key={`away-${scoreFlash.away}`}
                  className={`font-display text-6xl sm:text-7xl leading-none tabular-nums
                    ${scoreFlash.away ? 'animate-[score-flash_0.7s_ease-out]' : ''}`}
                >
                  {room.away_score ?? 0}
                </span>
              </div>
              <div className="flex flex-col items-center px-2 sm:px-3 gap-1.5">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap
                  ${room.game_status === 'live'
                    ? 'bg-[#FF3B3B]/15 text-[#FF3B3B] border border-[#FF3B3B]/40 animate-[live-pulse_1.2s_ease-in-out_infinite]'
                    : room.game_status === 'finished'
                    ? 'bg-white/5 text-white/30 border border-white/10'
                    : 'bg-white/10 text-white/50 border border-white/15'}`}
                >
                  {room.game_status === 'live' ? 'LIVE' : room.game_status === 'finished' ? 'FINAL' : 'SCH'}
                </span>
              </div>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-white/40 text-xs mb-1 truncate max-w-full">{room.home_team}</span>
                <span
                  key={`home-${scoreFlash.home}`}
                  className={`font-display text-6xl sm:text-7xl leading-none tabular-nums
                    ${scoreFlash.home ? 'animate-[score-flash_0.7s_ease-out]' : ''}`}
                >
                  {room.home_score ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Game-over banner */}
        {room.game_status === 'finished' && room.winner && (
          <div className="bg-[#00FF87]/[0.07] border border-[#00FF87]/25 rounded-2xl p-4 text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider">Game Over</p>
            <p className="font-display text-3xl text-[#00FF87] tracking-wide mt-1">{room.winner} Win</p>
          </div>
        )}

        {/* Settlement banner */}
        {(settlements || room.game_status === 'finished') && (
          <button
            onClick={() => navigate(`/rooms/${id}/settlement`)}
            className="w-full bg-[#00FF87]/[0.07] border border-[#00FF87]/25 hover:bg-[#00FF87]/[0.12] active:bg-[#00FF87]/[0.15] transition-colors rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50"
          >
            <p className="text-[#00FF87] font-semibold mb-0.5">Settlement ready →</p>
            <p className="text-white/40 text-sm">View final results and who pays who.</p>
          </button>
        )}

        {/* Stake banner */}
        {needsStake && (
          <div className="bg-[#00FF87]/[0.07] border border-[#00FF87]/25 rounded-2xl p-4">
            <p className="text-[#00FF87] font-semibold mb-3">Set your stake to play</p>
            <form onSubmit={handleStakeSave} className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="Amount ($)"
                aria-label="Stake amount"
                className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 transition-colors"
              />
              <button
                type="submit"
                disabled={savingStake || !stake}
                className="bg-[#00FF87] text-[#080808] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#00e87a] active:scale-[0.98] transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50"
              >
                {savingStake ? 'Saving…' : 'Set Stake'}
              </button>
            </form>
            {stakeError && (
              <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-xl px-3 py-2 text-sm mt-3">
                {stakeError}
              </div>
            )}
          </div>
        )}

        {/* Pick buttons — oversized */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/40 text-xs uppercase tracking-wider">Your pick</p>
            {picksLocked && (
              <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {gameStarted ? 'Game started' : 'Locked'}
              </span>
            )}
          </div>
          {[room.away_team, room.home_team].map((team) => {
            const selected = myPick?.pick_value === team;
            return (
              <button
                key={team}
                disabled={picksLocked || submitting}
                onClick={() => handlePickSubmit(team)}
                style={{ height: '68px' }}
                className={`w-full rounded-2xl font-display text-3xl tracking-wide transition-all duration-150 active:scale-95
                  flex items-center justify-center gap-3
                  ${selected
                    ? 'bg-[#00FF87] text-[#080808] shadow-[0_0_32px_-4px_rgba(0,255,135,0.5)]'
                    : 'bg-white/[0.05] border border-white/[0.10] text-white hover:bg-white/[0.09] hover:border-white/[0.16]'}
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50`}
              >
                <TeamLogo teamName={team} size={30} className={selected ? 'opacity-80' : 'opacity-70'} />
                {team}
              </button>
            );
          })}
          {pickError && (
            <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-xl px-3 py-2 text-sm">
              {pickError}
            </div>
          )}
          {!myPick && !gameStarted && noPicksYet && (
            <p className="text-white/25 text-xs text-center mt-1">Be the first to lock in your pick.</p>
          )}
        </div>

        {/* Leaderboard */}
        <Leaderboard roomId={id} gameId={room.game_id} currentUserId={user?.id} />

        {/* Invite link */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Invite link</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm text-white/60 bg-white/[0.05] rounded-xl px-3 py-2 truncate font-mono">
              {inviteLink}
            </span>
            <button
              onClick={handleCopy}
              aria-label="Copy invite link"
              className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 ${
                copied
                  ? 'bg-[#00FF87] text-[#080808]'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.12] active:bg-white/[0.16]'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {noOtherMembers && (
            <p className="text-white/25 text-xs mt-3">Share your invite link to get friends in.</p>
          )}
        </div>

        {/* Member avatar row */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-white/35 text-xs uppercase tracking-wider mb-3">Members ({room.members.length})</p>
          <div className="flex flex-wrap gap-4">
            {room.members.map((m) => {
              const memberPick = picks.find((p) => p.user_id === m.user_id);
              const hasPicked = !!memberPick;
              return (
                <div key={m.user_id} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <Avatar
                      username={m.username}
                      size={48}
                      className={`${m.user_id === user?.id ? 'ring-2 ring-[#00FF87]/60' : ''}`}
                    />
                    {hasPicked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00FF87] flex items-center justify-center text-[#080808] text-[10px] font-black leading-none border-2 border-[#080808]">
                        ✓
                      </div>
                    )}
                    {m.user_id === room.created_by && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] leading-none">
                        👑
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/40 max-w-[52px] truncate text-center">{m.username}</span>
                  {memberPick && (
                    <span className="text-[10px] text-[#00FF87]/70 truncate max-w-[64px] text-center">{memberPick.pick_value}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
