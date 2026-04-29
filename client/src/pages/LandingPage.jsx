import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import anime from 'animejs';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const heroRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    document.title = 'Courtside — Pick\'em with friends';
    anime({
      targets: heroRef.current,
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 700,
      easing: 'easeOutCubic',
    });
    anime({
      targets: bodyRef.current,
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 700,
      delay: 180,
      easing: 'easeOutCubic',
    });
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 py-16">
      <div ref={heroRef} className="text-center" style={{ opacity: 0 }}>
        <span className="font-display text-[80px] sm:text-[112px] leading-none tracking-wide">
          COURT<span className="text-[#00FF87]">SIDE</span>
        </span>
        <p className="text-white/25 text-xs tracking-[0.4em] uppercase mt-1">Pick'em</p>
        <p className="mt-6 text-white/70 text-xl sm:text-2xl font-light leading-snug">
          Pick your winners.<br />Settle the score.
        </p>
      </div>

      <div ref={bodyRef} className="mt-12 w-full max-w-sm" style={{ opacity: 0 }}>
        <p className="text-white/35 text-sm text-center leading-relaxed mb-8">
          Create a private room tied to any live NBA game and invite your friends.
          Everyone locks in a pick and a stake — then watch the leaderboard update
          in real time as the game plays out. When the buzzer sounds, Courtside
          calculates the minimum transfers to settle every debt.
        </p>

        <div className="flex items-center justify-center gap-2 mb-8 text-[11px] text-white/25 uppercase tracking-wider">
          <span>Create a room</span>
          <span className="text-[#00FF87]/35">→</span>
          <span>Lock your pick</span>
          <span className="text-[#00FF87]/35">→</span>
          <span>Settle up</span>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/register"
            className="w-full bg-[#00FF87] text-[#080808] font-bold py-3.5 rounded-xl hover:bg-[#00e87a] active:scale-[0.99] transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/60"
          >
            Get Started
          </Link>
          <p className="text-white/30 text-sm text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-[#00FF87] hover:text-[#00e87a] transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
