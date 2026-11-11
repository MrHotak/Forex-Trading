import { Link } from 'react-router-dom';
import { useT } from '../context/PrefsContext.jsx';
import { Card, PageHeader } from '../components/ui.jsx';

const SECTIONS = ['start', 'fields', 'auto', 'metrics', 'balance', 'psychology', 'screenshots', 'data', 'privacy', 'password'];

export default function HelpPage() {
  const t = useT();
  return (
    <>
      <PageHeader title={t('help.title')} subtitle={t('help.subtitle')} />
      <div className="help-grid">
        <nav className="help-toc" aria-label={t('help.contents')}>
          <strong>{t('help.contents')}</strong>
          {SECTIONS.map((s) => (
            <a key={s} href={`#help-${s}`}>
              {t(`help.sections.${s}.title`)}
            </a>
          ))}
          <a href="#help-about">{t('help.about.title')}</a>
        </nav>
        <div className="stack">
          {SECTIONS.map((s) => (
            <Card key={s} title={t(`help.sections.${s}.title`)} className="help-card">
              <div id={`help-${s}`} className="anchor" />
              <p className="prewrap">{t(`help.sections.${s}.body`)}</p>
            </Card>
          ))}
          <Card title={t('help.about.title')} className="help-card">
            <div id="help-about" className="anchor" />
            <h4>{t('brand.name')}</h4>
            <p>{t('brand.tagline')}</p>
            <p>
              {t('brand.createdBy')}: <strong>Faridoon Faizi</strong>
            </p>
            <p className="muted small">{t('help.about.text')}</p>
            <Link to="/app/journal/new" className="btn btn-primary btn-sm">
              {t('nav.addTrade')}
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
