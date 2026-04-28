import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CountUp } from 'countup.js';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';
import Avatar from './Avatar';

function ScoreTicker({ gameStatus, awayTeam, homeTeam, awayScore, homeScore }) {
  if (gameStatus === 'scheduled') return null;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 mb-4 bg-white/[0.04] rounded-2xl border border-white/[0.08]">
      <span className="font-display text-3xl tabular-nums">{awayScore ?? 0}</span>
      <div className="flex items-center gap-2 text-xs text-white/40 min-w-0 mx-3">
        <span className="truncate max-w-[72px]">{awayTeam}</span>
        <span className="text-white/20 flex-shrink-0">vs</span>
        <span className="truncate max-w-[72px]">{homeTeam}</span>
        {gameStatus === 'live' && (
          <span className="font-bold text-[#FF3B3B] uppercase tracking-wider flex-shrink-0 animate-[live-pulse_1.2s_ease-in-out_infinite]">
            LIVE
          </span>
        )}
        {gameStatus === 'finished' && (
          <span className="text-white/30 uppercase tracking-wider flex-shrink-0">Final</span>
        )}
      </div>
      <span className="font-display text-3xl tabular-nums">{homeScore ?? 0}</span>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 animate-pulse">
      <div className="h-5 w-32 bg-white/10 rounded mb-5" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]" style={{ height: 88 }}>
            <div className="h-10 w-8 bg-white/10 rounded" />
            <div className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-white/10 rounded mb-2" />
              <div className="h-3 w-36 bg-white/10 rounded" />
            </div>
            <div className="h-6 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard({ roomId, gameId, currentUserId }) {
  const socket = useSocket();
  const [data, setData] = useState(null);
  const fetchingRef = useRef(false);

  const netPosRefs = useRef(new Map());
  const countUpMap  = useRef(new Map());
  const prevDataRef = useRef(null);

  async function refetch() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data: d } = await api.get(`/rooms/${roomId}/leaderboard`);
      setData(d);
    } catch {
      // ignore
    } finally {
      fetchingRef.current = false;
    }
  }

  useEffect(() => { refetch(); }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    const onScore = ({ gameId: gid }) => { if (gid === gameId) refetch(); };
    const onFinished = ({ gameId: gid }) => { if (gid === gameId) refetch(); };
    socket.on('score:update', onScore);
    socket.on('game:finished', onFinished);
    return () => {
      socket.off('score:update', onScore);
      socket.off('game:finished', onFinished);
    };
  }, [socket, gameId]);

  // Initialise CountUp instances on first data load
  useEffect(() => {
    if (!data) return;
    data.members.forEach((m) => {
      const el = netPosRefs.current.get(m.userId);
      if (!el || countUpMap.current.has(m.userId)) return;
      const absVal = Math.abs(m.netPosition);
      const sign = m.netPosition >= 0 ? '+$' : '-$';
      const cu = new CountUp(el, absVal, {
        startVal: 0,
        decimalPlaces: 2,
        duration: 1.4,
        formattingFn: (n) => sign + Math.abs(n).toFixed(2),
      });
      cu.start();
      countUpMap.current.set(m.userId, cu);
    });
    prevDataRef.current = data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.members?.length]);

  // On subsequent refetches — update existing CountUp instances
  useEffect(() => {
    if (!data || !prevDataRef.current) { prevDataRef.current = data; return; }
    data.members.forEach((m) => {
      const cu = countUpMap.current.get(m.userId);
      if (cu) {
        const absVal = Math.abs(m.netPosition);
        const sign = m.netPosition >= 0 ? '+$' : '-$';
        // Patch the formattingFn to reflect the current sign
        cu.options.formattingFn = (n) => sign + Math.abs(n).toFixed(2);
        cu.update(absVal);
      }
    });
    prevDataRef.current = data;
  }, [data]);

  if (!data) return <LeaderboardSkeleton />;

  const { members, noContest, gameStatus, projectedWinner } = data;
  const awayScore = data.awayScore ?? null;
  const homeScore = data.homeScore ?? null;
  const awayTeam  = data.awayTeam  ?? '';
  const homeTeam  = data.homeTeam  ?? '';

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5">
      <ScoreTicker
        gameStatus={gameStatus}
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        awayScore={awayScore}
        homeScore={homeScore}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl tracking-wide">Leaderboard</h2>
        <div className="flex items-center gap-2">
          {noContest && gameStatus !== 'scheduled' && (
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
              No contest
            </span>
          )}
          {gameStatus === 'live' && projectedWinner && (
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/25">
              {projectedWinner} projected
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <AnimatePresence>
          {members.map((m, idx) => {
            const isMe = m.userId === currentUserId;
            const isLeader = idx === 0 && (m.netPosition > 0 || gameStatus === 'finished');
            const isPositive = m.netPosition >= 0;

            return (
              <motion.div
                key={m.userId}
                layout
                layoutId={String(m.userId)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl border mb-2 last:mb-0
                  ${isLeader
                    ? 'bg-gradient-to-r from-[#00FF87]/[0.07] to-transparent border-[#00FF87]/30 animate-[glow-pulse_2.5s_ease-in-out_infinite]'
                    : 'bg-white/[0.04] border-white/[0.07]'}`}
              >
                <span className={`font-display text-5xl w-10 text-center leading-none flex-shrink-0
                  ${isLeader ? 'text-[#00FF87]' : 'text-white/20'}`}>
                  {idx + 1}
                </span>

                <Avatar username={m.username} size={44} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{m.username}</span>
                    {isMe && (
                      <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/30 uppercase tracking-wider flex-shrink-0">
                        you
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/35 mt-0.5">
                    {m.pickValue ? `Pick: ${m.pickValue}` : 'No pick'}
                    {gameStatus === 'finished' && m.pickValue && (
                      <span className={`ml-1.5 font-semibold ${m.isCorrect ? 'text-[#00FF87]' : 'text-[#FF3B3B]'}`}>
                        {m.isCorrect ? '✓' : '✗'}
                      </span>
                    )}
                    <span className="ml-2 text-white/20">${Number(m.stake).toFixed(2)}</span>
                  </div>
                </div>

                <span
                  ref={(el) => { if (el) netPosRefs.current.set(m.userId, el); }}
                  className={`font-display text-2xl tabular-nums flex-shrink-0
                    ${isPositive ? 'text-[#00FF87]' : 'text-[#FF3B3B]'}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
