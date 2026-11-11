import { useState } from 'react';
import { Loader2, Save, Download, FileJson } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dataApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Field } from '../components/ui.jsx';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'AFN', 'IRR', 'AED', 'TRY'];

export default function SettingsPage() {
  const t = useT();
  const { lang, theme } = usePrefs();
  const { settings, saveSettings } = useAuth();
  const toast = useToast();
  const { errorText, fieldText } = useErrorText();
  const [balance, setBalance] = useState(String(settings?.startingBalance ?? 0));
  const [currency, setCurrency] = useState(settings?.currency || 'USD');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');

  const run = async (kind, patch) => {
    setBusy(kind);
    try {
      await saveSettings(patch);
      toast.success(t('settings.saved'));
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setBusy('');
    }
  };

  const saveFinance = async (e) => {
    e.preventDefault();
    if (balance === '' || !(Number(balance) >= 0)) return setErrors({ startingBalance: 'range' });
    setErrors({});
    setSaving(true);
    try {
      await saveSettings({ startingBalance: Number(balance), currency });
      toast.success(t('settings.saved'));
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      if (!Object.keys(p.fields).length) toast.error(errorText(p));
    } finally {
      setSaving(false);
    }
  };

  const download = (kind, fn) => async () => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="chart-grid">
        <Card title={t('settings.appearance')}>
          <div className="stack">
            <div>
              <span className="field-label">{t('common.language')}</span>
              <div className="seg seg-block">
                <button className={lang === 'en' ? 'active' : ''} disabled={busy === 'lang'} onClick={() => lang !== 'en' && run('lang', { language: 'en' })}>
                  English
                </button>
                <button className={lang === 'fa' ? 'active' : ''} disabled={busy === 'lang'} onClick={() => lang !== 'fa' && run('lang', { language: 'fa' })}>
                  فارسی
                </button>
              </div>
            </div>
            <div>
              <span className="field-label">{t('settings.theme')}</span>
              <div className="seg seg-block">
                <button className={theme === 'dark' ? 'active' : ''} disabled={busy === 'theme'} onClick={() => theme !== 'dark' && run('theme', { theme: 'dark' })}>
                  {t('settings.dark')}
                </button>
                <button className={theme === 'light' ? 'active' : ''} disabled={busy === 'theme'} onClick={() => theme !== 'light' && run('theme', { theme: 'light' })}>
                  {t('settings.light')}
                </button>
              </div>
            </div>
            <p className="muted small">{t('settings.savedToAccount')}</p>
          </div>
        </Card>

        <Card title={t('settings.account')}>
          <form onSubmit={saveFinance} noValidate className="stack">
            <Field label={t('settings.startingBalance')} error={errors.startingBalance && fieldText(errors.startingBalance)} hint={t('settings.startingBalanceHint')}>
              <input type="number" step="any" min="0" value={balance} onChange={(e) => setBalance(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('settings.currency')} error={errors.currency && fieldText(errors.currency)}>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {t('common.save')}
            </button>
          </form>
        </Card>
      </div>

      <Card title={t('settings.dataTitle')}>
        <p className="muted">{t('settings.dataText')}</p>
        <div className="row-gap">
          <button className="btn btn-ghost" onClick={download('csv', () => dataApi.csv({}))} disabled={busy === 'csv'}>
            {busy === 'csv' ? <Loader2 className="spin" size={16} /> : <Download size={16} />} {t('journal.exportCsv')}
          </button>
          <button className="btn btn-ghost" onClick={download('json', () => dataApi.history())} disabled={busy === 'json'}>
            {busy === 'json' ? <Loader2 className="spin" size={16} /> : <FileJson size={16} />} {t('reports.downloadHistory')}
          </button>
        </div>
        <p className="muted small">{t('settings.noAutoDelete')}</p>
      </Card>
    </>
  );
}
