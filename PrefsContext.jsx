import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../translations/index.js';

const PrefsContext = createContext(null);

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
}

/**
 * Language + theme. The browser copy is only a cache so public pages (login, landing) open in the
 * right language; for signed-in users the value stored in the database is applied after login.
 */
export function PrefsProvider({ children }) {
  const [lang, setLangState] = useState(() => (read('ftj_lang', 'en') === 'fa' ? 'fa' : 'en'));
  const [theme, setThemeState] = useState(() => (read('ftj_theme', 'dark') === 'light' ? 'light' : 'dark'));
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = dir;
    el.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1120' : '#F1F5F9');
  }, [lang, dir, theme]);

  const setLang = useCallback((l) => {
    const next = l === 'fa' ? 'fa' : 'en';
    write('ftj_lang', next);
    setLangState(next);
  }, []);
  const setTheme = useCallback((th) => {
    const next = th === 'light' ? 'light' : 'dark';
    write('ftj_theme', next);
    setThemeState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let str = lookup(translations[lang], key);
      if (typeof str !== 'string') str = lookup(translations.en, key);
      if (typeof str !== 'string') return key;
      return vars ? str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`)) : str;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, dir, theme, setLang, setTheme, t }), [lang, dir, theme, setLang, setTheme, t]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
export const useT = () => useContext(PrefsContext).t;
