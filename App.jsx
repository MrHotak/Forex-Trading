import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute.jsx';
import { PageLoader } from './components/ui.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Heavy pages (charts) are loaded on demand to keep the first load fast.
const DashboardPage = lazy(() => import('./dashboard/DashboardPage.jsx'));
const JournalPage = lazy(() => import('./pages/JournalPage.jsx'));
const TradeEditorPage = lazy(() => import('./pages/TradeEditorPage.jsx'));
const TradeDetailsPage = lazy(() => import('./pages/TradeDetailsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx'));
const PsychologyPage = lazy(() => import('./pages/PsychologyPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const HelpPage = lazy(() => import('./pages/HelpPage.jsx'));
const ProfilePage = lazy(() => import('./user/ProfilePage.jsx'));
const SettingsPage = lazy(() => import('./user/SettingsPage.jsx'));
const AdminDashboardPage = lazy(() => import('./admin/AdminDashboardPage.jsx'));
const AdminUsersPage = lazy(() => import('./admin/AdminUsersPage.jsx'));
const AdminLogsPage = lazy(() => import('./admin/AdminLogsPage.jsx'));
const AdminSystemPage = lazy(() => import('./admin/AdminSystemPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="journal/new" element={<TradeEditorPage />} />
          <Route path="journal/:id" element={<TradeDetailsPage />} />
          <Route path="journal/:id/edit" element={<TradeEditorPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="psychology" element={<PsychologyPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
