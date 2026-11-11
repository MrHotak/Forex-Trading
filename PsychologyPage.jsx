import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, AlertOctagon, Smile, Frown } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, tradesApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Card, StatCard, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import { CategoryPLChart } from '../components/charts.jsx';
import { money, pct, plClass, formatDate } from '../utils/format.js';

export default function PsychologyPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { settings } = useAuth();
  const currency = settings?.currency || 'USD';
  const [range, setRange] = useState({ range: 'all' });
  const { data, error, loading, reload } = useFetch(() => analyticsApi.psychology(rangeParams(range)), [range.range, range.from, range.to]);
  const notes = useFetch(() => tradesApi.list({ pageSize: 100, sort: 'date_desc' }), []);

  const m = data?.mistakes;
  const emotionRows = (data?.emotions || []).map((e) => ({ key: e.emotion, netProfit: e.netProfit, totalTrades: e.trades, winRate: e.winRate }));
  const withNotes = (notes.data?.items || []).filter((x) => x.mistakes || x.lessonsLearned).slice(0, 12);
  const hasAnything = data && (data.emotions.length > 0 || m.tradesWithMistakes > 0);

  return (
    <>
      <PageHeader title={t('psychology.title')} subtitle={t('psychology.subtitle')} />
      <RangeFilter value={range} onChange={setRange} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Spinner />}

      {data && !hasAnything && (
        <Card>
          <EmptyState title={t('psychology.emptyTitle')} text={t('psychology.emptyText')} action={<Link className="btn btn-primary" to="/app/journal/new">{t('nav.addTrade')}</Link>} />
        </Card>
      )}

      {data && hasAnything && (
        <>
          <div className="stat-grid">
            <StatCard icon={Smile} label={t('psychology.bestEmotion')} value={data.bestEmotion ? data.bestEmotion.emotion : '—'} hint={data.bestEmotion ? money(data.bestEmotion.netProfit, currency, { sign: true }) : undefined} tone="pos" />
            <StatCard icon={Frown} label={t('psychology.worstEmotion')} value={data.worstEmotion ? data.worstEmotion.emotion : '—'} hint={data.worstEmotion ? money(data.worstEmotion.netProfit, currency, { sign: true }) : undefined} tone={data.worstEmotion && data.worstEmotion.netProfit < 0 ? 'neg' : undefined} />
            <StatCard icon={AlertOctagon} label={t('psychology.tradesWithMistakes')} value={m.tradesWithMistakes} hint={pct(m.percentWithMistakes)} />
            <StatCard icon={Brain} label={t('psychology.emotionsTracked')} value={data.emotions.length} />
          </div>

          <div className="chart-grid">
            <Card title={t('psychology.emotionPL')}>
              <CategoryPLChart data={emotionRows} />
            </Card>
            <Card title={t('psychology.mistakeImpact')}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th />
                      <th className="num">{t('metrics.trades')}</th>
                      <th className="num">{t('metrics.winRate')}</th>
                      <th className="num">{t('metrics.netProfit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['withMistakes', m.withMistakes],
                      ['withoutMistakes', m.withoutMistakes],
                    ].map(([k, row]) => (
                      <tr key={k}>
                        <td>
                          <strong>{t(`psychology.${k}`)}</strong>
                        </td>
                        <td className="num">{row.trades}</td>
                        <td className="num">{pct(row.winRate)}</td>
                        <td className={`num ${plClass(row.netProfit)}`}>{money(row.netProfit, currency, { sign: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{t('psychology.mistakeNote')}</p>
            </Card>
          </div>

          <Card title={t('psychology.emotionTable')}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('trade.fields.emotion')}</th>
                    <th className="num">{t('metrics.trades')}</th>
                    <th className="num">{t('metrics.winRate')}</th>
                    <th className="num">{t('psychology.avgPL')}</th>
                    <th className="num">{t('metrics.netProfit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.emotions.map((e) => (
                    <tr key={e.emotion}>
                      <td>
                        <strong>{e.emotion}</strong>
                      </td>
                      <td className="num">{e.trades}</td>
                      <td className="num">{pct(e.winRate)}</td>
                      <td className={`num ${plClass(e.avgPL)}`}>{money(e.avgPL, currency, { sign: true })}</td>
                      <td className={`num ${plClass(e.netProfit)}`}>{money(e.netProfit, currency, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">{t('psychology.emotionNote')}</p>
          </Card>
        </>
      )}

      <Card title={t('psychology.recentNotes')}>
        {notes.loading && !notes.data ? (
          <Spinner />
        ) : withNotes.length === 0 ? (
          <p className="muted">{t('psychology.noNotes')}</p>
        ) : (
          <div className="notes-list">
            {withNotes.map((x) => (
              <Link key={x.id} to={`/app/journal/${x.id}`} className="note-item">
                <div className="note-head">
                  <strong>{x.pair}</strong>
                  <span className="muted">{formatDate(x.tradeDate, lang)}</span>
                  <span className={plClass(x.profitLoss)}>{money(x.profitLoss, currency, { sign: true })}</span>
                </div>
                {x.mistakes && (
                  <p>
                    <span className="tag tag-neg">{t('trade.fields.mistakes')}</span> {x.mistakes}
                  </p>
                )}
                {x.lessonsLearned && (
                  <p>
                    <span className="tag tag-pos">{t('trade.fields.lessonsLearned')}</span> {x.lessonsLearned}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
