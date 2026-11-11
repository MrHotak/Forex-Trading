import { Link, Outlet } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useT } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { LanguageSwitcher, ThemeToggle } from '../components/Switchers.jsx';
import Footer from '../components/Footer.jsx';

export default function PublicLayout() {
  const t = useT();
  const { user } = useAuth();
  return (
    <div className="public">
      <header className="public-bar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <TrendingUp size={18} />
          </span>
          <span className="brand-text">
            <strong>{t('brand.short')}</strong>
          </span>
        </Link>
        <div className="public-bar-right">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <Link className="btn btn-primary btn-sm" to={user.role === 'ADMIN' ? '/admin' : '/app'}>
              {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm hide-mobile" to="/login">
                {t('auth.login')}
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                {t('auth.register')}
              </Link>
            </>
          )}
        </div>
      </header>
      <Outlet />
      <Footer />
    </div>
  );
}
