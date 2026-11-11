import { useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usersApi } from '../services/endpoints.js';
import { parseError, tokenStore } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Field, Spinner, ErrorBox } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

export default function ProfilePage() {
  const t = useT();
  const { lang } = usePrefs();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { errorText, fieldText } = useErrorText();
  const stats = useFetch(() => usersApi.profile(), []);

  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, username: user.username });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.fullName.trim().length < 2) v.fullName = 'name_min';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) v.email = 'email';
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) v.username = 'username';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const r = await usersApi.updateProfile({ fullName: form.fullName.trim(), email: form.email.trim(), username: form.username.trim() });
      setUser(r.user);
      toast.success(t('profile.saved'));
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      if (!Object.keys(p.fields).length) toast.error(errorText(p));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const v = {};
    if (!pw.currentPassword) v.currentPassword = 'required';
    if (pw.password.length < 8) v.password = 'password_min';
    else if (!/[A-Za-z]/.test(pw.password) || !/\d/.test(pw.password)) v.password = 'password_weak';
    if (pw.confirmPassword !== pw.password) v.confirmPassword = 'password_mismatch';
    setPwErrors(v);
    if (Object.keys(v).length) return;
    setPwSaving(true);
    try {
      const r = await usersApi.changePassword(pw);
      // The server invalidates older tokens; keep this device signed in with the new one.
      const remembered = (() => {
        try {
          return Boolean(localStorage.getItem('ftj_token'));
        } catch {
          return false;
        }
      })();
      tokenStore.set(r.token, remembered);
      setPw({ currentPassword: '', password: '', confirmPassword: '' });
      toast.success(t('profile.passwordChanged'));
    } catch (err) {
      const p = parseError(err);
      setPwErrors(p.fields);
      if (!Object.keys(p.fields).length) toast.error(errorText(p));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <div className="chart-grid">
        <Card title={t('profile.account')}>
          <form onSubmit={saveProfile} noValidate className="stack">
            <Field label={t('auth.fullName')} error={errors.fullName && fieldText(errors.fullName)}>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={120} />
            </Field>
            <Field label={t('auth.email')} error={errors.email && fieldText(errors.email)}>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" maxLength={254} />
            </Field>
            <Field label={t('auth.username')} error={errors.username && fieldText(errors.username)}>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" maxLength={30} />
            </Field>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {t('common.save')}
            </button>
          </form>
        </Card>

        <Card title={t('profile.overview')}>
          {stats.loading && !stats.data ? (
            <Spinner />
          ) : (
            <>
              <ErrorBox error={stats.error} onRetry={stats.reload} />
              <dl className="detail-list">
                <div className="detail-row">
                  <dt>{t('profile.role')}</dt>
                  <dd>
                    <span className="badge">{t(`roles.${user.role}`)}</span>
                  </dd>
                </div>
                <div className="detail-row">
                  <dt>{t('profile.memberSince')}</dt>
                  <dd>{formatDate(user.createdAt, lang)}</dd>
                </div>
                <div className="detail-row">
                  <dt>{t('profile.lastLogin')}</dt>
                  <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt, lang) : '—'}</dd>
                </div>
                <div className="detail-row">
                  <dt>{t('profile.tradesRecorded')}</dt>
                  <dd>{stats.data ? stats.data.tradeCount : '—'}</dd>
                </div>
              </dl>
              <p className="muted small">
                <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> {t('profile.privacyNote')}
              </p>
            </>
          )}
        </Card>
      </div>

      <Card title={t('profile.changePassword')}>
        <form onSubmit={savePassword} noValidate className="grid-form">
          <Field label={t('profile.currentPassword')} error={pwErrors.currentPassword && fieldText(pwErrors.currentPassword)}>
            <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" dir="ltr" />
          </Field>
          <span />
          <Field label={t('auth.newPassword')} error={pwErrors.password && fieldText(pwErrors.password)} hint={t('auth.passwordHint')}>
            <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" dir="ltr" />
          </Field>
          <Field label={t('auth.confirmPassword')} error={pwErrors.confirmPassword && fieldText(pwErrors.confirmPassword)}>
            <input type="password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} autoComplete="new-password" dir="ltr" />
          </Field>
          <div className="span-2">
            <button className="btn btn-primary" disabled={pwSaving}>
              {pwSaving && <Loader2 className="spin" size={16} />} {t('profile.updatePassword')}
            </button>
            <p className="muted small">{t('profile.passwordNote')}</p>
          </div>
        </form>
      </Card>
    </>
  );
}
