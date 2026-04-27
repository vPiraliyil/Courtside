import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';

const ROW_HEIGHT = 72;
const ROW_GAP = 8;

export default function Leaderboard({ roomId, gameId, currentUserId }) {
  const socket = useSocket();
  const [data, setData] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);
  const fetchingRef = useRef(false);

  async function refetch() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await api.get(`/rooms/${roomId}/leaderboard`);
      setData(data);
    } catch {
      // ignore
    } finally {
      fetchingRef.current = false;
    }
  }

  useEffect(() => {
    refetch();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    const onScore = ({ gameId: gid }) => {
      if (gid !== gameId) return;
      setPulseKey((k) => k + 1);
      refetch();
    };
    const onFinished = ({ gameId: gid }) => {
      if (gid !== gameId) return;
      refetch();
    };
    socket.on('score:update', onScore);
    socket.on('game:finished', onFinished);
    return () => {
      socket.off('score:update', onScore);
      socket.off('game:finished', onFinished);
    };
  }, [socket, gameId]);

  if (!data) {
    return (
      <div className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-28 bg-white/10 rounded" />
          <div className="h-5 w-24 bg-white/10 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10" style={{ height: ROW_HEIGHT }}>
              <div className="h-7 w-7 bg-white/10 rounded" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/10 rounded" />
              </div>
              <div className="h-5 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { members, noContest, gameStatus, projectedWinner } = data;
  const containerHeight = members.length * ROW_HEIGHT + Math.max(0, members.length - 1) * ROW_GAP;

  return (
    <div className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">Leaderboard</h2>
        <div className="flex items-center gap-2">
          {noContest && gameStatus !== 'scheduled' && (
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
              No contest
            </span>
          )}
          {gameStatus === 'live' && projectedWinner && (
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00ff87]/15 text-[#00ff87] border border-[#00ff87]/30">
              Projected: {projectedWinner}
            </span>
          )}
        </div>
      </div>

      <div className="relative" style={{ height: containerHeight }}>
        {members.map((m, idx) => {
          const isMe = m.userId === currentUserId;
          const isLeader = idx === 0 && (m.netPosition > 0 || gameStatus === 'finished');
          const top = idx * (ROW_HEIGHT + ROW_GAP);
          const positiveColor = m.netPosition > 0 ? 'text-[#00ff87]' : m.netPosition < 0 ? 'text-red-400' : 'text-white/40';
          const sign = m.netPosition > 0 ? '+' : '';
          return (
            <div
              key={m.userId}
              className={`absolute left-0 right-0 flex items-center gap-4 px-4 rounded-xl border transition-all duration-500 ease-out
                ${isLeader
                  ? 'bg-gradient-to-r from-[#00ff87]/10 to-transparent border-[#00ff87]/40 shadow-[0_0_24px_-8px_#00ff87]'
                  : 'bg-white/5 border-white/10'}
              `}
              style={{ top, height: ROW_HEIGHT }}
            >
              <div className={`text-3xl font-black font-mono w-10 text-center ${isLeader ? 'text-[#00ff87]' : 'text-white/30'}`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{m.username}</span>
                  {isMe && (
                    <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      you
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {m.pickValue ? `Pick: ${m.pickValue}` : 'No pick'}
                  {gameStatus === 'finished' && m.pickValue && (
                    <span className={`ml-2 ${m.isCorrect ? 'text-[#00ff87]' : 'text-red-400'}`}>
                      {m.isCorrect ? '✓' : '✗'}
                    </span>
                  )}
                  <span className="ml-2 text-white/30">${m.stake.toFixed(2)} stake</span>
                </div>
              </div>
              <div
                key={`${m.userId}-${pulseKey}`}
                className={`text-xl font-bold font-mono ${positiveColor} ${pulseKey ? 'animate-[pulse_0.6s_ease-out]' : ''}`}
              >
                {sign}${Math.abs(m.netPosition).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
