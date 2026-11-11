import { useState } from 'react';
import { Printer, Download, FileJson, Loader2 } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { analyticsApi, dataApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import PerfTable from '../components/PerfTable.jsx';
import { MonthlyPLChart } from '../components/charts.jsx';
import { money, pct, num, monthLabel, formatDate, formatDateTime, plClass, localDate } from '../utils/format.js';

export default function ReportsPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { user, settings } = useAuth();
  const toast = useToast();
  const { errorText } = useErrorText();
  const currency = settings?.currency || 'USD';
  const [range, setRange] = useState({ range: 'month' });
  const [busy, setBusy] = useState('');
  const { data, error, loading, reload } = useFetch(() => analyticsApi.overview(rangeParams(range)), [range.range, range.from, range.to]);
  const psych = useFetch(() => analyticsApi.psychology(rangeParams(range)), [range.range, range.from, range.to]);

  const s = data?.summary;
  const run = (kind, fn) => async () => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setBusy('');
    }
  };
  const csvParams = () => {
    const p = {};
    if (data?.range.from) p.from = data.range.from;
    if (data?.range.to) p.to = data.range.to;
    return p;
  };
  const periodText = data
    ? data.range.from || data.range.to
      ? `${data.range.from ? formatDate(data.range.from, lang) : '…'} → ${data.range.to ? formatDate(data.range.to, lang) : '…'}`
      : t('range.all')
    : '';

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={t('reports.title')}
          subtitle={t('reports.subtitle')}
          actions={
            <>
              <button className="btn btn-primary" onClick={() => window.print()} disabled={!data || s.totalTrades === 0}>
                <Printer size={16} /> {t('reports.printPdf')}
              </button>
              <button className="btn btn-ghost" onClick={run('csv', () => dataApi.csv(csvParams()))} disabled={busy === 'csv'}>
                {busy === 'csv' ? <Loader2 className="spin" size={16} /> : <Download size={16} />} {t('journal.exportCsv')}
              </button>
              <button className="btn btn-ghost" onClick={run('json', () => dataApi.history())} disabled={busy === 'json'}>
                {busy === 'json' ? <Loader2 className="spin" size={16} /> : <FileJson size={16} />} {t('reports.downloadHistory')}
              </button>
            </>
          }
        />
        <RangeFilter value={range} onChange={setRange} />
        <p className="muted small">{t('reports.pdfHint')}</p>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data && <Spinner />}
      </div>

      {data && s.totalTrades === 0 && (
        <Card>
          <EmptyState title={t('reports.emptyTitle')} text={t('reports.emptyText')} />
        </Card>
      )}

      {data && s.totalTrades > 0 && (
        <article className="report">
          <header className="report-head">
            <div>
              <h2>{t('brand.name')}</h2>
              <p className="muted">{t('reports.reportFor', { name: user.fullName })}</p>
            </div>
            <div className="report-meta">
              <div>
                {t('reports.period')}: <strong>{periodText}</strong>
              </div>
              <div>
                {t('reports.generated')}: {formatDateTime(new Date().toISOString(), lang)}
              </div>
            </div>
          </header>

          <section>
            <h3>{t('reports.summary')}</h3>
            <div className="report-kpis">
              {[
                [t('metrics.totalTrades'), s.totalTrades],
                [t('metrics.winningTrades'), s.winningTrades],
                [t('metrics.losingTrades'), s.losingTrades],
                [t('metrics.winRate'), pct(s.winRate)],
                [t('metrics.totalProfit'), money(s.totalProfit, currency)],
                [t('metrics.totalLoss'), money(s.totalLoss, currency)],
                [t('metrics.netProfit'), <span key="n" className={plClass(s.netProfit)}>{money(s.netProfit, currency, { sign: true })}</span>],
                [t('metrics.profitFactor'), s.profitFactor === null ? '—' : num(s.profitFactor)],
                [t('metrics.avgRR'), s.avgRR === null ? '—' : `${num(s.avgRR)}R`],
                [t('metrics.avgWin'), money(s.avgWin, currency)],
                [t('metrics.avgLoss'), money(s.avgLoss, currency)],
                [t('metrics.currentBalance'), money(data.currentBalance, currency)],
              ].map(([k, v]) => (
                <div className="kpi" key={k}>
                  <span className="muted">{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>{t('charts.monthlyPL')}</h3>
            <MonthlyPLChart data={data.monthly} />
          </section>
          <section>
            <h3>{t('analytics.monthly')}</h3>
            <PerfTable rows={data.monthly} firstHeader={t('analytics.month')} labelOf={(r) => monthLabel(r.key, lang)} currency={currency} />
          </section>
          <section>
            <h3>{t('analytics.pairStats')}</h3>
            <PerfTable rows={data.pairs} firstHeader={t('trade.fields.pair')} labelOf={(r) => r.key} currency={currency} limit={15} />
          </section>
          <section>
            <h3>{t('analytics.sessionStats')}</h3>
            <PerfTable rows={data.sessions} firstHeader={t('trade.fields.session')} labelOf={(r) => t(`session.${r.key}`)} currency={currency} />
          </section>
          <section>
            <h3>{t('analytics.longVsShort')}</h3>
            <PerfTable rows={data.directions} firstHeader={t('trade.fields.direction')} labelOf={(r) => t(`direction.${r.key}`)} currency={currency} />
          </section>
          {data.strategies.length > 0 && (
            <section>
              <h3>{t('analytics.strategyStats')}</h3>
              <PerfTable rows={data.strategies} firstHeader={t('trade.fields.strategy')} labelOf={(r) => r.label} currency={currency} />
            </section>
          )}
          {psych.data && psych.data.emotions.length > 0 && (
            <section>
              <h3>{t('psychology.emotionTable')}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('trade.fields.emotion')}</th>
                      <th className="num">{t('metrics.trades')}</th>
                      <th className="num">{t('metrics.winRate')}</th>
                      <th className="num">{t('metrics.netProfit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {psych.data.emotions.map((e) => (
                      <tr key={e.emotion}>
                        <td>{e.emotion}</td>
                        <td className="num">{e.trades}</td>
                        <td className="num">{pct(e.winRate)}</td>
                        <td className={`num ${plClass(e.netProfit)}`}>{money(e.netProfit, currency, { sign: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <footer className="report-foot muted">
            {t('brand.name')} · {t('brand.createdBy')}: Faridoon Faizi · {localDate()}
          </footer>
        </article>
      )}
    </>
  );
}
