import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, TrendingUp, X } from 'lucide-react';
import { useT } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { LanguageSwitcher, ThemeToggle } from '../components/Switchers.jsx';
import Footer from '../components/Footer.jsx';

/** Sidebar + top bar used by both the trader area and the admin panel. */
export default function Shell({ items, extraItems = [], badge }) {
  const t = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const link = ({ to, icon: Icon, label, end }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      <Icon size={18} />
      <span>{t(label)}</span>
    </NavLink>
  );

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark">
              <TrendingUp size={18} />
            </span>
            <span className="brand-text">
              <strong>{t('brand.short')}</strong>
              {badge && <small className="brand-badge">{t(badge)}</small>}
            </span>
          </div>
          <button className="icon-btn only-mobile" onClick={() => setOpen(false)} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {items.map(link)}
          {extraItems.length > 0 && <div className="nav-sep" />}
          {extraItems.map(link)}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{(user?.fullName || '?').trim().charAt(0).toUpperCase()}</span>
            <span className="user-chip-text">
              <strong>{user?.fullName}</strong>
              <small className="muted">@{user?.username}</small>
            </span>
          </div>
          <button
            className="btn btn-ghost btn-block"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => setOpen(true)} aria-label={t('common.menu')}>
            <Menu size={20} />
          </button>
          <div className="topbar-spacer" />
          <LanguageSwitcher />
          <ThemeToggle />
        </header>
        <main className="content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
