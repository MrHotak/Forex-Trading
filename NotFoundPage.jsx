import { Link } from 'react-router-dom';
import { useT } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function NotFoundPage() {
  const t = useT();
  const { user } = useAuth();
  return (
    <div className="notfound">
      <div className="notfound-code">404</div>
      <h1>{t('notFound.title')}</h1>
      <p className="muted">{t('notFound.text')}</p>
      <Link className="btn btn-primary" to={user ? (user.role === 'ADMIN' ? '/admin' : '/app') : '/'}>
        {t(user ? 'notFound.backDashboard' : 'notFound.backHome')}
      </Link>
    </div>
  );
}
