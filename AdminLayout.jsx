import { LayoutDashboard, Users, ScrollText, Server, ArrowLeftCircle } from 'lucide-react';
import Shell from './Shell.jsx';

const ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'admin.nav.dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'admin.nav.users' },
  { to: '/admin/logs', icon: ScrollText, label: 'admin.nav.logs' },
  { to: '/admin/system', icon: Server, label: 'admin.nav.system' },
];
const BACK = [{ to: '/app', icon: ArrowLeftCircle, label: 'admin.nav.backToJournal' }];

export default function AdminLayout() {
  return <Shell items={ITEMS} extraItems={BACK} badge="admin.badge" />;
}
