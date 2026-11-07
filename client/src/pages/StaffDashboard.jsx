import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Ticket,
  CheckCircle2,
  PhoneCall,
  PlusCircle,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import Button from '../components/ui/Button';
import LiveQueueTerminal from '../components/admin/LiveQueueTerminal';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Staff Queue Terminal" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Counter 1 • Front Desk
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Role: {user?.role || 'staff'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Staff Operator Terminal
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Operating Receptionist / Staff: <span className="font-semibold text-[#17231C]">{user?.name || 'Staff Member'}</span>. Manage real-time customer flow and calls.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/customer/explore">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusCircle className="w-4 h-4 text-[#16834A]" />}
                >
                  Book for Walk-In Customer
                </Button>
              </Link>
            </div>
          </div>

          {/* Live Real-Time Queue & Token Management Terminal */}
          <LiveQueueTerminal />
        </main>
      </div>
    </div>
  );
}
