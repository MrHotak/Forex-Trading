import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, Trophy, XCircle, Percent, TrendingUp, TrendingDown, Wallet, Scale, CalendarCheck, CalendarX, Landmark, PlusCircle } from 'lucide-react';
import { useT } from '../context/PrefsContext.jsx';
import { usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Card, StatCard, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import { MonthlyPLChart, DailyChart, WinLossChart, CategoryPLChart, MonthlyWinRateChart } from '../components/charts.jsx';
import { money, pct, num, formatDate, plClass } from '../utils/format.js';

export default function DashboardPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { user, settings } = useAuth();
  const currency = settings?.currency || 'USD';
  const [range, setRange] = useState({ range: 'all' });
  const { data, error, loading, reload } = useFetch(() => analyticsApi.overview(rangeParams(range)), [range.range, range.from, range.to]);

  const s = data?.summary;
  const empty = data && s.totalTrades === 0;

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', { name: user.fullName.split(' ')[0] })}
        subtitle={t('dashboard.subtitle')}
        actions={
          <Link to="/app/journal/new" className="btn btn-primary">
            <PlusCircle size={16} /> {t('nav.addTrade')}
          </Link>
        }
      />
      <RangeFilter value={range} onChange={setRange} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard icon={Hash} label={t('metrics.totalTrades')} value={s.totalTrades} />
            <StatCard icon={Trophy} label={t('metrics.winningTrades')} value={s.winningTrades} tone="pos" />
            <StatCard icon={XCircle} label={t('metrics.losingTrades')} value={s.losingTrades} tone="neg" />
            <StatCard icon={Percent} label={t('metrics.winRate')} value={pct(s.winRate)} />
            <StatCard icon={TrendingUp} label={t('metrics.totalProfit')} value={money(s.totalProfit, currency)} tone="pos" />
            <StatCard icon={TrendingDown} label={t('metrics.totalLoss')} value={money(s.totalLoss, currency)} tone="neg" />
            <StatCard icon={Wallet} label={t('metrics.netProfit')} value={money(s.netProfit, currency, { sign: true })} tone={s.netProfit >= 0 ? 'pos' : 'neg'} />
            <StatCard icon={Scale} label={t('metrics.avgRR')} value={s.avgRR === null ? '—' : `${num(s.avgRR)}R`} />
            <StatCard
              icon={CalendarCheck}
              label={t('metrics.bestDay')}
              value={data.bestDay ? money(data.bestDay.pl, currency, { sign: true }) : '—'}
              hint={data.bestDay ? formatDate(data.bestDay.date, lang) : undefined}
              tone={data.bestDay && data.bestDay.pl > 0 ? 'pos' : undefined}
            />
            <StatCard
              icon={CalendarX}
              label={t('metrics.worstDay')}
              value={data.worstDay ? money(data.worstDay.pl, currency, { sign: true }) : '—'}
              hint={data.worstDay ? formatDate(data.worstDay.date, lang) : undefined}
              tone={data.worstDay && data.worstDay.pl < 0 ? 'neg' : undefined}
            />
            <StatCard icon={Landmark} label={t('metrics.currentBalance')} value={money(data.currentBalance, currency)} hint={t(`metrics.balanceSource.${data.source}`)} tone="accent" />
          </div>

          {empty ? (
            <Card>
              <EmptyState
                title={t('dashboard.emptyTitle')}
                text={t('dashboard.emptyText')}
                action={
                  <Link to="/app/journal/new" className="btn btn-primary">
                    <PlusCircle size={16} /> {t('nav.addTrade')}
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="chart-grid">
              <Card title={t('charts.monthlyPL')} className="span-2">
                <MonthlyPLChart data={data.monthly} />
              </Card>
              <Card title={t('charts.dailyPerformance')} className="span-2">
                <DailyChart data={data.daily.slice(-45)} />
              </Card>
              <Card title={t('charts.winVsLoss')}>
                <WinLossChart summary={s} />
              </Card>
              <Card title={t('charts.monthlyWinRate')}>
                <MonthlyWinRateChart data={data.monthly} />
              </Card>
              <Card title={t('charts.pairPerformance')}>
                <CategoryPLChart data={data.pairs} />
              </Card>
              <Card title={t('charts.sessionPerformance')}>
                <CategoryPLChart data={data.sessions} labelOf={(k) => t(`session.${k}`)} />
              </Card>
              <Card title={t('charts.longVsShort')} className="span-2">
                <CategoryPLChart data={data.directions} labelOf={(k) => t(`direction.${k}`)} height={240} />
              </Card>
            </div>
          )}
          {data.daily.length > 0 && (
            <p className="muted small">
              {t('dashboard.netNote')}{' '}
              <span className={plClass(s.netProfit)}>{money(s.netProfit, currency, { sign: true })}</span>
            </p>
          )}
        </>
      )}
    </>
  );
}
