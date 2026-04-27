import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Avatar({ name, accent }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <div
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0
        ${accent === 'green'
          ? 'bg-[#00ff87]/15 border border-[#00ff87]/40 text-[#00ff87]'
          : 'bg-red-400/10 border border-red-400/30 text-red-300'}`}
      aria-label={name}
    >
      {initial}
    </div>
  );
}

function SettlementSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8 animate-pulse">
      <div className="text-center">
        <div className="h-3 w-16 bg-white/10 rounded mx-auto mb-3" />
        <div className="h-12 w-56 bg-white/10 rounded mx-auto mb-3" />
        <div className="h-5 w-32 bg-white/10 rounded mx-auto" />
      </div>
      <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="h-5 w-36 bg-white/10 rounded mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 border border-white/10 rounded-xl" />
          ))}
        </div>
      </section>
      <section>
        <div className="h-5 w-28 bg-white/10 rounded mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-2xl" />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function SettlementPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Courtside — Settlement';
  }, []);

  useEffect(() => {
    if (data?.room) {
      document.title = `Courtside — Settlement · ${data.room.name}`;
    }
  }, [data?.room]);

  useEffect(() => {
    api
      .get(`/rooms/${id}/settlement`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load settlement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white">
        <Navbar />
        <SettlementSkeleton />
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

  const { room, transfers, noContestGames, finalRanking } = data;
  const allSquare = transfers.length === 0 && noContestGames.length === 0;
  const onlyNoContest = transfers.length === 0 && noContestGames.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8">
        {/* Game Over hero */}
        <div className="text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-3">Final</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">Game Over</h1>
          {room.winner ? (
            <p className="text-[#00ff87] text-lg font-semibold">{room.winner} win</p>
          ) : (
            <p className="text-white/50">No winner declared</p>
          )}
          <p className="text-white/40 mt-1 text-sm">{room.name}</p>
        </div>

        {/* Final Ranking */}
        {finalRanking.length > 0 && (
          <section className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5">
            <h2 className="text-lg font-bold tracking-tight mb-4">Final Standings</h2>
            <div className="flex flex-col gap-2">
              {finalRanking.map((m, idx) => {
                const isMe = m.userId === user?.id;
                const isLeader = idx === 0 && m.netPosition > 0;
                const positiveColor =
                  m.netPosition > 0 ? 'text-[#00ff87]' : m.netPosition < 0 ? 'text-red-400' : 'text-white/40';
                const sign = m.netPosition > 0 ? '+' : '';
                return (
                  <div
                    key={m.userId}
                    className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl border
                      ${isLeader
                        ? 'bg-gradient-to-r from-[#00ff87]/10 to-transparent border-[#00ff87]/40'
                        : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`text-xl sm:text-2xl font-black font-mono w-7 sm:w-8 text-center ${isLeader ? 'text-[#00ff87]' : 'text-white/30'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{m.username}</span>
                        {isMe && (
                          <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            you
                          </span>
                        )}
                      </div>
                      {m.pickValue && (
                        <div className="text-xs text-white/40 mt-0.5 truncate">
                          Pick: {m.pickValue}
                          <span className={`ml-2 ${m.isCorrect ? 'text-[#00ff87]' : 'text-red-400'}`}>
                            {m.isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`text-base sm:text-lg font-bold font-mono ${positiveColor} whitespace-nowrap`}>
                      {sign}${Math.abs(m.netPosition).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Settlement section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold tracking-tight">Settlement</h2>
            <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Receipt
            </span>
          </div>

          {allSquare && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#00ff87]/15 border border-[#00ff87]/40 flex items-center justify-center text-[#00ff87] text-2xl font-bold">
                ✓
              </div>
              <p className="text-xl font-bold">All square</p>
              <p className="text-white/50 text-sm mt-1">No money moves.</p>
            </div>
          )}

          {onlyNoContest && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-xl font-bold">No contest</p>
              <p className="text-white/50 text-sm mt-1">Everyone agreed — no transfers.</p>
            </div>
          )}

          {transfers.length > 0 && (
            <div className="flex flex-col gap-3">
              {transfers.map((t, idx) => (
                <div
                  key={`${t.fromUserId}-${t.toUserId}-${idx}`}
                  className="bg-gradient-to-r from-red-400/[0.04] via-white/5 to-[#00ff87]/[0.06] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Avatar name={t.fromUsername} accent="red" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-semibold truncate">{t.fromUsername}</span>
                        <span className="text-white/30">pays</span>
                        <span className="font-semibold truncate text-[#00ff87]">{t.toUsername}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-white/40 text-xs">
                        <span className="truncate">{t.fromUsername}</span>
                        <span className="text-[#00ff87]">→</span>
                        <span className="truncate">{t.toUsername}</span>
                      </div>
                    </div>
                    <Avatar name={t.toUsername} accent="green" />
                  </div>
                  <div className="text-2xl font-black font-mono text-[#00ff87] tabular-nums sm:pl-2 text-right">
                    ${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* No contest games */}
        {noContestGames.length > 0 && (
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">No contest — everyone agreed</p>
            <div className="flex flex-col gap-2">
              {noContestGames.map((g) => (
                <div key={g.gameId} className="flex items-center justify-between text-sm gap-3 flex-wrap">
                  <span className="text-white/70 truncate">
                    {g.awayTeam} @ {g.homeTeam}
                  </span>
                  <span className="text-white/40 whitespace-nowrap">{g.pickValue ? `Picked ${g.pickValue}` : 'No transfer'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#00ff87] text-[#0a0f1e] font-bold text-lg py-4 rounded-2xl hover:bg-[#00e87a] active:scale-[0.99] transition-all mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
        >
          Done
        </button>
      </main>
    </div>
  );
}
