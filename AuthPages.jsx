import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Field } from '../components/ui.jsx';

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  const t = useT();
  return (
    <div className="input-with-btn">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} dir="ltr" maxLength={128} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={t(show ? 'auth.hidePassword' : 'auth.showPassword')}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
      {busy && <Loader2 className="spin" size={18} />}
      {children}
    </button>
  );
}

export function LoginPage() {
  const t = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { errorText, fieldText } = useErrorText();
  const [form, setForm] = useState({ identifier: '', password: '', rememberMe: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.identifier.trim()) v.identifier = 'required';
    if (!form.password) v.password = 'required';
    setErrors(v);
    setFormError('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const user = await login({ identifier: form.identifier.trim(), password: form.password, rememberMe: form.rememberMe });
      const from = location.state?.from;
      navigate(from && !(from.startsWith('/admin') && user.role !== 'ADMIN') ? from : user.role === 'ADMIN' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      setFormError(errorText(p));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.welcomeBack')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="stack">
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <Field label={t('auth.identifier')} error={errors.identifier && fieldText(errors.identifier)}>
          <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoComplete="username" dir="ltr" autoFocus />
        </Field>
        <Field label={t('auth.password')} error={errors.password && fieldText(errors.password)}>
          <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
        </Field>
        <div className="row-between">
          <label className="check">
            <input type="checkbox" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} />
            <span>{t('auth.rememberMe')}</span>
          </label>
          <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
        </div>
        <SubmitButton busy={busy}>{t('auth.login')}</SubmitButton>
      </form>
    </AuthCard>
  );
}

export function RegisterPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { register } = useAuth();
  const navigate = useNavigate();
  const { errorText, fieldText } = useErrorText();
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    authApi.publicSettings().then((s) => setOpen(s.registrationOpen)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const v = {};
    if (form.fullName.trim().length < 2) v.fullName = 'name_min';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) v.email = 'email';
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) v.username = 'username';
    if (form.password.length < 8) v.password = 'password_min';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) v.password = 'password_weak';
    if (form.confirmPassword !== form.password) v.confirmPassword = 'password_mismatch';
    return v;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await register({ ...form, fullName: form.fullName.trim(), email: form.email.trim(), username: form.username.trim(), language: lang });
      navigate('/app', { replace: true });
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      if (!Object.keys(p.fields).length) setFormError(errorText(p));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.createAccount')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
        </>
      }
    >
      {!open && <div className="alert alert-error">{t('errors.REGISTRATION_CLOSED')}</div>}
      <form onSubmit={submit} noValidate className="stack">
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <Field label={t('auth.fullName')} error={errors.fullName && fieldText(errors.fullName)}>
          <input value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={120} autoFocus />
        </Field>
        <Field label={t('auth.email')} error={errors.email && fieldText(errors.email)}>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" dir="ltr" maxLength={254} />
        </Field>
        <Field label={t('auth.username')} error={errors.username && fieldText(errors.username)} hint={t('auth.usernameHint')}>
          <input value={form.username} onChange={set('username')} autoComplete="username" dir="ltr" maxLength={30} />
        </Field>
        <Field label={t('auth.password')} error={errors.password && fieldText(errors.password)} hint={t('auth.passwordHint')}>
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label={t('auth.confirmPassword')} error={errors.confirmPassword && fieldText(errors.confirmPassword)}>
          <PasswordInput value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
        </Field>
        <SubmitButton busy={busy || !open}>{t('auth.createAccountBtn')}</SubmitButton>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const t = useT();
  const { fieldText, errorText } = useErrorText();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(fieldText('email'));
    setError('');
    setBusy(true);
    try {
      await authApi.forgot(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorText(parseError(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={<Link to="/login">{t('auth.backToLogin')}</Link>}>
      {sent ? (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{t('auth.resetSent')}</span>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="stack">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <Field label={t('auth.email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" autoFocus />
          </Field>
          <SubmitButton busy={busy}>{t('auth.sendResetLink')}</SubmitButton>
          <p className="muted small">{t('auth.noEmailHint')}</p>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const { errorText, fieldText } = useErrorText();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.password.length < 8) v.password = 'password_min';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) v.password = 'password_weak';
    if (form.confirmPassword !== form.password) v.confirmPassword = 'password_mismatch';
    setErrors(v);
    setFormError('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await authApi.reset({ token, ...form });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      setFormError(errorText(p));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title={t('auth.resetTitle')} footer={<Link to="/forgot-password">{t('auth.forgotPassword')}</Link>}>
        <div className="alert alert-error">{t('errors.RESET_TOKEN_INVALID')}</div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')} footer={<Link to="/login">{t('auth.backToLogin')}</Link>}>
      {done ? (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{t('auth.resetDone')}</span>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="stack">
          {formError && <div className="alert alert-error" role="alert">{formError}</div>}
          <Field label={t('auth.newPassword')} error={errors.password && fieldText(errors.password)} hint={t('auth.passwordHint')}>
            <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label={t('auth.confirmPassword')} error={errors.confirmPassword && fieldText(errors.confirmPassword)}>
            <PasswordInput value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" />
          </Field>
          <SubmitButton busy={busy}>{t('auth.resetBtn')}</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
