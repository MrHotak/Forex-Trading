import { useMemo } from 'react';
import { useT } from '../context/PrefsContext.jsx';
import { localDate } from '../utils/format.js';

export const RANGES = ['today', 'week', 'month', 'lastMonth', 'year', 'all', 'custom'];

/** value = { range, from, to }. Use rangeParams(value) to build the API query. */
export function rangeParams(v) {
  const p = { range: v.range, today: localDate() };
  if (v.range === 'custom') {
    if (v.from) p.from = v.from;
    if (v.to) p.to = v.to;
  }
  return p;
}

export default function RangeFilter({ value, onChange }) {
  const t = useT();
  const key = useMemo(() => `${value.range}|${value.from}|${value.to}`, [value]);
  return (
    <div className="range-filter" data-key={key}>
      <div className="chips" role="tablist">
        {RANGES.map((r) => (
          <button key={r} role="tab" aria-selected={value.range === r} className={`chip ${value.range === r ? 'active' : ''}`} onClick={() => onChange({ ...value, range: r })}>
            {t(`range.${r}`)}
          </button>
        ))}
      </div>
      {value.range === 'custom' && (
        <div className="range-custom">
          <input type="date" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label={t('range.from')} />
          <span className="muted">→</span>
          <input type="date" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label={t('range.to')} />
        </div>
      )}
    </div>
  );
}
