import { useEffect, useState } from 'react';
import { Server, Database, Cpu, Clock, Mail, Loader2, Save, RefreshCw } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { adminApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, StatCard, PageHeader, Spinner, ErrorBox, Field } from '../components/ui.jsx';
import { formatBytes, formatDateTime } from '../utils/format.js';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
];

function Settings() {
  const t = useT();
  const toast = useToast();
  const { errorText } = useErrorText();
  const { data, error, loading, reload } = useFetch(() => adminApi.settings(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  const toggleLang = (code) =>
    setForm((f) => {
      const has = f.supportedLanguages.includes(code);
      const next = has ? f.supportedLanguages.filter((c) => c !== code) : [...f.supportedLanguages, code];
      if (!next.length) return f;
      return { ...f, supportedLanguages: next, defaultLanguage: next.includes(f.defaultLanguage) ? f.defaultLanguage : next[0] };
    });

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminApi.updateSettings(form);
      setForm(r.settings);
      toast.success(t('settings.saved'));
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form) return <Spinner />;
  return (
    <>
      <ErrorBox error={error} onRetry={reload} />
      {form && (
        <div className="stack">
          <label className="check">
            <input type="checkbox" checked={form.registrationOpen} onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })} />
            <span>{t('admin.system.registrationOpen')}</span>
          </label>
          <div>
            <span className="field-label">{t('admin.system.supportedLanguages')}</span>
            <div className="chips">
              {LANGS.map((l) => (
                <button key={l.code} type="button" className={`chip ${form.supportedLanguages.includes(l.code) ? 'active' : ''}`} onClick={() => toggleLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <Field label={t('admin.system.defaultLanguage')}>
            <select value={form.defaultLanguage} onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}>
              {LANGS.filter((l) => form.supportedLanguages.includes(l.code)).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminSystemPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { data, error, loading, reload } = useFetch(() => adminApi.system(), []);
  const uptime = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
  };

  return (
    <>
      <PageHeader
        title={t('admin.system.title')}
        subtitle={t('admin.system.subtitle')}
        actions={
          <button className="btn btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('common.refresh')}
          </button>
        }
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}
      {data && (
        <>
          <div className="stat-grid">
            <StatCard icon={Server} label={t('admin.system.api')} value={data.api.status === 'ok' ? t('admin.system.healthy') : data.api.status} tone="pos" hint={`${data.api.environment} · Node ${data.api.nodeVersion}`} />
            <StatCard icon={Database} label={t('admin.system.database')} value={data.database.ok ? t('admin.system.connected') : t('admin.system.disconnected')} tone={data.database.ok ? 'pos' : 'neg'} hint={`${data.database.latencyMs} ms`} />
            <StatCard icon={Clock} label={t('admin.system.uptime')} value={uptime(data.api.uptimeSeconds)} hint={formatDateTime(data.api.startedAt, lang)} />
            <StatCard icon={Cpu} label={t('admin.system.memory')} value={`${data.api.memoryMb} MB`} />
            <StatCard icon={Mail} label={t('admin.system.email')} value={data.api.smtpConfigured ? t('admin.system.configured') : t('admin.system.notConfigured')} tone={data.api.smtpConfigured ? 'pos' : undefined} hint={data.api.smtpConfigured ? undefined : t('admin.system.emailHint')} />
            {data.database.ok && <StatCard icon={Database} label={t('admin.system.dbSize')} value={formatBytes(data.database.sizeBytes)} />}
          </div>

          {data.database.ok && (
            <Card title={t('admin.system.tables')}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('admin.system.table')}</th>
                      <th className="num">{t('admin.system.rows')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.database.rows).map(([k, v]) => (
                      <tr key={k}>
                        <td>
                          <code>{k}</code>
                        </td>
                        <td className="num">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small" dir="ltr">{data.database.version}</p>
            </Card>
          )}
        </>
      )}

      <Card title={t('admin.system.appSettings')}>
        <Settings />
      </Card>

      <Card title={t('admin.system.backupTitle')}>
        <p>{t('admin.system.backupText')}</p>
        <pre className="code" dir="ltr">{`# backup (from the backend folder)
DIRECT_URL="postgresql://..." npm run backup

# restore into a NEW empty Neon database / branch
TARGET_URL="postgresql://..." sh scripts/restore.sh backups/<file>.dump`}</pre>
        <p className="muted small">{t('admin.system.backupNote')}</p>
      </Card>
    </>
  );
}
