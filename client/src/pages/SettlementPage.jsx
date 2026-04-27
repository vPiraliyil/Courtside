import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Avatar({ name, accent }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0
        ${accent === 'green'
          ? 'bg-[#00ff87]/15 border border-[#00ff87]/40 text-[#00ff87]'
          : 'bg-red-400/10 border border-red-400/30 text-red-300'}`}
    >
      {initial}
    </div>
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
    api
      .get(`/rooms/${id}/settlement`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load settlement'))
      .finally(() => setLoading(false));
  }, [id]);

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

  const { room, transfers, noContestGames, finalRanking } = data;
  const allSquare = transfers.length === 0 && noContestGames.length === 0;
  const onlyNoContest = transfers.length === 0 && noContestGames.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate(`/rooms/${id}`)}
          className="text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          ← Room
        </button>
        <span className="text-xl font-bold tracking-tight">
          Court<span className="text-[#00ff87]">side</span>
        </span>
        <div className="w-24" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Game Over hero */}
        <div className="text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-3">Final</p>
          <h1 className="text-5xl font-black tracking-tight mb-2">Game Over</h1>
          {room.winner ? (
            <p className="text-[#00ff87] text-lg font-semibold">{room.winner} win</p>
          ) : (
            <p className="text-white/50">No winner declared</p>
          )}
          <p className="text-white/40 mt-1 text-sm">{room.name}</p>
        </div>

        {/* Final Ranking */}
        {finalRanking.length > 0 && (
          <section className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5">
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
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border
                      ${isLeader
                        ? 'bg-gradient-to-r from-[#00ff87]/10 to-transparent border-[#00ff87]/40'
                        : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`text-2xl font-black font-mono w-8 text-center ${isLeader ? 'text-[#00ff87]' : 'text-white/30'}`}>
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
                      {m.pickValue && (
                        <div className="text-xs text-white/40 mt-0.5">
                          Pick: {m.pickValue}
                          <span className={`ml-2 ${m.isCorrect ? 'text-[#00ff87]' : 'text-red-400'}`}>
                            {m.isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`text-lg font-bold font-mono ${positiveColor}`}>
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
                  className="bg-gradient-to-r from-red-400/[0.04] via-white/5 to-[#00ff87]/[0.06] border border-white/10 rounded-2xl p-4 flex items-center gap-4"
                >
                  <Avatar name={t.fromUsername} accent="red" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold truncate">{t.fromUsername}</span>
                      <span className="text-white/30">pays</span>
                      <span className="font-semibold truncate text-[#00ff87]">{t.toUsername}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-white/40 text-xs">
                      <span>{t.fromUsername}</span>
                      <span className="text-[#00ff87]">→</span>
                      <span>{t.toUsername}</span>
                    </div>
                  </div>
                  <Avatar name={t.toUsername} accent="green" />
                  <div className="text-2xl font-black font-mono text-[#00ff87] tabular-nums pl-2">
                    ${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* No contest games */}
        {noContestGames.length > 0 && (
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">No contest</p>
            <div className="flex flex-col gap-2">
              {noContestGames.map((g) => (
                <div key={g.gameId} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {g.awayTeam} @ {g.homeTeam}
                  </span>
                  <span className="text-white/40">Everyone agreed{g.pickValue ? ` on ${g.pickValue}` : ''}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#00ff87] text-[#0a0f1e] font-bold text-lg py-4 rounded-2xl hover:bg-[#00e87a] transition-colors mt-2"
        >
          Done
        </button>
      </main>
    </div>
  );
}
