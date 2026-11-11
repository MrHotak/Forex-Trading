import { useMemo, useRef, useState } from 'react';
import { Loader2, Save, ImagePlus, Trash2 } from 'lucide-react';
import { useT } from '../context/PrefsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { tradesApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { useFetch } from '../hooks/useFetch.js';
import { Card, Field, ErrorBox } from './ui.jsx';
import SecureImage from './SecureImage.jsx';
import { SESSIONS, RESULTS, EMOTIONS, PAIR_SUGGESTIONS, localDate, formatBytes, isNil } from '../utils/format.js';

const FIELDS = [
  'tradeDate', 'pair', 'session', 'direction', 'entryPrice', 'exitPrice', 'stopLoss', 'riskAmount', 'riskPercent',
  'balanceBefore', 'balanceAfter', 'reasonForEntry', 'emotion', 'reasonForExit', 'rrAchieved', 'lessonsLearned',
  'mistakes', 'profitLoss', 'result', 'lotSize', 'commission', 'swap', 'strategy', 'setup', 'entryTime', 'exitTime', 'notes',
];
const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

const blank = () => ({
  ...Object.fromEntries(FIELDS.map((f) => [f, ''])),
  tradeDate: localDate(),
  direction: 'BUY',
});

const fromTrade = (trade) =>
  Object.fromEntries(FIELDS.map((f) => [f, isNil(trade[f]) ? '' : String(trade[f])]));

const toNum = (v) => (v === '' || v === null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Live preview of what the server will fill in when those fields are left empty. */
function derive(f) {
  const out = {};
  const pl = toNum(f.profitLoss);
  const before = toNum(f.balanceBefore);
  const after = toNum(f.balanceAfter);
  let effectivePL = pl;
  if (pl === null && before !== null && after !== null) {
    effectivePL = r2(after - before);
    out.profitLoss = effectivePL;
  }
  if (after === null && before !== null && effectivePL !== null) out.balanceAfter = r2(before + effectivePL);
  if (effectivePL !== null) out.result = effectivePL > 0 ? 'WIN' : effectivePL < 0 ? 'LOSS' : 'BREAK_EVEN';
  const entry = toNum(f.entryPrice);
  const exit = toNum(f.exitPrice);
  const sl = toNum(f.stopLoss);
  if (toNum(f.rrAchieved) === null && entry !== null && exit !== null && sl !== null && entry !== sl) {
    const move = f.direction === 'BUY' ? exit - entry : entry - exit;
    out.rrAchieved = r2(move / Math.abs(entry - sl));
  }
  const risk = toNum(f.riskAmount);
  if (toNum(f.riskPercent) === null && risk !== null && before !== null && before > 0) {
    out.riskPercent = Math.min(100, r2((risk / before) * 100));
  }
  return out;
}

export default function TradeForm({ trade, onSaved, onCancel }) {
  const t = useT();
  const toast = useToast();
  const { errorText, fieldText } = useErrorText();
  const [form, setForm] = useState(() => (trade ? fromTrade(trade) : blank()));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState([]); // files chosen but not yet uploaded
  const [existing, setExisting] = useState(trade?.attachments || []);
  const fileRef = useRef(null);
  const meta = useFetch(() => tradesApi.meta(), []);

  const auto = useMemo(() => derive(form), [form]);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const err = (k) => (errors[k] ? fieldText(errors[k]) : '');
  const hint = (k) => (isNil(form[k]) && !isNil(auto[k]) ? t('trade.autoValue', { value: auto[k] }) : undefined);

  const pairOptions = useMemo(() => [...new Set([...(meta.data?.pairs || []), ...PAIR_SUGGESTIONS])], [meta.data]);

  const toggleEmotion = (key) => {
    const label = t(`emotion.${key}`);
    const parts = form.emotion.split(/[,،;]+/).map((s) => s.trim()).filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === label.toLowerCase());
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(label);
    setForm((f) => ({ ...f, emotion: parts.join(', ') }));
  };

  const addFiles = (list) => {
    const next = [...pending];
    for (const file of Array.from(list)) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(t('errors.INVALID_FILE_TYPE'));
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(t('errors.FILE_TOO_LARGE'));
        continue;
      }
      if (existing.length + next.length >= MAX_FILES) {
        toast.error(t('errors.TOO_MANY_ATTACHMENTS', { n: MAX_FILES }));
        break;
      }
      next.push(file);
    }
    setPending(next);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeExisting = async (att) => {
    try {
      await tradesApi.removeAttachment(trade.id, att.id);
      setExisting((list) => list.filter((a) => a.id !== att.id));
      toast.success(t('trade.screenshotRemoved'));
    } catch (e) {
      toast.error(errorText(parseError(e)));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.tradeDate) e.tradeDate = 'required';
    if (!form.pair.trim()) e.pair = 'required';
    if (!form.session) e.session = 'required';
    if (!form.direction) e.direction = 'required';
    if (isNil(form.entryPrice)) e.entryPrice = 'required';
    else if (!(Number(form.entryPrice) > 0)) e.entryPrice = 'range';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError(null);
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      toast.error(t('validation.fixErrors'));
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f, form[f]]));
      const res = trade ? await tradesApi.update(trade.id, payload) : await tradesApi.create(payload);
      let saved = res.trade;
      let failedUploads = 0;
      for (const file of pending) {
        try {
          await tradesApi.upload(saved.id, file);
        } catch {
          failedUploads += 1;
        }
      }
      if (failedUploads) toast.error(t('trade.uploadsFailed', { n: failedUploads }));
      else toast.success(t(trade ? 'trade.updated' : 'trade.created'));
      onSaved(saved);
    } catch (e) {
      const p = parseError(e);
      setErrors(p.fields);
      setFormError(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const num = (k, label, extra = {}) => (
    <Field label={label} error={err(k)} hint={hint(k)} required={extra.required}>
      <input type="number" step="any" inputMode="decimal" value={form[k]} onChange={set(k)} dir="ltr" {...extra.input} />
    </Field>
  );
  const text = (k, label, rows = 3, ph) => (
    <Field label={label} error={err(k)} className="span-2">
      <textarea rows={rows} value={form[k]} onChange={set(k)} placeholder={ph} maxLength={5000} />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="trade-form">
      {formError && <ErrorBox error={{ ...formError, code: formError.code === 'VALIDATION_ERROR' ? 'VALIDATION_ERROR' : formError.code }} />}

      <Card title={t('trade.sections.A')}>
        <div className="grid-form">
          <Field label={t('trade.fields.tradeDate')} error={err('tradeDate')} required>
            <input type="date" value={form.tradeDate} onChange={set('tradeDate')} dir="ltr" />
          </Field>
          <Field label={t('trade.fields.pair')} error={err('pair')} required>
            <input list="pair-list" value={form.pair} onChange={set('pair')} placeholder="EURUSD" maxLength={20} dir="ltr" style={{ textTransform: 'uppercase' }} autoComplete="off" />
            <datalist id="pair-list">
              {pairOptions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label={t('trade.fields.session')} error={err('session')} required>
            <select value={form.session} onChange={set('session')}>
              <option value="">{t('common.select')}</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`session.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('trade.fields.direction')} error={err('direction')} required>
            <div className="seg seg-block" role="group">
              {['BUY', 'SELL'].map((d) => (
                <button type="button" key={d} className={`${form.direction === d ? 'active' : ''} ${d === 'BUY' ? 'seg-buy' : 'seg-sell'}`} onClick={() => setForm((f) => ({ ...f, direction: d }))}>
                  {t(`direction.${d}`)}
                </button>
              ))}
            </div>
          </Field>
          {num('entryPrice', t('trade.fields.entryPrice'), { required: true })}
          {num('stopLoss', t('trade.fields.stopLoss'))}
          {num('riskAmount', t('trade.fields.riskAmount'))}
          {num('balanceBefore', t('trade.fields.balanceBefore'))}
          {text('reasonForEntry', t('trade.fields.reasonForEntry'), 3, t('trade.ph.reasonForEntry'))}
        </div>
      </Card>

      <Card title={t('trade.sections.B')}>
        <div className="grid-form">
          <Field label={t('trade.fields.emotion')} error={err('emotion')} className="span-2" hint={t('trade.hints.emotion')}>
            <input value={form.emotion} onChange={set('emotion')} maxLength={200} placeholder={t('trade.ph.emotion')} />
            <div className="chips chips-wrap" style={{ marginTop: 8 }}>
              {EMOTIONS.map((k) => {
                const on = form.emotion.toLowerCase().includes(t(`emotion.${k}`).toLowerCase());
                return (
                  <button type="button" key={k} className={`chip ${on ? 'active' : ''}`} onClick={() => toggleEmotion(k)}>
                    {t(`emotion.${k}`)}
                  </button>
                );
              })}
            </div>
          </Field>
          {text('reasonForExit', t('trade.fields.reasonForExit'), 4, t('trade.ph.reasonForExit'))}
        </div>
      </Card>

      <Card title={t('trade.sections.C')}>
        <div className="grid-form">
          {num('exitPrice', t('trade.fields.exitPrice'))}
          {num('profitLoss', t('trade.fields.profitLoss'))}
          {num('balanceAfter', t('trade.fields.balanceAfter'))}
          {num('rrAchieved', t('trade.fields.rrAchieved'))}
          <Field label={t('trade.fields.result')} error={err('result')} hint={isNil(form.result) && auto.result ? t('trade.autoValue', { value: t(`result.${auto.result}`) }) : t('trade.hints.result')}>
            <select value={form.result} onChange={set('result')}>
              <option value="">{t('trade.autoOption')}</option>
              {RESULTS.map((r) => (
                <option key={r} value={r}>
                  {t(`result.${r}`)}
                </option>
              ))}
            </select>
          </Field>
          {text('lessonsLearned', t('trade.fields.lessonsLearned'), 3, t('trade.ph.lessons'))}
          {text('mistakes', t('trade.fields.mistakes'), 3, t('trade.ph.mistakes'))}
        </div>
      </Card>

      <Card title={t('trade.sections.D')}>
        <div className="grid-form">
          {num('riskPercent', t('trade.fields.riskPercent'), { input: { min: 0, max: 100 } })}
          {num('lotSize', t('trade.fields.lotSize'), { input: { min: 0 } })}
          {num('commission', t('trade.fields.commission'))}
          {num('swap', t('trade.fields.swap'))}
          <Field label={t('trade.fields.strategy')} error={err('strategy')}>
            <input list="strategy-list" value={form.strategy} onChange={set('strategy')} maxLength={100} autoComplete="off" />
            <datalist id="strategy-list">
              {(meta.data?.strategies || []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label={t('trade.fields.setup')} error={err('setup')}>
            <input list="setup-list" value={form.setup} onChange={set('setup')} maxLength={100} autoComplete="off" />
            <datalist id="setup-list">
              {(meta.data?.setups || []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label={t('trade.fields.entryTime')} error={err('entryTime')}>
            <input type="time" value={form.entryTime} onChange={set('entryTime')} dir="ltr" />
          </Field>
          <Field label={t('trade.fields.exitTime')} error={err('exitTime')}>
            <input type="time" value={form.exitTime} onChange={set('exitTime')} dir="ltr" />
          </Field>

          <div className="field span-2">
            <span className="field-label">{t('trade.fields.screenshot')}</span>
            <div className="shots">
              {existing.map((a) => (
                <div className="shot" key={a.id}>
                  <SecureImage tradeId={trade.id} attachment={a} />
                  <button type="button" className="shot-del" onClick={() => removeExisting(a)} aria-label={t('common.delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {pending.map((f, i) => (
                <div className="shot" key={`${f.name}-${i}`}>
                  <img src={URL.createObjectURL(f)} alt={f.name} onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                  <small className="shot-name">{formatBytes(f.size)}</small>
                  <button type="button" className="shot-del" onClick={() => setPending((p) => p.filter((_, j) => j !== i))} aria-label={t('common.delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {existing.length + pending.length < MAX_FILES && (
                <button type="button" className="shot shot-add" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={22} />
                  <span>{t('trade.addScreenshot')}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            <span className="field-hint">{t('trade.hints.screenshot', { n: MAX_FILES })}</span>
          </div>

          {text('notes', t('trade.fields.notes'), 3)}
        </div>
      </Card>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
          {trade ? t('trade.saveChanges') : t('trade.saveTrade')}
        </button>
      </div>
    </form>
  );
}
