import { Link } from 'react-router-dom';
import { BookOpen, BarChart3, Brain, CalendarDays, ShieldCheck, Languages, Camera, FileDown, ArrowRight } from 'lucide-react';
import { useT } from '../context/PrefsContext.jsx';

const FEATURES = [
  { icon: BookOpen, k: 'journal' },
  { icon: BarChart3, k: 'analytics' },
  { icon: Brain, k: 'psychology' },
  { icon: CalendarDays, k: 'calendar' },
  { icon: Camera, k: 'screenshots' },
  { icon: FileDown, k: 'export' },
  { icon: Languages, k: 'bilingual' },
  { icon: ShieldCheck, k: 'private' },
];

export default function LandingPage() {
  const t = useT();
  return (
    <main className="landing">
      <section className="hero">
        <span className="pill">{t('landing.pill')}</span>
        <h1>{t('landing.title')}</h1>
        <p className="hero-sub">{t('landing.subtitle')}</p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">
            {t('landing.cta')} <ArrowRight size={18} className="flip-rtl" />
          </Link>
          <Link to="/login" className="btn btn-ghost btn-lg">
            {t('auth.login')}
          </Link>
        </div>
        <div className="hero-card" aria-hidden="true">
          <div className="mini-row">
            <span>EURUSD</span>
            <span className="badge badge-buy">{t('direction.BUY')}</span>
            <span className="pos">+3.2R</span>
          </div>
          <div className="mini-row">
            <span>XAUUSD</span>
            <span className="badge badge-sell">{t('direction.SELL')}</span>
            <span className="neg">-1.0R</span>
          </div>
          <div className="mini-row">
            <span>GBPUSD</span>
            <span className="badge badge-buy">{t('direction.BUY')}</span>
            <span className="pos">+2.1R</span>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>{t('landing.featuresTitle')}</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, k }) => (
            <div className="feature" key={k}>
              <span className="feature-icon">
                <Icon size={22} />
              </span>
              <h3>{t(`landing.features.${k}.title`)}</h3>
              <p className="muted">{t(`landing.features.${k}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>{t('landing.ctaTitle')}</h2>
        <Link to="/register" className="btn btn-primary btn-lg">
          {t('landing.cta')}
        </Link>
      </section>
    </main>
  );
}
