import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      const payload = decodeToken(stored);
      if (payload) {
        setToken(stored);
        setUser({ id: payload.id, username: payload.username });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access);
    setToken(data.access);
    setUser(data.user);
    const pending = localStorage.getItem('pendingInvite');
    if (pending) {
      localStorage.removeItem('pendingInvite');
      return pending;
    }
    return null;
  }

  async function register(username, email, password) {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('token', data.access);
    setToken(data.access);
    setUser(data.user);
    const pending = localStorage.getItem('pendingInvite');
    if (pending) {
      localStorage.removeItem('pendingInvite');
      return pending;
    }
    return null;
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
