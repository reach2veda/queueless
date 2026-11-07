import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Layers,
  LayoutDashboard,
  CalendarCheck2,
  Ticket,
  Search,
  History,
  User,
  Building2,
  Users,
  Clock,
  BarChart3,
  CheckSquare,
  ShieldAlert,
  Settings,
  Megaphone,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardSidebar({ isOpen, closeSidebar }) {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role || 'customer';

  // Role-specific navigation items
  const menuConfig = {
    customer: [
      { name: 'Overview', path: '/customer/dashboard', icon: LayoutDashboard },
      { name: 'My Appointments', path: '/customer/appointments', icon: CalendarCheck2 },
      { name: 'Live Queue Ticket', path: '/customer/queue', icon: Ticket },
      { name: 'Explore Services', path: '/customer/explore', icon: Search },
      { name: 'History & Reviews', path: '/customer/history', icon: History },
      { name: 'Profile Settings', path: '/customer/profile', icon: User },
    ],
    provider: [
      { name: 'Business Overview', path: '/provider/dashboard', icon: LayoutDashboard },
      { name: 'All Appointments', path: '/provider/appointments', icon: CalendarCheck2 },
      { name: 'Staff Management', path: '/provider/staff', icon: Users },
      { name: 'Booking Availability', path: '/provider/hours', icon: Clock },
      { name: 'Announcements', path: '/provider/announcements', icon: Megaphone },
      { name: 'Services & Pricing', path: '/provider/services', icon: Building2 },
      { name: 'Analytics & Reports', path: '/provider/analytics', icon: BarChart3 },
    ],
    staff: [
      { name: 'Queue Terminal', path: '/staff/dashboard', icon: LayoutDashboard },
      { name: 'Today\'s Schedule', path: '/staff/schedule', icon: CalendarCheck2 },
      { name: 'Customer Check-In', path: '/staff/check-in', icon: CheckSquare },
      { name: 'Service History', path: '/staff/history', icon: History },
    ],
    admin: [
      { name: 'Platform Overview', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'User Management', path: '/admin/users', icon: Users },
      { name: 'Business Verifications', path: '/admin/businesses', icon: Building2 },
      { name: 'Appointments Audit', path: '/admin/appointments', icon: CalendarCheck2 },
      { name: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
      { name: 'Activity Logs', path: '/admin/logs', icon: ShieldAlert },
    ],
  };

  const navItems = menuConfig[role] || menuConfig.customer;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E3EAE5] flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo & Brand */}
        <div>
          <div className="h-16 px-6 border-b border-[#E3EAE5] flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#16834A] text-white flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#17231C]">
                Queue<span className="text-[#16834A]">Less</span>
              </span>
            </Link>

            {closeSidebar && (
              <button
                onClick={closeSidebar}
                className="lg:hidden p-1.5 rounded-lg text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => closeSidebar && closeSidebar()}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#EAF6EE] text-[#11643A] font-semibold shadow-soft-sm'
                      : 'text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#16834A]' : 'text-[#66736B]'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Switcher / Home Link */}
        <div className="p-4 border-t border-[#E3EAE5] space-y-2">
          <Link
            to="/"
            className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] transition-colors"
          >
            <span>&larr; View Public Site</span>
          </Link>
          <div className="px-3.5 py-2 rounded-xl bg-[#F3FAF5] text-[11px] text-[#66736B]">
            Logged in as <strong className="text-[#17231C] capitalize">{role}</strong>
          </div>
        </div>
      </aside>
    </>
  );
}

