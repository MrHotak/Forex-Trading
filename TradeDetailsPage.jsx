import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { tradesApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Spinner, ErrorBox, ResultBadge, DirectionBadge, ConfirmDialog, Modal } from '../components/ui.jsx';
import SecureImage from '../components/SecureImage.jsx';
import { money, price, pct, num, formatDate, plClass } from '../utils/format.js';

function Row({ label, children }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
const Text = ({ value }) => (value ? <p className="prewrap">{value}</p> : <span className="muted">—</span>);

export default function TradeDetailsPage() {
  const t = useT();
  const { lang, dir } = usePrefs();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useAuth();
  const { errorText } = useErrorText();
  const currency = settings?.currency || 'USD';
  const { data, error, loading, reload } = useFetch(() => tradesApi.get(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return null;
  const tr = data.trade;

  const remove = async () => {
    setBusy(true);
    try {
      await tradesApi.remove(tr.id);
      toast.success(t('trade.deleted'));
      navigate('/app/journal', { replace: true });
    } catch (e) {
      toast.error(errorText(parseError(e)));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${tr.pair} · ${tr.tradeId}`}
        subtitle={formatDate(tr.tradeDate, lang)}
        actions={
          <>
            <Link to="/app/journal" className="btn btn-ghost">
              <Back size={16} /> {t('common.back')}
            </Link>
            <Link to={`/app/journal/${tr.id}/edit`} className="btn btn-primary">
              <Pencil size={16} /> {t('common.edit')}
            </Link>
            <button className="btn btn-danger-ghost" onClick={() => setConfirm(true)}>
              <Trash2 size={16} /> {t('common.delete')}
            </button>
          </>
        }
      />

      <div className="detail-hero">
        <div className={`detail-pl ${plClass(tr.profitLoss)}`}>{money(tr.profitLoss, currency, { sign: true })}</div>
        <div className="detail-badges">
          <ResultBadge result={tr.result} />
          <DirectionBadge direction={tr.direction} />
          <span className="badge">{t(`session.${tr.session}`)}</span>
          {tr.rrAchieved !== null && <span className="badge">{num(tr.rrAchieved)}R</span>}
        </div>
      </div>

      <div className="detail-grid">
        <Card title={t('trade.sections.A')}>
          <dl className="detail-list">
            <Row label={t('trade.fields.tradeDate')}>{formatDate(tr.tradeDate, lang)}</Row>
            <Row label={t('trade.fields.pair')}>{tr.pair}</Row>
            <Row label={t('trade.fields.session')}>{t(`session.${tr.session}`)}</Row>
            <Row label={t('trade.fields.direction')}>
              <DirectionBadge direction={tr.direction} />
            </Row>
            <Row label={t('trade.fields.entryPrice')}>{price(tr.entryPrice)}</Row>
            <Row label={t('trade.fields.stopLoss')}>{price(tr.stopLoss)}</Row>
            <Row label={t('trade.fields.riskAmount')}>{money(tr.riskAmount, currency)}</Row>
            <Row label={t('trade.fields.balanceBefore')}>{money(tr.balanceBefore, currency)}</Row>
            <Row label={t('trade.fields.reasonForEntry')}>
              <Text value={tr.reasonForEntry} />
            </Row>
          </dl>
        </Card>

        <Card title={t('trade.sections.B')}>
          <dl className="detail-list">
            <Row label={t('trade.fields.emotion')}>
              <Text value={tr.emotion} />
            </Row>
            <Row label={t('trade.fields.reasonForExit')}>
              <Text value={tr.reasonForExit} />
            </Row>
          </dl>
        </Card>

        <Card title={t('trade.sections.C')}>
          <dl className="detail-list">
            <Row label={t('trade.fields.exitPrice')}>{price(tr.exitPrice)}</Row>
            <Row label={t('trade.fields.profitLoss')}>
              <span className={plClass(tr.profitLoss)}>{money(tr.profitLoss, currency, { sign: true })}</span>
            </Row>
            <Row label={t('trade.fields.balanceAfter')}>{money(tr.balanceAfter, currency)}</Row>
            <Row label={t('trade.fields.rrAchieved')}>{tr.rrAchieved === null ? '—' : `${num(tr.rrAchieved)}R`}</Row>
            <Row label={t('trade.fields.result')}>
              <ResultBadge result={tr.result} />
            </Row>
            <Row label={t('trade.fields.lessonsLearned')}>
              <Text value={tr.lessonsLearned} />
            </Row>
            <Row label={t('trade.fields.mistakes')}>
              <Text value={tr.mistakes} />
            </Row>
          </dl>
        </Card>

        <Card title={t('trade.sections.D')}>
          <dl className="detail-list">
            <Row label={t('trade.fields.tradeId')}>
              <code>{tr.tradeId}</code>
            </Row>
            <Row label={t('trade.fields.riskPercent')}>{pct(tr.riskPercent)}</Row>
            <Row label={t('trade.fields.lotSize')}>{num(tr.lotSize, 4)}</Row>
            <Row label={t('trade.fields.commission')}>{money(tr.commission, currency)}</Row>
            <Row label={t('trade.fields.swap')}>{money(tr.swap, currency)}</Row>
            <Row label={t('trade.fields.strategy')}>{tr.strategy || '—'}</Row>
            <Row label={t('trade.fields.setup')}>{tr.setup || '—'}</Row>
            <Row label={t('trade.fields.entryTime')}>{tr.entryTime || '—'}</Row>
            <Row label={t('trade.fields.exitTime')}>{tr.exitTime || '—'}</Row>
            <Row label={t('trade.fields.notes')}>
              <Text value={tr.notes} />
            </Row>
          </dl>
        </Card>
      </div>

      <Card title={t('trade.fields.screenshot')}>
        {tr.attachments.length === 0 ? (
          <p className="muted">{t('trade.noScreenshots')}</p>
        ) : (
          <div className="shots shots-large">
            {tr.attachments.map((a) => (
              <button key={a.id} className="shot shot-view" onClick={() => setZoom(a)} aria-label={a.fileName}>
                <SecureImage tradeId={tr.id} attachment={a} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {zoom && (
        <Modal title={zoom.fileName} onClose={() => setZoom(null)} wide>
          <SecureImage tradeId={tr.id} attachment={zoom} className="zoom-img" />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog danger busy={busy} title={t('trade.deleteTitle')} message={t('trade.deleteConfirm', { id: tr.tradeId })} confirmLabel={t('common.delete')} onConfirm={remove} onCancel={() => setConfirm(false)} />
      )}
    </>
  );
}
