import { LayoutDashboard, BookOpen, PlusCircle, BarChart3, CalendarDays, Brain, FileText, UserRound, Settings, LifeBuoy, ShieldCheck } from 'lucide-react';
import Shell from './Shell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ITEMS = [
  { to: '/app', icon: LayoutDashboard, label: 'nav.dashboard', end: true },
  { to: '/app/journal', icon: BookOpen, label: 'nav.journal', end: true },
  { to: '/app/journal/new', icon: PlusCircle, label: 'nav.addTrade' },
  { to: '/app/analytics', icon: BarChart3, label: 'nav.analytics' },
  { to: '/app/calendar', icon: CalendarDays, label: 'nav.calendar' },
  { to: '/app/psychology', icon: Brain, label: 'nav.psychology' },
  { to: '/app/reports', icon: FileText, label: 'nav.reports' },
];
const MORE = [
  { to: '/app/profile', icon: UserRound, label: 'nav.profile' },
  { to: '/app/settings', icon: Settings, label: 'nav.settings' },
  { to: '/app/help', icon: LifeBuoy, label: 'nav.help' },
];

export default function AppLayout() {
  const { isAdmin } = useAuth();
  const extra = isAdmin ? [...MORE, { to: '/admin', icon: ShieldCheck, label: 'nav.adminPanel' }] : MORE;
  return <Shell items={ITEMS} extraItems={extra} />;
}
