import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import anime from 'animejs';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cardRef = useRef(null);

  useEffect(() => {
    document.title = 'Courtside — Sign in';
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div ref={cardRef} className="w-full max-w-md" style={{ opacity: 0 }}>
        <div className="text-center mb-10">
          <span className="font-display text-7xl text-[#00FF87] tracking-wide">COURTSIDE</span>
          <p className="text-white/25 text-xs tracking-[0.4em] uppercase mt-2">Pick'em</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-2xl tracking-wide mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] rounded-xl px-4 py-2.5 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 focus:border-[#00FF87]/40 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 focus:border-[#00FF87]/40 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00FF87] text-[#080808] font-bold py-3.5 rounded-xl hover:bg-[#00e87a] active:scale-[0.99] transition-all disabled:opacity-50 mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-white/30 text-sm text-center mt-6">
            No account?{' '}
            <Link to="/register" className="text-[#00FF87] hover:text-[#00e87a] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
