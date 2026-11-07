import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Ban,
  Shield,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  ChevronDown,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

const ROLE_STYLES = {
  admin: {
    label: 'Admin',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  provider: {
    label: 'Provider',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  staff: {
    label: 'Staff',
    bg: 'bg-[#EAF6EE]',
    text: 'text-[#11643A]',
    border: 'border-[#16834A]/20',
    dot: 'bg-[#16834A]',
  },
  customer: {
    label: 'Customer',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  user: {
    label: 'Customer',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
};

function formatRegistrationDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data States
  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalProviders: 0,
    totalStaff: 0,
    activeUsers: 0,
    blockedUsers: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // UI Feedback States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Status Confirmation Modal State
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Role Confirmation Modal State
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newSelectedRole, setNewSelectedRole] = useState('customer');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Fetch paginated users from backend
  const fetchUsers = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setActionError('');

      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '10');
        if (search.trim()) params.append('search', search.trim());
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', sortOrder);

        const res = await api.get(`/admin/users?${params.toString()}`);
        if (res.data?.success) {
          setUsers(res.data.users || []);
          if (res.data.kpis) setKpis(res.data.kpis);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch user directory:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load user management directory';
        setActionError(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, roleFilter, statusFilter, sortOrder]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Search Input with reset to Page 1
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (role) => {
    setRoleFilter(role);
    setPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  // Open User Details Modal
  const handleOpenDetails = async (u) => {
    setSelectedUser(u);
    setViewDetailsModalOpen(true);
    setLoadingDetails(true);

    try {
      const res = await api.get(`/admin/users/${u._id}`);
      if (res.data?.success && res.data?.user) {
        setSelectedUser(res.data.user);
      }
    } catch (err) {
      console.warn('Could not fetch enriched user details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Block / Unblock Modal
  const handleOpenStatusModal = (u) => {
    setStatusModalUser(u);
    setStatusModalOpen(true);
  };

  // Confirm Status Toggle
  const handleConfirmStatus = async () => {
    if (!statusModalUser) return;
    setIsUpdatingStatus(true);
    setActionError('');
    setActionSuccess('');

    try {
      const nextActive = !statusModalUser.isActive;
      const res = await api.patch(`/admin/users/${statusModalUser._id}/status`, {
        isActive: nextActive,
      });

      if (res.data?.success) {
        setActionSuccess(res.data.message || `User account updated successfully`);
        setStatusModalOpen(false);
        setStatusModalUser(null);
        fetchUsers();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update user account status';
      setActionError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Role Change Modal
  const handleOpenRoleModal = (u) => {
    setRoleModalUser(u);
    setNewSelectedRole(u.role === 'user' ? 'customer' : u.role);
    setRoleModalOpen(true);
  };

  // Confirm Role Change
  const handleConfirmRole = async () => {
    if (!roleModalUser) return;
    setIsUpdatingRole(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/users/${roleModalUser._id}/role`, {
        role: newSelectedRole,
      });

      if (res.data?.success) {
        setActionSuccess(res.data.message || `User role updated successfully`);
        setRoleModalOpen(false);
        setRoleModalUser(null);
        fetchUsers();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update user role';
      setActionError(msg);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="User Directory & Permissions" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  System Administration
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Role: Platform Administrator
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                User Directory & Access Control
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Manage all customer, healthcare provider, and staff accounts across the QueueLess platform.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(true)}
                isLoading={isRefreshing}
                leftIcon={<RefreshCw className="w-4 h-4 text-[#16834A]" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Action Feedback Notifications */}
          {actionSuccess && (
            <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/30 text-xs font-bold text-[#11643A] flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16834A]" />
                <span>{actionSuccess}</span>
              </div>
              <button
                onClick={() => setActionSuccess('')}
                className="text-[#16834A] hover:text-[#11643A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
              <button
                onClick={() => setActionError('')}
                className="text-rose-600 hover:text-rose-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Summary Cards Grid (6 Live MongoDB KPIs) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Users */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Total Users</span>
              </span>
              <p className="text-2xl font-extrabold text-[#17231C]">{kpis.totalUsers}</p>
            </div>

            {/* Customers */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Customers</span>
              </span>
              <p className="text-2xl font-extrabold text-sky-700">{kpis.totalCustomers}</p>
            </div>

            {/* Providers */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Providers</span>
              </span>
              <p className="text-2xl font-extrabold text-purple-700">{kpis.totalProviders}</p>
            </div>

            {/* Staff */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Staff Members</span>
              </span>
              <p className="text-2xl font-extrabold text-emerald-700">{kpis.totalStaff}</p>
            </div>

            {/* Active Users */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Active</span>
              </span>
              <p className="text-2xl font-extrabold text-[#11643A]">{kpis.activeUsers}</p>
            </div>

            {/* Blocked Users */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Blocked</span>
              </span>
              <p className="text-2xl font-extrabold text-rose-600">{kpis.blockedUsers}</p>
            </div>
          </div>

          {/* Search, Filter & Controls Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or phone..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E3EAE5] text-xs font-medium placeholder-[#66736B] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                />
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#66736B]">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E3EAE5] text-xs font-bold text-[#17231C] bg-[#F3FAF5] focus:outline-none"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Role & Status Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3EAE5]">
              {/* Role Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#66736B] mr-1 flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Role:</span>
                </span>
                {[
                  { id: 'all', label: 'All Roles' },
                  { id: 'customer', label: 'Customers' },
                  { id: 'provider', label: 'Providers' },
                  { id: 'staff', label: 'Staff' },
                  { id: 'admin', label: 'Admins' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleRoleFilterChange(item.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roleFilter === item.id
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Status Filters */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-[#66736B] mr-1">Status:</span>
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'active', label: 'Active' },
                  { id: 'blocked', label: 'Blocked' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleStatusFilterChange(item.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === item.id
                        ? 'bg-[#17231C] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Directory Management Table */}
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E3EAE5] flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base text-[#17231C]">
                  Registered Users Directory
                </h3>
                <p className="text-xs text-[#66736B]">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalUsers} matching accounts)
                </p>
              </div>

              <span className="text-xs font-bold text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                {users.length} on current page
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#16834A] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#17231C]">Loading user directory from MongoDB...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-base text-[#17231C]">No Users Found</h4>
                <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                  No accounts matched your search keyword or selected filters. Try clearing the search query or changing filter settings.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                    setPage(1);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3FAF5] border-b border-[#E3EAE5] text-[#66736B] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 pl-6">User Details</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4 text-center">Platform Role</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Registered</th>
                      <th className="py-3.5 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5]">
                    {users.map((u) => {
                      const roleConfig = ROLE_STYLES[u.role] || ROLE_STYLES.customer;
                      const isSelf = u._id === currentAdmin?._id;

                      return (
                        <tr key={u._id} className="hover:bg-[#F3FAF5]/60 transition">
                          {/* Name & Avatar */}
                          <td className="py-4 pl-6 font-semibold text-[#17231C]">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-[#EAF6EE] text-[#16834A] font-extrabold flex items-center justify-center text-xs shrink-0 border border-[#16834A]/20">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-[#17231C] truncate flex items-center space-x-1.5">
                                  <span>{u.name || 'Anonymous User'}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                {u.business ? (
                                  <span className="text-[11px] text-[#16834A] font-medium block truncate">
                                    {u.business.name} ({u.business.relation})
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#66736B] block">
                                    ID: <span className="font-mono">{u._id.slice(-6)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="py-4 px-4 text-[#66736B]">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1 text-[#17231C] font-medium truncate max-w-[200px]">
                                <Mail className="w-3.5 h-3.5 text-[#16834A] shrink-0" />
                                <span>{u.email}</span>
                              </div>
                              {u.phone ? (
                                <div className="flex items-center space-x-1 text-[11px] text-[#66736B]">
                                  <Phone className="w-3 h-3 text-[#66736B] shrink-0" />
                                  <span>{u.phone}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">No phone provided</span>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dot}`} />
                              <span>{roleConfig.label}</span>
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4 text-center">
                            {u.isActive ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16834A]" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                <span>Blocked</span>
                              </span>
                            )}
                          </td>

                          {/* Registered Date */}
                          <td className="py-4 px-4 text-center font-mono text-xs text-[#66736B]">
                            {formatRegistrationDate(u.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 pr-6 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => handleOpenDetails(u)}
                                className="p-1.5 rounded-lg border border-[#E3EAE5] bg-white text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] transition"
                                title="View User Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Change Role Button */}
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                disabled={isSelf}
                                className={`p-1.5 rounded-lg border transition ${
                                  isSelf
                                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : 'border-[#E3EAE5] bg-white text-purple-700 hover:bg-purple-50'
                                }`}
                                title={isSelf ? 'Cannot change own administrative role' : 'Change Role'}
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>

                              {/* Block / Unblock Button */}
                              {u.isActive ? (
                                <button
                                  onClick={() => handleOpenStatusModal(u)}
                                  disabled={isSelf}
                                  className={`p-1.5 rounded-lg border transition ${
                                    isSelf
                                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                      : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={isSelf ? 'Cannot block own administrator account' : 'Block User'}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenStatusModal(u)}
                                  className="p-1.5 rounded-lg border border-[#16834A]/30 bg-white text-[#16834A] hover:bg-[#EAF6EE] transition"
                                  title="Unblock User"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 sm:p-5 border-t border-[#E3EAE5] bg-[#F3FAF5]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#66736B]">
              <div>
                Showing <strong className="text-[#17231C]">{users.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</strong> to{' '}
                <strong className="text-[#17231C]">
                  {Math.min(pagination.page * pagination.limit, pagination.totalUsers)}
                </strong>{' '}
                of <strong className="text-[#17231C]">{pagination.totalUsers}</strong> users
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className={`p-2 rounded-xl border flex items-center space-x-1 font-bold transition ${
                    pagination.hasPrevPage
                      ? 'border-[#E3EAE5] bg-white text-[#17231C] hover:bg-[#EAF6EE]'
                      : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E3EAE5] font-bold text-[#17231C]">
                  {pagination.page} / {pagination.totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                  className={`p-2 rounded-xl border flex items-center space-x-1 font-bold transition ${
                    pagination.hasNextPage
                      ? 'border-[#E3EAE5] bg-white text-[#17231C] hover:bg-[#EAF6EE]'
                      : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================= USER DETAILS MODAL ================= */}
      {viewDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#E3EAE5] shadow-2xl space-y-5 animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E3EAE5]">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF6EE] text-[#16834A] font-extrabold flex items-center justify-center text-lg border border-[#16834A]/20">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#17231C]">
                    {selectedUser.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ROLE_STYLES[selectedUser.role]?.bg || 'bg-slate-100'
                      } ${ROLE_STYLES[selectedUser.role]?.text || 'text-slate-700'}`}
                    >
                      {ROLE_STYLES[selectedUser.role]?.label || selectedUser.role}
                    </span>
                    {selectedUser.isActive ? (
                      <span className="text-[10px] font-bold text-[#11643A] bg-[#EAF6EE] px-2 py-0.5 rounded-full">
                        Active Account
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                        Blocked Account
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewDetailsModalOpen(false)}
                className="p-1.5 rounded-xl border border-[#E3EAE5] text-[#66736B] hover:text-[#17231C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#16834A] animate-spin mx-auto" />
                <p className="text-xs text-[#66736B]">Loading full user history...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Contact and Account Info */}
                <div className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-[#E3EAE5]">
                    <span className="text-[#66736B]">Email Address:</span>
                    <span className="font-mono font-bold text-[#17231C]">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3EAE5]">
                    <span className="text-[#66736B]">Phone Number:</span>
                    <span className="font-semibold text-[#17231C]">
                      {selectedUser.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3EAE5]">
                    <span className="text-[#66736B]">Member Since:</span>
                    <span className="font-mono text-[#17231C]">
                      {formatRegistrationDate(selectedUser.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#66736B]">Internal User ID:</span>
                    <span className="font-mono text-[#66736B]">{selectedUser._id}</span>
                  </div>
                </div>

                {/* Business Affiliation (if applicable) */}
                {selectedUser.business && (
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-purple-700" />
                      <span>Associated Business Profile</span>
                    </span>
                    <div className="flex justify-between pt-1 text-[#17231C]">
                      <span className="font-bold text-sm">{selectedUser.business.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {selectedUser.business.category || selectedUser.business.relation}
                      </span>
                    </div>
                  </div>
                )}

                {/* Appointment Activity Stats */}
                {selectedUser.appointmentStats && (
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 rounded-xl bg-white border border-[#E3EAE5]">
                      <span className="text-[10px] text-[#66736B] block">Total Bookings</span>
                      <span className="font-mono text-base font-extrabold text-[#17231C]">
                        {selectedUser.appointmentStats.total}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E3EAE5]">
                      <span className="text-[10px] text-[#66736B] block">Completed</span>
                      <span className="font-mono text-base font-extrabold text-[#16834A]">
                        {selectedUser.appointmentStats.completed}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E3EAE5]">
                      <span className="text-[10px] text-[#66736B] block">Cancelled</span>
                      <span className="font-mono text-base font-extrabold text-rose-600">
                        {selectedUser.appointmentStats.cancelled}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BLOCK / UNBLOCK CONFIRMATION MODAL ================= */}
      {statusModalOpen && statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E3EAE5] shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-rose-50 text-rose-600 border border-rose-200">
              {statusModalUser.isActive ? <Ban className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6 text-[#16834A]" />}
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-lg text-[#17231C]">
                {statusModalUser.isActive ? 'Block User Account?' : 'Unblock User Account?'}
              </h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                {statusModalUser.isActive
                  ? `Are you sure you want to block "${statusModalUser.name}" (${statusModalUser.email})? They will be immediately prevented from logging into QueueLess.`
                  : `Are you sure you want to reactivate access for "${statusModalUser.name}" (${statusModalUser.email})?`}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2"
                onClick={() => setStatusModalOpen(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>

              <Button
                variant={statusModalUser.isActive ? 'danger' : 'primary'}
                size="sm"
                className="w-1/2"
                onClick={handleConfirmStatus}
                isLoading={isUpdatingStatus}
              >
                {statusModalUser.isActive ? 'Yes, Block User' : 'Yes, Unblock'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ROLE CHANGE MODAL ================= */}
      {roleModalOpen && roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E3EAE5] shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-purple-50 text-purple-700 border border-purple-200">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-lg text-[#17231C]">
                Change User Role
              </h3>
              <p className="text-xs text-[#66736B]">
                Updating platform role for <strong className="text-[#17231C]">{roleModalUser.name}</strong>.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#17231C]">Select New Role:</label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E3EAE5] text-xs font-bold bg-[#F3FAF5] text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
              >
                <option value="customer">Customer (Standard User)</option>
                <option value="provider">Provider (Business Owner)</option>
                <option value="staff">Staff (Reception / Operator)</option>
                <option value="admin">Admin (Platform Administrator)</option>
              </select>

              {newSelectedRole === 'admin' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <span>
                    Granting Admin permissions provides full platform control, user directory access, and audit privileges.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2"
                onClick={() => setRoleModalOpen(false)}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="w-1/2"
                onClick={handleConfirmRole}
                isLoading={isUpdatingRole}
              >
                Save New Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

