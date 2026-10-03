import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, post, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [system, setSystem] = useState({ installed: false, site_name: 'WordCraft AI', signup_enabled: true });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); return; }
    try {
      const data = await get('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await get('/system/status');
        setSystem(s);
        document.title = s.site_name || 'WordCraft AI';
      } catch { /* keep defaults */ }
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email, password) => {
    const data = await post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, ref) => {
    const data = await post('/auth/register', { name, email, password, ref });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, system, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
