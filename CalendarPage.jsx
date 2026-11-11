import { Card, PageHeader } from '../components/ui.jsx';
import { useT } from '../context/PrefsContext.jsx';
import TradeCalendar from '../components/TradeCalendar.jsx';

export default function CalendarPage() {
  const t = useT();
  return (
    <>
      <PageHeader title={t('calendar.title')} subtitle={t('calendar.subtitle')} />
      <Card>
        <TradeCalendar />
      </Card>
    </>
  );
}
