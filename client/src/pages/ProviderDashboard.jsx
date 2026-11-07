import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  CalendarCheck2,
  Ticket,
  Users,
  Clock,
  TrendingUp,
  Plus,
  ArrowUpRight,
  RefreshCw,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  Megaphone,
  Power,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import Button from '../components/ui/Button';
import LiveQueueTerminal from '../components/admin/LiveQueueTerminal';
import StaffManagementSection from '../components/provider/StaffManagementSection';
import AvailabilitySection from '../components/provider/AvailabilitySection';
import AnnouncementsSection from '../components/provider/AnnouncementsSection';
import AppointmentsSection from '../components/provider/AppointmentsSection';
import ServicesManagementSection from '../components/provider/ServicesManagementSection';
import api from '../services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'services', label: 'Services Catalog', icon: Tag },
  { id: 'staff', label: 'Staff Management', icon: Users },
  { id: 'availability', label: 'Booking Availability', icon: Clock },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck2 },
];

export default function ProviderDashboard({ initialTab = 'overview' }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [services, setServices] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [staff, setStaff] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');

  // Determine active tab from URL query param or initialTab prop
  const currentTab = searchParams.get('tab') || initialTab || 'overview';
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/businesses/my/profile');
      if (res.data?.success) {
        setBusinessData(res.data.business);
        setServices(res.data.services || []);
        setWorkingHours(res.data.workingHours || []);
        setStaff(res.data.staff || []);
      }

      // Fetch active announcements
      try {
        const annRes = await api.get('/announcements/my');
        if (annRes.data?.success) {
          setAnnouncements(annRes.data.announcements || []);
        }
      } catch {
        // Ignore announcement load error in overview
      }
    } catch (err) {
      console.warn('Failed to load provider business profile:', err);
      setError(err.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Service Provider Dashboard" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Verified Business Entity
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    businessData?.isBookingsOpen !== false
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {businessData?.isBookingsOpen !== false ? '● Bookings Open' : '○ Bookings Paused'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                {businessData?.name || 'Metro Health Clinic'}
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Operating Provider: <span className="font-semibold text-[#17231C]">{user?.name || 'Dr. Sarah Jenkins'}</span> • Category: <span className="capitalize">{businessData?.category || 'Clinic'}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProfile}
                leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16834A]' : ''}`} />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('announcements')}
                leftIcon={<Megaphone className="w-4 h-4" />}
              >
                New Announcement
              </Button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-[#E3EAE5]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#16834A] text-white shadow-soft'
                      : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:text-[#17231C] hover:border-[#16834A]/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Business KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div
                  onClick={() => setActiveTab('appointments')}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-2 cursor-pointer hover:border-[#16834A]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Appointments</span>
                    <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                      <CalendarCheck2 className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#17231C]">
                    Manage
                  </h3>
                  <p className="text-[11px] text-[#16834A] font-semibold flex items-center">
                    Assign staff & review tokens &rarr;
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('staff')}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-2 cursor-pointer hover:border-[#16834A]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Staff Members</span>
                    <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#17231C]">
                    {loading ? '...' : staff.length || 1}
                  </h3>
                  <p className="text-[11px] text-[#16834A] font-semibold">
                    Manage practitioner roster &rarr;
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('availability')}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-2 cursor-pointer hover:border-[#16834A]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Booking Status</span>
                    <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                      <Power className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#11643A]">
                    {businessData?.isBookingsOpen !== false ? 'Open' : 'Closed'}
                  </h3>
                  <p className="text-[11px] text-[#66736B]">
                    Holidays & blocked slots &rarr;
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('announcements')}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-2 cursor-pointer hover:border-[#16834A]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Announcements</span>
                    <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#16834A]">
                    {announcements.length}
                  </h3>
                  <p className="text-[11px] text-[#16834A] font-semibold">Broadcast updates &rarr;</p>
                </div>
              </div>

              {/* Real-Time Live Queue Dispatcher */}
              <LiveQueueTerminal onQueueActivity={fetchProfile} />

              {/* Active Services Catalog Preview */}
              <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                  <div>
                    <h3 className="font-bold text-[#17231C] text-base">Offered Medical & Clinical Services</h3>
                    <p className="text-xs text-[#66736B]">Configured services and consultation durations for your business</p>
                  </div>
                  <button onClick={() => setActiveTab('services')}>
                    <Button variant="outline" size="sm">
                      Manage Full Catalog &rarr;
                    </Button>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {services.map((srv) => (
                    <div
                      key={srv._id}
                      className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-2 hover:border-[#16834A]/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#16834A] bg-white px-2 py-0.5 rounded-lg border border-[#E3EAE5]">
                          {srv.durationMinutes} mins
                        </span>
                        <span className="font-bold text-sm text-[#11643A]">
                          ${srv.price}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#17231C]">{srv.name}</h4>
                      <p className="text-[11px] text-[#66736B] line-clamp-2">
                        {srv.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Services Catalog */}
          {currentTab === 'services' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
              <ServicesManagementSection onServicesChanged={fetchProfile} />
            </div>
          )}

          {/* Tab 2: Staff Management */}
          {currentTab === 'staff' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
              <StaffManagementSection services={services} />
            </div>
          )}

          {/* Tab 3: Availability Controls */}
          {currentTab === 'availability' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
              <AvailabilitySection />
            </div>
          )}

          {/* Tab 4: Customer Announcements */}
          {currentTab === 'announcements' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
              <AnnouncementsSection />
            </div>
          )}

          {/* Tab 5: Appointments Roster */}
          {currentTab === 'appointments' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
              <AppointmentsSection />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
