import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, usersApi } from '../services/endpoints.js';
import { tokenStore } from '../services/api.js';
import { usePrefs } from './PrefsContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setLang, setTheme } = usePrefs();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const applySession = useCallback(
    (u, s) => {
      setUser(u);
      setSettings(s);
      // The language / theme saved in the account follow the user to every device.
      if (s?.language) setLang(s.language);
      if (s?.theme) setTheme(s.theme);
    },
    [setLang, setTheme],
  );

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setSettings(null);
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    authApi
      .me()
      .then((r) => !cancelled && applySession(r.user, r.settings))
      .catch((err) => {
        // Only an invalid session logs the user out; a network hiccup should not.
        if (!cancelled && err.response && [401, 403].includes(err.response.status)) clearSession();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener('ftj:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ftj:unauthorized', onUnauthorized);
  }, [clearSession]);

  const login = useCallback(
    async ({ identifier, password, rememberMe }) => {
      const r = await authApi.login({ identifier, password, rememberMe });
      tokenStore.set(r.token, rememberMe);
      applySession(r.user, r.settings);
      return r.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const r = await authApi.register(payload);
      tokenStore.set(r.token, false);
      applySession(r.user, r.settings);
      return r.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* the token is discarded either way */
    }
    clearSession();
  }, [clearSession]);

  /** Applies a settings change immediately and saves it to the database. */
  const saveSettings = useCallback(
    async (patch) => {
      if (patch.language) setLang(patch.language);
      if (patch.theme) setTheme(patch.theme);
      const r = await usersApi.updateSettings(patch);
      setSettings(r.settings);
      return r.settings;
    },
    [setLang, setTheme],
  );

  const value = useMemo(
    () => ({ user, settings, loading, isAdmin: user?.role === 'ADMIN', login, register, logout, saveSettings, setUser }),
    [user, settings, loading, login, register, logout, saveSettings],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
