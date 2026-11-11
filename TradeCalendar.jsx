import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { tradesApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Spinner, ErrorBox, ResultBadge, DirectionBadge } from './ui.jsx';
import { money, plClass, localDate, formatDate } from '../utils/format.js';

const pad = (n) => String(n).padStart(2, '0');

/** Month grid showing each day's net P/L and trade count; click a day to list its trades. */
export default function TradeCalendar({ filters = {} }) {
  const t = useT();
  const { lang, dir } = usePrefs();
  const { settings } = useAuth();
  const currency = settings?.currency || 'USD';
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(null);

  const from = `${cursor.y}-${pad(cursor.m + 1)}-01`;
  const lastDay = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const to = `${cursor.y}-${pad(cursor.m + 1)}-${pad(lastDay)}`;
  const filterKey = JSON.stringify(filters);

  const { data, error, loading, reload } = useFetch(
    () => tradesApi.list({ ...filters, from, to, pageSize: 500, sort: 'date_asc' }),
    [from, to, filterKey],
  );

  const byDay = useMemo(() => {
    const map = {};
    for (const tr of data?.items || []) {
      (map[tr.tradeDate] ||= { pl: 0, trades: [] });
      map[tr.tradeDate].pl += tr.profitLoss;
      map[tr.tradeDate].trades.push(tr);
    }
    return map;
  }, [data]);

  const monthNet = Object.values(byDay).reduce((s, d) => s + d.pl, 0);
  const startOffset = (new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: lastDay }, (_, i) => i + 1)];
  const today = localDate();
  const title = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString(lang === 'fa' ? 'fa-IR-u-ca-gregory-nu-latn' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekdays = t('calendar.weekdays').split(',');
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const move = (delta) => {
    setSelected(null);
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const selectedData = selected ? byDay[selected] : null;

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="icon-btn" onClick={() => move(-1)} aria-label={t('common.previous')}>
          <Prev size={18} />
        </button>
        <h3>{title}</h3>
        <button className="icon-btn" onClick={() => move(1)} aria-label={t('common.next')}>
          <Next size={18} />
        </button>
        <span className={`calendar-net ${plClass(monthNet)}`}>
          {t('calendar.monthNet')}: {money(monthNet, currency, { sign: true })}
        </span>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? (
        <Spinner />
      ) : (
        <div className="cal-grid">
          {weekdays.map((w) => (
            <div key={w} className="cal-dow">
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="cal-cell empty" />;
            const key = `${cursor.y}-${pad(cursor.m + 1)}-${pad(day)}`;
            const info = byDay[key];
            const tone = info ? (info.pl > 0 ? 'win' : info.pl < 0 ? 'loss' : 'be') : '';
            return (
              <button
                key={key}
                className={`cal-cell ${tone} ${key === today ? 'today' : ''} ${selected === key ? 'selected' : ''}`}
                onClick={() => info && setSelected(selected === key ? null : key)}
                disabled={!info}
              >
                <span className="cal-day">{day}</span>
                {info && (
                  <>
                    <span className="cal-pl">{money(info.pl, currency, { sign: true })}</span>
                    <span className="cal-count">{t('calendar.tradesCount', { n: info.trades.length })}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedData && (
        <div className="cal-detail">
          <h4>{formatDate(selected, lang)}</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('trade.fields.pair')}</th>
                  <th>{t('trade.fields.direction')}</th>
                  <th>{t('trade.fields.session')}</th>
                  <th className="num">{t('trade.fields.profitLoss')}</th>
                  <th>{t('trade.fields.result')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {selectedData.trades.map((tr) => (
                  <tr key={tr.id}>
                    <td>
                      <strong>{tr.pair}</strong>
                    </td>
                    <td>
                      <DirectionBadge direction={tr.direction} />
                    </td>
                    <td>{t(`session.${tr.session}`)}</td>
                    <td className={`num ${plClass(tr.profitLoss)}`}>{money(tr.profitLoss, currency, { sign: true })}</td>
                    <td>
                      <ResultBadge result={tr.result} />
                    </td>
                    <td>
                      <Link className="btn btn-sm btn-ghost" to={`/app/journal/${tr.id}`}>
                        {t('common.view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
