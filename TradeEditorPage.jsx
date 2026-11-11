import { useNavigate, useParams } from 'react-router-dom';
import { useT } from '../context/PrefsContext.jsx';
import { tradesApi } from '../services/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { PageHeader, Spinner, ErrorBox } from '../components/ui.jsx';
import TradeForm from '../components/TradeForm.jsx';

/** One page for both "Add New Trade" (/app/journal/new) and "Edit Trade" (/app/journal/:id/edit). */
export default function TradeEditorPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const { data, error, loading, reload } = useFetch(() => (editing ? tradesApi.get(id) : Promise.resolve(null)), [id]);

  return (
    <>
      <PageHeader title={t(editing ? 'trade.editTitle' : 'trade.addTitle')} subtitle={t(editing ? 'trade.editSubtitle' : 'trade.addSubtitle')} />
      <ErrorBox error={error} onRetry={reload} />
      {editing && loading && !data ? (
        <Spinner />
      ) : editing && !data ? null : (
        <TradeForm
          key={id || 'new'}
          trade={data?.trade || null}
          onSaved={(saved) => navigate(`/app/journal/${saved.id}`)}
          onCancel={() => navigate(editing ? `/app/journal/${id}` : '/app/journal')}
        />
      )}
    </>
  );
}
