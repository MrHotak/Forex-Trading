import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Percent, TrendingUp, TrendingDown, Scale, Trophy, Frown, Clock, Lightbulb, Flame, Snowflake, Activity, Wallet } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Card, StatCard, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import PerfTable from '../components/PerfTable.jsx';
import { MonthlyPLChart, DailyChart, CategoryPLChart } from '../components/charts.jsx';
import { money, pct, num, monthLabel, formatDate } from '../utils/format.js';

export default function AnalyticsPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { settings } = useAuth();
  const currency = settings?.currency || 'USD';
  const [range, setRange] = useState({ range: 'month' });
  const [tab, setTab] = useState('monthly');
  const { data, error, loading, reload } = useFetch(() => analyticsApi.overview(rangeParams(range)), [range.range, range.from, range.to]);

  const s = data?.summary;
  const rr = (v) => (v === null || v === undefined ? '—' : `${num(v)}R`);

  return (
    <>
      <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />
      <RangeFilter value={range} onChange={setRange} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}

      {data && s.totalTrades === 0 && (
        <Card>
          <EmptyState title={t('analytics.emptyTitle')} text={t('analytics.emptyText')} action={<Link className="btn btn-primary" to="/app/journal/new">{t('nav.addTrade')}</Link>} />
        </Card>
      )}

      {data && s.totalTrades > 0 && (
        <>
          <div className="stat-grid">
            <StatCard icon={Wallet} label={t('analytics.totalPerformance')} value={money(s.netProfit, currency, { sign: true })} tone={s.netProfit >= 0 ? 'pos' : 'neg'} hint={`${s.totalTrades} ${t('metrics.trades')}`} />
            <StatCard icon={Percent} label={t('metrics.winRate')} value={pct(s.winRate)} />
            <StatCard icon={TrendingUp} label={t('metrics.avgWin')} value={money(s.avgWin, currency)} tone="pos" />
            <StatCard icon={TrendingDown} label={t('metrics.avgLoss')} value={money(s.avgLoss, currency)} tone="neg" />
            <StatCard icon={Activity} label={t('metrics.profitFactor')} value={s.profitFactor === null ? '—' : num(s.profitFactor)} hint={s.profitFactor === null ? t('analytics.noLossesHint') : undefined} />
            <StatCard icon={Scale} label={t('metrics.avgRR')} value={rr(s.avgRR)} />
            <StatCard icon={Trophy} label={t('analytics.bestPair')} value={data.bestPair ? data.bestPair.key : '—'} hint={data.bestPair ? money(data.bestPair.netProfit, currency, { sign: true }) : undefined} tone="pos" />
            <StatCard icon={Frown} label={t('analytics.worstPair')} value={data.worstPair ? data.worstPair.key : '—'} hint={data.worstPair ? money(data.worstPair.netProfit, currency, { sign: true }) : undefined} tone={data.worstPair && data.worstPair.netProfit < 0 ? 'neg' : undefined} />
            <StatCard icon={Clock} label={t('analytics.bestSession')} value={data.bestSession ? t(`session.${data.bestSession.key}`) : '—'} hint={data.bestSession ? money(data.bestSession.netProfit, currency, { sign: true }) : undefined} />
            <StatCard icon={Lightbulb} label={t('analytics.bestStrategy')} value={data.bestStrategy ? data.bestStrategy.label : t('analytics.noStrategy')} hint={data.bestStrategy ? money(data.bestStrategy.netProfit, currency, { sign: true }) : undefined} />
            <StatCard icon={Flame} label={t('analytics.maxWins')} value={data.streaks.maxConsecutiveWins} tone="pos" />
            <StatCard icon={Snowflake} label={t('analytics.maxLosses')} value={data.streaks.maxConsecutiveLosses} tone="neg" />
          </div>

          <div className="chart-grid">
            <Card title={t('charts.monthlyPL')}>
              <MonthlyPLChart data={data.monthly} />
            </Card>
            <Card title={t('charts.dailyPerformance')}>
              <DailyChart data={data.daily} />
            </Card>
            <Card title={t('charts.pairPerformance')}>
              <CategoryPLChart data={data.pairs} />
            </Card>
            <Card title={t('charts.sessionPerformance')}>
              <CategoryPLChart data={data.sessions} labelOf={(k) => t(`session.${k}`)} />
            </Card>
          </div>

          <Card title={t('analytics.periodBreakdown')}>
            <div className="chips" role="tablist" style={{ marginBottom: 12 }}>
              {['monthly', 'weekly', 'daily'].map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                  {t(`analytics.${k}`)}
                </button>
              ))}
            </div>
            {tab === 'monthly' && <PerfTable rows={[...data.monthly].reverse()} firstHeader={t('analytics.month')} labelOf={(r) => monthLabel(r.key, lang)} currency={currency} />}
            {tab === 'weekly' && <PerfTable rows={[...data.weekly].reverse()} firstHeader={t('analytics.weekStarting')} labelOf={(r) => formatDate(r.key, lang)} currency={currency} limit={52} />}
            {tab === 'daily' && (
              <PerfTable
                rows={[...data.daily].reverse().map((d) => ({ key: d.date, totalTrades: d.trades, winRate: d.trades ? Math.round((d.wins / d.trades) * 10000) / 100 : 0, netProfit: d.pl, profitFactor: null, avgRR: null }))}
                firstHeader={t('trade.fields.tradeDate')}
                labelOf={(r) => formatDate(r.key, lang)}
                currency={currency}
                limit={90}
              />
            )}
          </Card>

          <div className="chart-grid">
            <Card title={t('analytics.longVsShort')}>
              <PerfTable rows={data.directions} firstHeader={t('trade.fields.direction')} labelOf={(r) => t(`direction.${r.key}`)} currency={currency} />
            </Card>
            <Card title={t('analytics.sessionStats')}>
              <PerfTable rows={data.sessions} firstHeader={t('trade.fields.session')} labelOf={(r) => t(`session.${r.key}`)} currency={currency} />
            </Card>
            <Card title={t('analytics.pairStats')}>
              <PerfTable rows={data.pairs} firstHeader={t('trade.fields.pair')} labelOf={(r) => r.key} currency={currency} limit={15} />
            </Card>
            <Card title={t('analytics.strategyStats')}>
              {data.strategies.length ? (
                <PerfTable rows={data.strategies} firstHeader={t('trade.fields.strategy')} labelOf={(r) => r.label} currency={currency} />
              ) : (
                <p className="muted">{t('analytics.noStrategyHint')}</p>
              )}
            </Card>
          </div>

          <Card title={t('analytics.streaks')}>
            <p>
              {t('analytics.streakText', { wins: data.streaks.maxConsecutiveWins, losses: data.streaks.maxConsecutiveLosses })}
              {data.streaks.current.type && <> {t('analytics.currentStreak', { n: data.streaks.current.count, type: t(`result.${data.streaks.current.type}`) })}</>}
            </p>
            <p className="muted small">{t('analytics.streakNote')}</p>
            <p>
              <Link to="/app/psychology" className="btn btn-ghost btn-sm">
                {t('analytics.seePsychology')}
              </Link>
            </p>
          </Card>
        </>
      )}
    </>
  );
}
