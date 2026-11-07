import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';

export default function AdminSubPage({ title, subtitle, sectionName, children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title={title} toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                {sectionName}
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">{title}</h2>
              <p className="text-xs sm:text-sm text-[#66736B]">{subtitle}</p>
            </div>
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm">
                &larr; Admin Overview
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

