import { Moon, Sun, Languages } from 'lucide-react';
import { usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/** Saves to the account when signed in; otherwise only changes the browser's preference. */
function usePersist() {
  const { user, saveSettings } = useAuth();
  const toast = useToast();
  const { t } = usePrefs();
  return async (patch, fallback) => {
    if (!user) return fallback(patch);
    try {
      await saveSettings(patch);
    } catch {
      toast.error(t('errors.SAVE_PREFERENCE_FAILED'));
    }
  };
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = usePrefs();
  const persist = usePersist();
  const pick = (l) => l !== lang && persist({ language: l }, ({ language }) => setLang(language));
  return (
    <div className="seg" role="group" aria-label={t('common.language')}>
      <Languages size={15} className="seg-icon" />
      <button className={lang === 'en' ? 'active' : ''} onClick={() => pick('en')} lang="en">
        EN
      </button>
      <button className={lang === 'fa' ? 'active' : ''} onClick={() => pick('fa')} lang="fa">
        فا
      </button>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, t } = usePrefs();
  const persist = usePersist();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="icon-btn"
      onClick={() => persist({ theme: next }, ({ theme: th }) => setTheme(th))}
      aria-label={t('common.toggleTheme')}
      title={t('common.toggleTheme')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
