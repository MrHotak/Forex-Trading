import { useT } from '../context/PrefsContext.jsx';

export default function Footer({ compact }) {
  const t = useT();
  return (
    <footer className={`site-footer ${compact ? 'compact' : ''}`}>
      <strong className="footer-brand">{t('brand.name')}</strong>
      <span className="muted">{t('brand.tagline')}</span>
      <span className="footer-credit">
        {t('brand.createdBy')}: <strong>Faridoon Faizi</strong>
      </span>
    </footer>
  );
}
