import { Users, UserCheck, UserPlus, Hash, Trophy, XCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { adminApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Card, StatCard, PageHeader, Spinner, ErrorBox } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

export default function AdminDashboardPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { data, error, loading, reload } = useFetch(() => adminApi.dashboard(), []);

  return (
    <>
      <PageHeader title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle')} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}
      {data && (
        <>
          <div className="stat-grid">
            <StatCard icon={Users} label={t('admin.dashboard.totalUsers')} value={data.totalUsers} hint={t('admin.dashboard.roleSplit', { admins: data.usersByRole.ADMIN || 0, users: data.usersByRole.USER || 0 })} />
            <StatCard icon={UserCheck} label={t('admin.dashboard.activeUsers')} value={data.activeAccounts} hint={t('admin.dashboard.activeLast30', { n: data.activeLast30Days })} tone="pos" />
            <StatCard icon={UserPlus} label={t('admin.dashboard.newLast7')} value={data.newLast7Days} />
            <StatCard icon={Hash} label={t('admin.dashboard.totalTrades')} value={data.totalTrades} />
            <StatCard icon={Trophy} label={t('admin.dashboard.winningTrades')} value={data.winningTrades} tone="pos" />
            <StatCard icon={XCircle} label={t('admin.dashboard.losingTrades')} value={data.losingTrades} tone="neg" />
          </div>

          <div className="chart-grid">
            <Card title={t('admin.dashboard.activity14')}>
              {data.activityByDay.length === 0 ? (
                <div className="chart-empty muted">{t('common.noData')}</div>
              ) : (
                <div dir="ltr" style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.activityByDay.map((d) => ({ ...d, label: d.day.slice(5) }))}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--text-2)" tick={{ fill: 'var(--text-2)', fontSize: 12 }} tickLine={false} />
                      <YAxis stroke="var(--text-2)" tick={{ fill: 'var(--text-2)', fontSize: 12 }} tickLine={false} width={40} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} cursor={{ fill: 'var(--hover)' }} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title={t('admin.dashboard.recentActivity')} actions={<Link to="/admin/logs" className="btn btn-sm btn-ghost">{t('common.viewAll')}</Link>}>
              <ul className="feed">
                {data.recentActivity.map((a) => (
                  <li key={a.id}>
                    <Activity size={14} />
                    <span>
                      <code>{a.action}</code> <span className="muted">{a.username ? `@${a.username}` : t('admin.logs.anonymous')}</span>
                    </span>
                    <small className="muted">{formatDateTime(a.createdAt, lang)}</small>
                  </li>
                ))}
                {data.recentActivity.length === 0 && <li className="muted">{t('common.noData')}</li>}
              </ul>
            </Card>
          </div>

          <Card title={t('admin.dashboard.recentRegistrations')} actions={<Link to="/admin/users" className="btn btn-sm btn-ghost">{t('common.viewAll')}</Link>}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('auth.fullName')}</th>
                    <th>{t('auth.username')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('admin.users.status')}</th>
                    <th>{t('admin.users.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRegistrations.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.fullName}</strong>
                      </td>
                      <td dir="ltr">@{u.username}</td>
                      <td dir="ltr">{u.email}</td>
                      <td>
                        <span className={`badge status-${u.status}`}>{t(`status.${u.status}`)}</span>
                      </td>
                      <td>{formatDate(u.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
