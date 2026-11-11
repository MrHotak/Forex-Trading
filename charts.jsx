import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { monthLabel, num } from '../utils/format.js';

export const COLORS = { profit: '#22C55E', loss: '#EF4444', accent: '#3B82F6', neutral: '#94A3B8', amber: '#F59E0B' };

const axisProps = { stroke: 'var(--text-2)', tick: { fill: 'var(--text-2)', fontSize: 12 }, tickLine: false, axisLine: { stroke: 'var(--border)' } };
const tooltipStyle = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13 },
  labelStyle: { color: 'var(--text-2)' },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--hover)' },
};

function ChartBox({ height = 280, empty, children }) {
  const t = useT();
  if (empty) return <div className="chart-empty muted">{t('common.noData')}</div>;
  // dir="ltr": chart axes stay left-to-right even on Persian pages so numbers read correctly.
  return (
    <div dir="ltr" style={{ width: '100%', height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

export function MonthlyPLChart({ data }) {
  const { lang } = usePrefs();
  const t = useT();
  const rows = data.map((m) => ({ label: monthLabel(m.key, lang), pl: m.netProfit }));
  return (
    <ChartBox empty={!rows.length}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={56} />
        <Tooltip {...tooltipStyle} formatter={(v) => [num(v), t('metrics.netProfit')]} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Bar dataKey="pl" radius={[4, 4, 0, 0]} maxBarSize={42}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.pl >= 0 ? COLORS.profit : COLORS.loss} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

/** Daily P/L bars with the cumulative curve on top. */
export function DailyChart({ data }) {
  const t = useT();
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ChartBox empty={!rows.length}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={18} />
        <YAxis {...axisProps} width={56} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [num(v), name === 'pl' ? t('charts.dailyPL') : t('charts.cumulative')]} labelFormatter={(l, p) => p?.[0]?.payload?.date || l} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Bar dataKey="pl" maxBarSize={28} radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.pl >= 0 ? COLORS.profit : COLORS.loss} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="cumulative" stroke={COLORS.accent} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartBox>
  );
}

export function WinLossChart({ summary }) {
  const t = useT();
  const rows = [
    { name: t('result.WIN'), value: summary.winningTrades, color: COLORS.profit },
    { name: t('result.LOSS'), value: summary.losingTrades, color: COLORS.loss },
    { name: t('result.BREAK_EVEN'), value: summary.breakEvenTrades, color: COLORS.neutral },
  ].filter((r) => r.value > 0);
  return (
    <ChartBox empty={!rows.length}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3} stroke="none">
          {rows.map((r) => (
            <Cell key={r.name} fill={r.color} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: 'var(--text-2)', fontSize: 13 }} />
      </PieChart>
    </ChartBox>
  );
}

/** Horizontal-friendly category bar chart (pairs, sessions, long/short). `labelOf` translates the key. */
export function CategoryPLChart({ data, labelOf = (k) => k, height = 280 }) {
  const t = useT();
  const rows = data.map((r) => ({ label: labelOf(r.key), pl: r.netProfit, trades: r.totalTrades, winRate: r.winRate }));
  return (
    <ChartBox empty={!rows.length} height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={56} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v, _n, p) => [`${num(v)}  (${p.payload.trades} ${t('metrics.trades')}, ${num(p.payload.winRate)}%)`, t('metrics.netProfit')]}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Bar dataKey="pl" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.pl >= 0 ? COLORS.profit : COLORS.loss} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function MonthlyWinRateChart({ data }) {
  const { lang } = usePrefs();
  const t = useT();
  const rows = data.map((m) => ({ label: monthLabel(m.key, lang), winRate: m.winRate, trades: m.totalTrades }));
  return (
    <ChartBox empty={!rows.length}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={44} domain={[0, 100]} unit="%" />
        <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [`${num(v)}%  (${p.payload.trades} ${t('metrics.trades')})`, t('metrics.winRate')]} />
        <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="winRate" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.accent }} />
      </LineChart>
    </ChartBox>
  );
}
