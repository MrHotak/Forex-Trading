import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Table2, CalendarDays, Columns3, Eye, Pencil, Trash2, ArrowUp, ArrowDown, Download, X } from 'lucide-react';
import { useT, usePrefs } from '../context/PrefsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { tradesApi, dataApi } from '../services/endpoints.js';
import { parseError } from '../services/api.js';
import { useFetch, useDebounced } from '../hooks/useFetch.js';
import { useErrorText } from '../hooks/useErrorText.js';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, Pagination, ConfirmDialog } from '../components/ui.jsx';
import TradeCalendar from '../components/TradeCalendar.jsx';
import { COLUMNS, DEFAULT_VISIBLE } from '../components/journalColumns.jsx';
import { SESSIONS, RESULTS } from '../utils/format.js';

const COLS_KEY = 'ftj_columns';
const loadCols = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(COLS_KEY));
    if (Array.isArray(saved) && saved.length) return saved.filter((k) => COLUMNS.some((c) => c.key === k));
  } catch {
    /* ignore */
  }
  return DEFAULT_VISIBLE;
};

const EMPTY_FILTERS = { q: '', from: '', to: '', pair: '', direction: '', session: '', result: '' };

export default function JournalPage() {
  const t = useT();
  const { lang } = usePrefs();
  const { settings } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { errorText } = useErrorText();
  const currency = settings?.currency || 'USD';

  const [view, setView] = useState('table');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visible, setVisible] = useState(loadCols);
  const [colMenu, setColMenu] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedQ = useDebounced(filters.q);
  const query = useMemo(() => {
    const p = { sort, page, pageSize };
    for (const [k, v] of Object.entries({ ...filters, q: debouncedQ })) if (v) p[k] = v;
    return p;
  }, [filters, debouncedQ, sort, page, pageSize]);
  const filterOnly = useMemo(() => {
    const { sort: _s, page: _p, pageSize: _ps, ...rest } = query;
    return rest;
  }, [query]);

  useEffect(() => setPage(1), [debouncedQ, filters.from, filters.to, filters.pair, filters.direction, filters.session, filters.result, pageSize]);
  useEffect(() => {
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  const list = useFetch(() => (view === 'table' ? tradesApi.list(query) : Promise.resolve(null)), [view, JSON.stringify(query)]);
  const meta = useFetch(() => tradesApi.meta(), []);

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const columns = COLUMNS.filter((c) => visible.includes(c.key));
  const ctx = { t, lang, currency };

  const toggleSort = (kind) => setSort((s) => (s === `${kind}_desc` ? `${kind}_asc` : `${kind}_desc`));
  const sortIcon = (kind) => (sort === `${kind}_desc` ? <ArrowDown size={13} /> : sort === `${kind}_asc` ? <ArrowUp size={13} /> : null);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await tradesApi.remove(toDelete.id);
      toast.success(t('trade.deleted'));
      setToDelete(null);
      list.reload();
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await dataApi.csv({ ...filterOnly, sort });
    } catch (e) {
      toast.error(errorText(parseError(e)));
    } finally {
      setExporting(false);
    }
  };

  const items = list.data?.items || [];

  return (
    <>
      <PageHeader
        title={t('journal.title')}
        subtitle={t('journal.subtitle')}
        actions={
          <>
            <button className="btn btn-ghost" onClick={exportCsv} disabled={exporting}>
              <Download size={16} /> {t('journal.exportCsv')}
            </button>
            <Link to="/app/journal/new" className="btn btn-primary">
              <PlusCircle size={16} /> {t('nav.addTrade')}
            </Link>
          </>
        }
      />

      <Card pad={false}>
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input value={filters.q} onChange={setF('q')} placeholder={t('journal.search')} aria-label={t('journal.search')} />
          </div>
          <div className="seg" role="group" aria-label={t('journal.view')}>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <Table2 size={15} /> {t('journal.tableView')}
            </button>
            <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              <CalendarDays size={15} /> {t('journal.calendarView')}
            </button>
          </div>
        </div>

        <div className="filters">
          <label>
            <span>{t('journal.dateFrom')}</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={setF('from')} dir="ltr" />
          </label>
          <label>
            <span>{t('journal.dateTo')}</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={setF('to')} dir="ltr" />
          </label>
          <label>
            <span>{t('trade.fields.pair')}</span>
            <select value={filters.pair} onChange={setF('pair')}>
              <option value="">{t('common.all')}</option>
              {(meta.data?.pairs || []).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('trade.fields.direction')}</span>
            <select value={filters.direction} onChange={setF('direction')}>
              <option value="">{t('common.all')}</option>
              <option value="BUY">{t('direction.BUY')}</option>
              <option value="SELL">{t('direction.SELL')}</option>
            </select>
          </label>
          <label>
            <span>{t('trade.fields.session')}</span>
            <select value={filters.session} onChange={setF('session')}>
              <option value="">{t('common.all')}</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`session.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('trade.fields.result')}</span>
            <select value={filters.result} onChange={setF('result')}>
              <option value="">{t('common.all')}</option>
              {RESULTS.map((r) => (
                <option key={r} value={r}>
                  {t(`result.${r}`)}
                </option>
              ))}
            </select>
          </label>
          {view === 'table' && (
            <label>
              <span>{t('journal.sortBy')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="date_desc">{t('journal.sort.dateDesc')}</option>
                <option value="date_asc">{t('journal.sort.dateAsc')}</option>
                <option value="pl_desc">{t('journal.sort.plDesc')}</option>
                <option value="pl_asc">{t('journal.sort.plAsc')}</option>
              </select>
            </label>
          )}
          {hasFilters && (
            <button className="btn btn-sm btn-ghost filter-clear" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X size={14} /> {t('journal.clearFilters')}
            </button>
          )}
        </div>

        {view === 'calendar' ? (
          <div className="card-body">
            <TradeCalendar filters={filterOnly} />
          </div>
        ) : (
          <>
            <div className="table-tools">
              <div className="col-menu-wrap">
                <button className="btn btn-sm btn-ghost" onClick={() => setColMenu((o) => !o)} aria-expanded={colMenu}>
                  <Columns3 size={15} /> {t('journal.columns')}
                </button>
                {colMenu && (
                  <>
                    <div className="menu-scrim" onClick={() => setColMenu(false)} />
                    <div className="col-menu">
                      <div className="col-menu-actions">
                        <button className="link-btn" onClick={() => setVisible(COLUMNS.map((c) => c.key))}>
                          {t('journal.showAll')}
                        </button>
                        <button className="link-btn" onClick={() => setVisible(DEFAULT_VISIBLE)}>
                          {t('journal.resetColumns')}
                        </button>
                      </div>
                      {COLUMNS.map((c) => (
                        <label key={c.key} className="check">
                          <input
                            type="checkbox"
                            checked={visible.includes(c.key)}
                            onChange={(e) => setVisible((v) => (e.target.checked ? [...v, c.key] : v.length > 1 ? v.filter((k) => k !== c.key) : v))}
                          />
                          <span>{t(c.label)}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <label className="inline-select">
                <span className="muted">{t('journal.rowsPerPage')}</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>

            <ErrorBox error={list.error} onRetry={list.reload} />
            {list.loading && !list.data ? (
              <Spinner />
            ) : items.length === 0 ? (
              <EmptyState
                title={hasFilters ? t('journal.noResults') : t('journal.emptyTitle')}
                text={hasFilters ? t('journal.noResultsText') : t('journal.emptyText')}
                action={
                  !hasFilters && (
                    <Link to="/app/journal/new" className="btn btn-primary">
                      <PlusCircle size={16} /> {t('nav.addTrade')}
                    </Link>
                  )
                }
              />
            ) : (
              <div className={`table-wrap ${list.loading ? 'is-loading' : ''}`}>
                <table className="table table-journal">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c.key} className={c.num ? 'num' : ''}>
                          {c.sort ? (
                            <button className="th-sort" onClick={() => toggleSort(c.sort)}>
                              {t(c.label)} {sortIcon(c.sort)}
                            </button>
                          ) : (
                            t(c.label)
                          )}
                        </th>
                      ))}
                      <th className="sticky-actions">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id} className="row-click" onClick={() => navigate(`/app/journal/${r.id}`)}>
                        {columns.map((c) => (
                          <td key={c.key} className={`${c.num ? 'num' : ''} ${c.long ? 'cell-long' : ''}`} title={c.long ? r[c.key] || '' : undefined}>
                            {c.render(r, ctx)}
                          </td>
                        ))}
                        <td className="sticky-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <Link className="icon-btn" to={`/app/journal/${r.id}`} aria-label={t('common.view')} title={t('common.view')}>
                              <Eye size={16} />
                            </Link>
                            <Link className="icon-btn" to={`/app/journal/${r.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')}>
                              <Pencil size={16} />
                            </Link>
                            <button className="icon-btn danger" onClick={() => setToDelete(r)} aria-label={t('common.delete')} title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
          </>
        )}
      </Card>

      {toDelete && (
        <ConfirmDialog
          danger
          busy={deleting}
          title={t('trade.deleteTitle')}
          message={t('trade.deleteConfirm', { id: toDelete.tradeId })}
          confirmLabel={t('common.delete')}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
