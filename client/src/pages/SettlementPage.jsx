import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { CountUp } from 'countup.js';
import anime from 'animejs';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import TeamLogo from '../components/TeamLogo';

function SettlementSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8 animate-pulse">
      <div className="text-center">
        <div className="h-3 w-16 bg-white/10 rounded mx-auto mb-4" />
        <div className="h-20 w-72 bg-white/10 rounded mx-auto mb-3" />
        <div className="h-6 w-40 bg-white/10 rounded mx-auto" />
      </div>
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-5">
        <div className="h-5 w-36 bg-white/10 rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 border border-white/[0.07] rounded-2xl mb-2" />
        ))}
      </div>
      <div>
        <div className="h-5 w-28 bg-white/10 rounded mb-4" />
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-white/[0.03] border border-white/[0.08] rounded-3xl mb-3" />
        ))}
      </div>
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
  const [confettiData, setConfettiData] = useState(null);

  const transfersContainerRef = useRef(null);
  const amountRefs = useRef([]);

  useEffect(() => {
    document.title = 'Courtside — Settlement';
    // Load confetti animation JSON
    fetch('https://assets3.lottiefiles.com/packages/lf20_obhph3t4.json')
      .then((r) => r.json())
      .then(setConfettiData)
      .catch(() => {}); // confetti is optional
  }, []);

  useEffect(() => {
    api
      .get(`/rooms/${id}/settlement`)
      .then((res) => {
        setData(res.data);
        if (res.data?.room) {
          document.title = `Courtside — Settlement · ${res.data.room.name}`;
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load settlement'))
      .finally(() => setLoading(false));
  }, [id]);

  // Anime.js stagger on transfer cards after data loads
  useEffect(() => {
    if (!data || loading) return;
    const raf = requestAnimationFrame(() => {
      const cards = transfersContainerRef.current?.querySelectorAll('.transfer-card');
      if (!cards?.length) return;
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [32, 0],
        delay: anime.stagger(110),
        duration: 600,
        easing: 'easeOutCubic',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [data, loading]);

  // CountUp on dollar amounts
  useEffect(() => {
    if (!data || loading) return;
    data.transfers.forEach((t, idx) => {
      const el = amountRefs.current[idx];
      if (!el) return;
      new CountUp(el, t.amount, {
        startVal: 0,
        decimalPlaces: 2,
        prefix: '$',
        duration: 1.2,
        delay: idx * 0.1,
      }).start();
    });
  }, [data, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-white">
        <Navbar />
        <SettlementSkeleton />
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

  const { room, transfers, noContestGames, finalRanking } = data;
  const allSquare = transfers.length === 0 && noContestGames.length === 0;
  const onlyNoContest = transfers.length === 0 && noContestGames.length > 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />

      {/* Lottie confetti overlay — plays once */}
      {confettiData && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Lottie
            animationData={confettiData}
            loop={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">
        {/* Game Over hero */}
        <div className="text-center py-4">
          <p className="text-white/30 text-xs uppercase tracking-[0.4em] mb-3">Final</p>
          <h1 className="font-display text-7xl sm:text-9xl leading-none tracking-wide mb-3">
            GAME OVER
          </h1>
          {room.winner ? (
            <div className="flex items-center justify-center gap-2 text-[#00FF87] text-xl font-semibold">
              <TeamLogo teamName={room.winner} size={24} />
              <span>{room.winner} win</span>
            </div>
          ) : (
            <p className="text-white/40">No winner declared</p>
          )}
          <p className="text-white/30 text-sm mt-1">{room.name}</p>
        </div>

        {/* Final Standings */}
        {finalRanking.length > 0 && (
          <section className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-5">
            <h2 className="font-display text-2xl tracking-wide mb-4">Final Standings</h2>
            <div className="flex flex-col gap-2">
              {finalRanking.map((m, idx) => {
                const isMe = m.userId === user?.id;
                const isLeader = idx === 0 && m.netPosition > 0;
                const isPositive = m.netPosition >= 0;
                const sign = m.netPosition > 0 ? '+' : '';
                return (
                  <div
                    key={m.userId}
                    className={`flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-2xl border
                      ${isLeader
                        ? 'bg-gradient-to-r from-[#00FF87]/[0.07] to-transparent border-[#00FF87]/30'
                        : 'bg-white/[0.04] border-white/[0.07]'}`}
                  >
                    <span className={`font-display text-3xl w-7 text-center flex-shrink-0 ${isLeader ? 'text-[#00FF87]' : 'text-white/20'}`}>
                      {idx + 1}
                    </span>
                    <Avatar username={m.username} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{m.username}</span>
                        {isMe && (
                          <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">you</span>
                        )}
                      </div>
                      {m.pickValue && (
                        <div className="text-xs text-white/35 mt-0.5 flex items-center gap-1.5">
                          <TeamLogo teamName={m.pickValue} size={14} />
                          <span className="truncate">{m.pickValue}</span>
                          <span className={`font-semibold flex-shrink-0 ${m.isCorrect ? 'text-[#00FF87]' : 'text-[#FF3B3B]'}`}>
                            {m.isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`font-display text-xl tabular-nums flex-shrink-0 ${isPositive ? 'text-[#00FF87]' : 'text-[#FF3B3B]'}`}>
                      {sign}${Math.abs(m.netPosition).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Settlement */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-2xl tracking-wide">Settlement</h2>
            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">Receipt</span>
          </div>

          {allSquare && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87] text-3xl">
                ✓
              </div>
              <p className="font-display text-3xl tracking-wide mb-1">ALL SQUARE</p>
              <p className="text-white/40 text-sm">No money moves.</p>
            </div>
          )}

          {onlyNoContest && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-10 text-center">
              <p className="font-display text-3xl tracking-wide mb-1">NO CONTEST</p>
              <p className="text-white/40 text-sm">Everyone agreed — no transfers needed.</p>
            </div>
          )}

          {transfers.length > 0 && (
            <div ref={transfersContainerRef} className="flex flex-col gap-3">
              {transfers.map((t, idx) => (
                <div
                  key={`${t.fromUserId}-${t.toUserId}-${idx}`}
                  className="transfer-card bg-white/[0.03] border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar username={t.fromUsername} size={48} className="ring-2 ring-[#FF3B3B]/40" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-semibold truncate">{t.fromUsername}</span>
                        <span className="text-white/30">pays</span>
                        <span className="font-semibold text-[#00FF87] truncate">{t.toUsername}</span>
                      </div>
                      <div className="text-xs text-white/30 mt-1 flex items-center gap-1.5">
                        <span className="truncate max-w-[80px]">{t.fromUsername}</span>
                        <span className="text-[#00FF87]">→</span>
                        <span className="truncate max-w-[80px]">{t.toUsername}</span>
                      </div>
                    </div>
                    <Avatar username={t.toUsername} size={48} className="ring-2 ring-[#00FF87]/40" />
                  </div>
                  <span
                    ref={(el) => { amountRefs.current[idx] = el; }}
                    className="font-display text-4xl text-[#00FF87] tabular-nums sm:pl-4 text-right"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* No contest games */}
        {noContestGames.length > 0 && (
          <section className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5">
            <p className="text-white/25 text-xs uppercase tracking-wider mb-3">No contest — everyone agreed</p>
            <div className="flex flex-col gap-2">
              {noContestGames.map((g) => (
                <div key={g.gameId} className="flex items-center justify-between text-sm gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-white/35 min-w-0">
                    <TeamLogo teamName={g.awayTeam} size={16} />
                    <span className="truncate">{g.awayTeam}</span>
                    <span className="text-white/20 flex-shrink-0">@</span>
                    <TeamLogo teamName={g.homeTeam} size={16} />
                    <span className="truncate">{g.homeTeam}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/25 whitespace-nowrap flex-shrink-0">
                    {g.pickValue && <TeamLogo teamName={g.pickValue} size={14} />}
                    <span>{g.pickValue ? `Picked ${g.pickValue}` : 'No transfer'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#00FF87] text-[#080808] font-bold text-xl py-4 rounded-2xl hover:bg-[#00e87a] active:scale-[0.99] transition-all mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/60"
        >
          Done
        </button>
      </main>
    </div>
  );
}
