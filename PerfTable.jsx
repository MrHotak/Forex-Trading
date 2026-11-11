import { useT } from '../context/PrefsContext.jsx';
import { money, pct, num, plClass } from '../utils/format.js';

/** Grouped performance rows (month, week, pair, session, strategy...). `labelOf(row)` returns the first column text. */
export default function PerfTable({ rows, labelOf, firstHeader, currency, limit }) {
  const t = useT();
  if (!rows.length) return <p className="muted">{t('common.noData')}</p>;
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{firstHeader}</th>
            <th className="num">{t('metrics.trades')}</th>
            <th className="num">{t('metrics.winRate')}</th>
            <th className="num">{t('metrics.netProfit')}</th>
            <th className="num">{t('metrics.profitFactor')}</th>
            <th className="num">{t('metrics.avgRR')}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.key}>
              <td>
                <strong>{labelOf(r)}</strong>
              </td>
              <td className="num">{r.totalTrades}</td>
              <td className="num">{pct(r.winRate)}</td>
              <td className={`num ${plClass(r.netProfit)}`}>{money(r.netProfit, currency, { sign: true })}</td>
              <td className="num">{r.profitFactor === null ? '—' : num(r.profitFactor)}</td>
              <td className="num">{r.avgRR === null ? '—' : `${num(r.avgRR)}R`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
