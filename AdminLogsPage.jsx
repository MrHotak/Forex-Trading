import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { adminApi } from '../services/endpoints.js';
import { useFetch, useDebounced } from '../hooks/useFetch.js';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, Pagination } from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

export default function AdminLogsPage() {
  const t = useT();
  const { lang } = usePrefs();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const da = useDebounced(action);
  useEffect(() => setPage(1), [da]);
  const params = { page, pageSize: 30, ...(da && { action: da }) };
  const { data, error, loading, reload } = useFetch(() => adminApi.logs(params), [JSON.stringify(params)]);

  return (
    <>
      <PageHeader title={t('admin.logs.title')} subtitle={t('admin.logs.subtitle')} />
      <Card pad={false}>
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('admin.logs.filter')} aria-label={t('admin.logs.filter')} dir="ltr" />
          </div>
        </div>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data ? (
          <Spinner />
        ) : data && data.items.length === 0 ? (
          <EmptyState title={t('admin.logs.none')} />
        ) : (
          data && (
            <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.logs.time')}</th>
                    <th>{t('admin.logs.action')}</th>
                    <th>{t('admin.logs.user')}</th>
                    <th>{t('admin.logs.entity')}</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((l) => (
                    <tr key={l.id}>
                      <td>{formatDateTime(l.createdAt, lang)}</td>
                      <td>
                        <code>{l.action}</code>
                      </td>
                      <td dir="ltr">{l.username ? `@${l.username}` : <span className="muted">{t('admin.logs.anonymous')}</span>}</td>
                      <td dir="ltr">{l.entity ? `${l.entity}${l.entityId ? ` · ${String(l.entityId).slice(0, 8)}` : ''}` : '—'}</td>
                      <td dir="ltr">{l.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
      </Card>
    </>
  );
}
