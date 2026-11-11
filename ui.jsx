import { useEffect, useId, useRef } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';

export function Spinner({ label }) {
  return (
    <div className="spinner-wrap" role="status">
      <Loader2 className="spin" size={26} />
      {label && <span>{label}</span>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Loader2 className="spin" size={32} />
    </div>
  );
}

export function Card({ title, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <Inbox size={36} />
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  const t = useT();
  if (!error) return null;
  const key = `errors.${error.code}`;
  const text = t(key) !== key ? t(key) : error.message;
  return (
    <div className="alert alert-error" role="alert">
      <AlertTriangle size={18} />
      <span>{text}</span>
      {onRetry && (
        <button className="btn btn-sm btn-ghost" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  const t = useT();
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <header className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }) {
  const t = useT();
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="spin" size={16} />}
            {confirmLabel || t('common.confirm')}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function Pagination({ page, totalPages, total, onPage }) {
  const t = useT();
  const { dir } = usePrefs();
  if (totalPages <= 1 && !total) return null;
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;
  return (
    <div className="pagination">
      <span className="muted">{t('common.totalResults', { n: total })}</span>
      <div className="pagination-btns">
        <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('common.previous')}>
          <Prev size={16} />
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t('common.next')}>
          <Next size={16} />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export const ResultBadge = ({ result }) => {
  const t = useT();
  const cls = result === 'WIN' ? 'badge-win' : result === 'LOSS' ? 'badge-loss' : 'badge-be';
  return <span className={`badge ${cls}`}>{t(`result.${result}`)}</span>;
};

export const DirectionBadge = ({ direction }) => {
  const t = useT();
  return <span className={`badge ${direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{t(`direction.${direction}`)}</span>;
};
