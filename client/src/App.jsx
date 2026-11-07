import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Public Pages (Eagerly loaded for instant first paint)
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DevDiagnostics from './pages/DevDiagnostics';

// Customer Pages (Code-split with React.lazy)
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const MyAppointments = lazy(() => import('./pages/customer/MyAppointments'));
const LiveQueuePage = lazy(() => import('./pages/customer/LiveQueuePage'));
const ExploreServicesPage = lazy(() => import('./pages/customer/ExploreServicesPage'));
const HistoryPage = lazy(() => import('./pages/customer/HistoryPage'));
const CustomerProfilePage = lazy(() => import('./pages/customer/CustomerProfilePage'));

// Provider Pages (Code-split with React.lazy)
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const ProviderSubPage = lazy(() => import('./pages/provider/ProviderSubPage'));
const ProviderAnalyticsPage = lazy(() => import('./pages/provider/ProviderAnalyticsPage'));

// Staff Pages (Code-split with React.lazy)
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const StaffSubPage = lazy(() => import('./pages/staff/StaffSubPage'));
const StaffSchedulePage = lazy(() => import('./pages/staff/StaffSchedulePage'));
const StaffCheckInPage = lazy(() => import('./pages/staff/StaffCheckInPage'));
const StaffHistoryPage = lazy(() => import('./pages/staff/StaffHistoryPage'));

// Admin Pages (Code-split with React.lazy)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSubPage = lazy(() => import('./pages/admin/AdminSubPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminBusinessesPage = lazy(() => import('./pages/admin/AdminBusinessesPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#F3FAF5] flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3EAE5] flex items-center justify-center shadow-soft mb-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#16834A]" />
    </div>
    <p className="text-xs font-bold text-[#17231C]">Loading QueueLess...</p>
    <p className="text-[11px] text-[#66736B] mt-0.5">Please wait a moment</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public SaaS Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dev-diagnostics" element={<DevDiagnostics />} />

          {/* ================= CUSTOMER ROUTES ================= */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/appointments"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/queue"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <LiveQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/explore"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'provider', 'admin']}>
                <ExploreServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/services"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'provider', 'admin']}>
                <ExploreServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/history"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ================= PROVIDER ROUTES ================= */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/appointments"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="appointments" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/queues"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/staff"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="staff" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/services"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="services" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/hours"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="availability" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/announcements"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard initialTab="announcements" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/analytics"
            element={
              <ProtectedRoute allowedRoles={['provider', 'admin']}>
                <ProviderAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* ================= STAFF ROUTES ================= */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/schedule"
            element={
              <ProtectedRoute allowedRoles={['staff', 'provider', 'admin']}>
                <StaffSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/check-in"
            element={
              <ProtectedRoute allowedRoles={['staff', 'provider', 'admin']}>
                <StaffCheckInPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/history"
            element={
              <ProtectedRoute allowedRoles={['staff', 'provider', 'admin']}>
                <StaffHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/businesses"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBusinessesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
