import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Courtside — Create account';
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-[#00ff87] mb-8 text-center">Courtside</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-white text-sm mb-1" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={form.username}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87] transition-colors"
              placeholder="yourname"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87] transition-colors"
              placeholder="min. 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff87] text-[#0a0f1e] font-bold py-3 rounded-lg hover:bg-[#00e87a] active:scale-[0.99] transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-white/50 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#00ff87] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
