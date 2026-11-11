import { useEffect, useState } from 'react';
import { Search, Eye, Link2, Loader2, Copy } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { adminApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useFetch, useDebounced } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, Pagination, Modal, Field } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

function UserModal({ id, onClose, onChanged }) {
  const t = useT();
  const { lang } = usePrefs();
  const { user: me } = useAuth();
  const toast = useToast();
  const { errorText } = useErrorText();
  const { data, error, loading, reload } = useFetch(() => adminApi.user(id), [id]);
  const [busy, setBusy] = useState('');
  const [link, setLink] = useState('');

  const u = data?.user;
  const isSelf = u?.id === me.id;

  const update = async (patch, key) => {
    setBusy(key);
    try {
      await adminApi.updateUser(id, patch);
      toast.success(t('admin.users.updated'));
      await reload();
      onChanged();
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setBusy('');
    }
  };

  const createLink = async () => {
    setBusy('link');
    try {
      const r = await adminApi.resetLink(id);
      setLink(r.resetUrl);
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal title={t('admin.users.details')} onClose={onClose} wide>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}
      {data && (
        <div className="stack">
          <dl className="detail-list">
            {[
              [t('auth.fullName'), u.fullName],
              [t('auth.username'), <span dir="ltr" key="u">@{u.username}</span>],
              [t('auth.email'), <span dir="ltr" key="e">{u.email}</span>],
              [t('admin.users.created'), formatDateTime(u.createdAt, lang)],
              [t('profile.lastLogin'), u.lastLoginAt ? formatDateTime(u.lastLoginAt, lang) : '—'],
              [t('profile.tradesRecorded'), data.tradeCount],
              [t('admin.users.screenshots'), data.attachmentCount],
              [t('admin.users.lastTrade'), data.lastTradeDate ? formatDate(data.lastTradeDate, lang) : '—'],
              [t('admin.users.language'), `${data.settings.language} / ${data.settings.theme}`],
            ].map(([k, v]) => (
              <div className="detail-row" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="muted small">{t('admin.users.privacyNote')}</p>

          <div className="grid-form">
            <Field label={t('profile.role')}>
              <select value={u.role} disabled={isSelf || busy === 'role'} onChange={(e) => update({ role: e.target.value }, 'role')}>
                <option value="USER">{t('roles.USER')}</option>
                <option value="ADMIN">{t('roles.ADMIN')}</option>
              </select>
            </Field>
            <Field label={t('admin.users.status')} hint={isSelf ? t('admin.users.selfNote') : undefined}>
              <select value={u.status} disabled={isSelf || busy === 'status'} onChange={(e) => update({ status: e.target.value }, 'status')}>
                <option value="ACTIVE">{t('status.ACTIVE')}</option>
                <option value="INACTIVE">{t('status.INACTIVE')}</option>
                <option value="SUSPENDED">{t('status.SUSPENDED')}</option>
              </select>
            </Field>
          </div>

          <div className="row-gap">
            <button className="btn btn-ghost" onClick={createLink} disabled={busy === 'link'}>
              {busy === 'link' ? <Loader2 className="spin" size={16} /> : <Link2 size={16} />} {t('admin.users.resetLink')}
            </button>
          </div>
          {link && (
            <div className="alert alert-info">
              <div className="stack" style={{ width: '100%' }}>
                <span>{t('admin.users.resetLinkNote')}</span>
                <div className="input-with-btn">
                  <input readOnly value={link} dir="ltr" onFocus={(e) => e.target.select()} />
                  <button
                    className="icon-btn"
                    onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success(t('common.copied')))}
                    aria-label={t('common.copy')}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminUsersPage() {
  const t = useT();
  const { lang } = usePrefs();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, role, status]);

  const params = { page, pageSize: 20, ...(dq && { q: dq }), ...(role && { role }), ...(status && { status }) };
  const { data, error, loading, reload } = useFetch(() => adminApi.users(params), [JSON.stringify(params)]);

  return (
    <>
      <PageHeader title={t('admin.users.title')} subtitle={t('admin.users.subtitle')} />
      <Card pad={false}>
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.users.search')} aria-label={t('admin.users.search')} />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t('profile.role')}>
            <option value="">{t('profile.role')}: {t('common.all')}</option>
            <option value="USER">{t('roles.USER')}</option>
            <option value="ADMIN">{t('roles.ADMIN')}</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('admin.users.status')}>
            <option value="">{t('admin.users.status')}: {t('common.all')}</option>
            <option value="ACTIVE">{t('status.ACTIVE')}</option>
            <option value="INACTIVE">{t('status.INACTIVE')}</option>
            <option value="SUSPENDED">{t('status.SUSPENDED')}</option>
          </select>
        </div>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data ? (
          <Spinner />
        ) : data && data.items.length === 0 ? (
          <EmptyState title={t('admin.users.none')} />
        ) : (
          data && (
            <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('auth.fullName')}</th>
                    <th>{t('auth.username')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('profile.role')}</th>
                    <th>{t('admin.users.status')}</th>
                    <th className="num">{t('metrics.trades')}</th>
                    <th>{t('admin.users.created')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.fullName}</strong>
                      </td>
                      <td dir="ltr">@{u.username}</td>
                      <td dir="ltr">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-buy' : ''}`}>{t(`roles.${u.role}`)}</span>
                      </td>
                      <td>
                        <span className={`badge status-${u.status}`}>{t(`status.${u.status}`)}</span>
                      </td>
                      <td className="num">{u.tradeCount}</td>
                      <td>{formatDate(u.createdAt, lang)}</td>
                      <td>
                        <button className="icon-btn" onClick={() => setSelected(u.id)} aria-label={t('common.view')} title={t('common.view')}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
      </Card>
      {selected && <UserModal id={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </>
  );
}
