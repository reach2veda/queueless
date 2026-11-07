import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Ban,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Info,
  DollarSign,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

const CATEGORY_MAP = {
  clinic: { label: 'Clinic', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  salon: { label: 'Salon & Spa', bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200' },
  bank: { label: 'Bank / Finance', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  service_center: { label: 'Service Center', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  administrative: { label: 'Administrative', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  other: { label: 'Other', bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' },
};

const VERIFICATION_STYLES = {
  verified: {
    label: 'Verified',
    bg: 'bg-[#EAF6EE]',
    text: 'text-[#16834A]',
    border: 'border-[#16834A]/25',
    dot: 'bg-[#16834A]',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAddress(address) {
  if (!address) return '—';
  const parts = [address.street, address.city, address.state, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

export default function AdminBusinessesPage() {
  const { user: currentAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Directory Data States
  const [businesses, setBusinesses] = useState([]);
  const [kpis, setKpis] = useState({
    totalBusinesses: 0,
    approvedBusinesses: 0,
    pendingVerification: 0,
    rejectedBusinesses: 0,
    activeBusinesses: 0,
    suspendedBusinesses: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalBusinesses: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // UI Feedback States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Business Details Modal State
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview'); // 'overview' | 'services' | 'staff' | 'appointments'

  // Action Modals States
  const [approveModalBusiness, setApproveModalBusiness] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [rejectModalBusiness, setRejectModalBusiness] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const [statusModalBusiness, setStatusModalBusiness] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Fetch Businesses from Backend
  const fetchBusinesses = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setActionError('');

      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '10');
        if (search.trim()) params.append('search', search.trim());
        if (verificationFilter !== 'all') params.append('verificationStatus', verificationFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', sortOrder);

        const res = await api.get(`/admin/businesses?${params.toString()}`);
        if (res.data?.success) {
          setBusinesses(res.data.businesses || []);
          if (res.data.kpis) setKpis(res.data.kpis);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch businesses:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load business management directory';
        setActionError(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, verificationFilter, statusFilter, categoryFilter, sortOrder]
  );

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Handle Search Input
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleVerificationFilterChange = (val) => {
    setVerificationFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleCategoryFilterChange = (val) => {
    setCategoryFilter(val);
    setPage(1);
  };

  // Open Details Modal
  const handleOpenDetails = async (biz) => {
    setSelectedBusiness(biz);
    setDetailsTab('overview');
    setViewDetailsModalOpen(true);
    setLoadingDetails(true);

    try {
      const res = await api.get(`/admin/businesses/${biz._id}`);
      if (res.data?.success && res.data?.business) {
        setSelectedBusiness(res.data.business);
      }
    } catch (err) {
      console.warn('Could not fetch enriched business details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Approve Modal
  const handleOpenApproveModal = (biz) => {
    setApproveModalBusiness(biz);
    setApproveModalOpen(true);
  };

  // Confirm Approve
  const handleConfirmApprove = async () => {
    if (!approveModalBusiness) return;
    setIsSubmittingApprove(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/businesses/${approveModalBusiness._id}/approve`);
      if (res.data?.success) {
        setActionSuccess(res.data.message || `Business verified and approved successfully`);
        setApproveModalOpen(false);
        setApproveModalBusiness(null);
        if (selectedBusiness && selectedBusiness._id === approveModalBusiness._id) {
          setSelectedBusiness(res.data.business);
        }
        fetchBusinesses();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to approve business';
      setActionError(msg);
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (biz) => {
    setRejectModalBusiness(biz);
    setRejectionReason(biz.rejectionReason || '');
    setRejectModalOpen(true);
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectModalBusiness) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setActionError('Please specify a rejection reason with at least 3 characters.');
      return;
    }

    setIsSubmittingReject(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/businesses/${rejectModalBusiness._id}/reject`, {
        reason: rejectionReason.trim(),
      });
      if (res.data?.success) {
        setActionSuccess(res.data.message || `Business application rejected`);
        setRejectModalOpen(false);
        setRejectModalBusiness(null);
        setRejectionReason('');
        if (selectedBusiness && selectedBusiness._id === rejectModalBusiness._id) {
          setSelectedBusiness(res.data.business);
        }
        fetchBusinesses();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to reject business';
      setActionError(msg);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Open Suspend / Reactivate Modal
  const handleOpenStatusModal = (biz) => {
    setStatusModalBusiness(biz);
    setSuspensionReason(biz.suspensionReason || '');
    setStatusModalOpen(true);
  };

  // Confirm Status Toggle (Suspend / Reactivate)
  const handleConfirmStatus = async () => {
    if (!statusModalBusiness) return;
    const nextActive = !statusModalBusiness.isActive;

    setIsSubmittingStatus(true);
    setActionError('');
    setActionSuccess('');

    try {
      const payload = {
        isActive: nextActive,
      };
      if (!nextActive && suspensionReason.trim()) {
        payload.reason = suspensionReason.trim();
      }

      const res = await api.patch(`/admin/businesses/${statusModalBusiness._id}/status`, payload);
      if (res.data?.success) {
        setActionSuccess(res.data.message || `Business account status updated`);
        setStatusModalOpen(false);
        setStatusModalBusiness(null);
        setSuspensionReason('');
        if (selectedBusiness && selectedBusiness._id === statusModalBusiness._id) {
          setSelectedBusiness(res.data.business);
        }
        fetchBusinesses();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update business status';
      setActionError(msg);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Auto-dismiss success notification
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar
          title="Business Verifications & Management"
          toggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Admin Platform Control
                </span>
                <span className="text-xs font-medium text-[#66736B]">
                  • Live MongoDB Directory
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                Business Management & Verification
              </h1>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Review provider registrations, verify operational credentials, approve healthcare clinics, or suspend non-compliant businesses.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBusinesses(true)}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 text-[#16834A] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Action Alerts */}
          {actionSuccess && (
            <div className="bg-[#EAF6EE] border border-[#16834A]/30 text-[#11643A] px-5 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0" />
                <p className="text-sm font-semibold">{actionSuccess}</p>
              </div>
              <button
                onClick={() => setActionSuccess('')}
                className="text-[#16834A] hover:text-[#11643A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="text-sm font-semibold">{actionError}</p>
              </div>
              <button
                onClick={() => setActionError('')}
                className="text-rose-600 hover:text-rose-800 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 1. Total Businesses */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-[#16834A]/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#66736B]">Total Registered</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.totalBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Platform businesses</p>
              </div>
            </div>

            {/* 2. Approved / Verified */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-[#16834A]/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#16834A]">Approved</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF6EE] flex items-center justify-center text-[#16834A]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#16834A]">
                  {loading ? '—' : kpis.approvedBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Verified credentials</p>
              </div>
            </div>

            {/* 3. Pending Verification */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-amber-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-700">Pending</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                  {loading ? '—' : kpis.pendingVerification}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Awaiting review</p>
              </div>
            </div>

            {/* 4. Rejected Businesses */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-rose-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-700">Rejected</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                  {loading ? '—' : kpis.rejectedBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Verification rejected</p>
              </div>
            </div>

            {/* 5. Active Businesses */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-emerald-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-700">Active</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.activeBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Operational</p>
              </div>
            </div>

            {/* 6. Suspended Businesses */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card flex flex-col justify-between hover:border-slate-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-700">Suspended</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <Ban className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                  {loading ? '—' : kpis.suspendedBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Suspended accounts</p>
              </div>
            </div>
          </div>

          {/* Search, Filters, and Actions Bar */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search business name, owner email, phone..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16834A]/20 focus:border-[#16834A] transition"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66736B] hover:text-[#17231C]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                  Sort:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs font-semibold text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20 focus:border-[#16834A]"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Filter Pills Grid */}
            <div className="pt-3 border-t border-[#E3EAE5] flex flex-wrap items-center gap-y-3 gap-x-6 text-xs">
              {/* Verification Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Verification:
                </span>
                {['all', 'pending', 'verified', 'rejected'].map((v) => (
                  <button
                    key={v}
                    onClick={() => handleVerificationFilterChange(v)}
                    className={`px-3 py-1 rounded-full font-semibold transition ${
                      verificationFilter === v
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-[#16834A]'
                    }`}
                  >
                    {v === 'all'
                      ? 'All'
                      : v === 'verified'
                      ? 'Verified'
                      : v === 'pending'
                      ? 'Pending'
                      : 'Rejected'}
                  </button>
                ))}
              </div>

              {/* Account Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Account:
                </span>
                {['all', 'active', 'suspended'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusFilterChange(s)}
                    className={`px-3 py-1 rounded-full font-semibold transition ${
                      statusFilter === s
                        ? 'bg-[#17231C] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-[#17231C]'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Suspended'}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Category:
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryFilterChange(e.target.value)}
                  className="px-2.5 py-1 bg-[#F3FAF5] border border-[#E3EAE5] rounded-lg text-xs font-medium text-[#17231C] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="clinic">Clinic / Medical</option>
                  <option value="salon">Salon & Spa</option>
                  <option value="bank">Bank / Finance</option>
                  <option value="service_center">Service Center</option>
                  <option value="administrative">Administrative</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Directory Table */}
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
            <div className="p-6 border-b border-[#E3EAE5] flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#17231C]">Business Directory</h2>
                <p className="text-xs text-[#66736B]">
                  Showing {businesses.length} of {pagination.totalBusinesses} registered businesses
                </p>
              </div>

              {/* Pagination Info */}
              <div className="text-xs text-[#66736B] flex items-center gap-2">
                <span>
                  Page <strong className="text-[#17231C]">{pagination.page}</strong> of{' '}
                  <strong className="text-[#17231C]">{pagination.totalPages}</strong>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#66736B]">
                <Loader2 className="w-8 h-8 text-[#16834A] animate-spin" />
                <span className="text-sm font-semibold">Loading business directory from MongoDB...</span>
              </div>
            ) : businesses.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#17231C]">No businesses found</h3>
                <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                  No businesses matched your search query or filter criteria. Try resetting filters or adjusting search terms.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setVerificationFilter('all');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setPage(1);
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F3FAF5] border-b border-[#E3EAE5] text-[11px] font-bold uppercase tracking-wider text-[#66736B]">
                      <th className="py-3.5 px-6">Business Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Owner / Contact</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Services</th>
                      <th className="py-3.5 px-4 text-center">Appointments</th>
                      <th className="py-3.5 px-4">Registered</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5] text-sm">
                    {businesses.map((biz) => {
                      const catStyle = CATEGORY_MAP[biz.category] || CATEGORY_MAP.other;
                      const verStyle =
                        VERIFICATION_STYLES[biz.verificationStatus] || VERIFICATION_STYLES.pending;
                      const isOwnerCurrentAdmin =
                        biz.owner?._id &&
                        currentAdmin?._id &&
                        biz.owner._id.toString() === currentAdmin._id.toString();

                      return (
                        <tr
                          key={biz._id}
                          className="hover:bg-[#F3FAF5]/60 transition-colors group"
                        >
                          {/* Business Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center font-bold text-sm shrink-0 border border-[#16834A]/20">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-[#17231C] block truncate hover:text-[#16834A] cursor-pointer" onClick={() => handleOpenDetails(biz)}>
                                  {biz.name}
                                </span>
                                <span className="text-[11px] text-[#66736B] block truncate">
                                  ID: {biz._id.slice(-6)} • {biz.address?.city || 'No city'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              {catStyle.label}
                            </span>
                          </td>

                          {/* Owner / Contact */}
                          <td className="py-4 px-4">
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-[#17231C] truncate">
                                {biz.owner?.name || 'Unassigned Owner'}
                              </div>
                              <div className="text-[11px] text-[#66736B] truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" />
                                {biz.contactEmail || biz.owner?.email || '—'}
                              </div>
                              {(biz.contactPhone || biz.owner?.phone) && (
                                <div className="text-[11px] text-[#66736B] truncate flex items-center gap-1">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  {biz.contactPhone || biz.owner?.phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Verification Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${verStyle.bg} ${verStyle.text} ${verStyle.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${verStyle.dot}`} />
                                {verStyle.label}
                              </span>
                              {biz.verificationStatus === 'rejected' && biz.rejectionReason && (
                                <p
                                  className="text-[10px] text-rose-600 truncate max-w-[140px]"
                                  title={`Rejection Reason: ${biz.rejectionReason}`}
                                >
                                  Reason: {biz.rejectionReason}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Account Status (Active/Suspended) */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {biz.isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF6EE] text-[#16834A] border border-[#16834A]/25">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#16834A] animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Suspended
                                </span>
                              )}
                              {!biz.isActive && biz.suspensionReason && (
                                <p
                                  className="text-[10px] text-rose-600 truncate max-w-[140px]"
                                  title={`Suspension Reason: ${biz.suspensionReason}`}
                                >
                                  {biz.suspensionReason}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Total Services */}
                          <td className="py-4 px-4 text-center font-semibold text-xs text-[#17231C]">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                              {biz.totalServices || 0}
                            </span>
                          </td>

                          {/* Total Appointments */}
                          <td className="py-4 px-4 text-center font-semibold text-xs text-[#17231C]">
                            <span className="bg-[#EAF6EE] text-[#16834A] px-2.5 py-1 rounded-lg font-bold">
                              {biz.totalAppointments || 0}
                            </span>
                          </td>

                          {/* Registration Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-[#66736B]">
                            {formatDate(biz.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => handleOpenDetails(biz)}
                                title="View Business Profile"
                                className="p-1.5 rounded-lg text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Approve (if not verified) */}
                              {biz.verificationStatus !== 'verified' && (
                                <button
                                  onClick={() => handleOpenApproveModal(biz)}
                                  disabled={isOwnerCurrentAdmin}
                                  title={
                                    isOwnerCurrentAdmin
                                      ? 'Cannot approve own business'
                                      : 'Approve & Verify Business'
                                  }
                                  className={`p-1.5 rounded-lg transition ${
                                    isOwnerCurrentAdmin
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-[#16834A] hover:bg-[#EAF6EE]'
                                  }`}
                                >
                                  <Check className="w-4 h-4 font-bold" />
                                </button>
                              )}

                              {/* Reject (if not rejected) */}
                              {biz.verificationStatus !== 'rejected' && (
                                <button
                                  onClick={() => handleOpenRejectModal(biz)}
                                  title="Reject Business Application"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                >
                                  <X className="w-4 h-4 font-bold" />
                                </button>
                              )}

                              {/* Suspend / Reactivate Status Toggle */}
                              {biz.isActive ? (
                                <button
                                  onClick={() => handleOpenStatusModal(biz)}
                                  title="Suspend Business"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenStatusModal(biz)}
                                  title="Reactivate Business"
                                  className="p-1.5 rounded-lg text-[#16834A] hover:bg-[#EAF6EE] transition"
                                >
                                  <ShieldCheck className="w-4 h-4" />
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
            {!loading && businesses.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-[#E3EAE5] bg-[#F3FAF5] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[#66736B]">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalBusinesses)} of{' '}
                  {pagination.totalBusinesses} businesses
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-[#17231C] px-3">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 1. BUSINESS DETAILS MODAL                                                 */}
      {/* ========================================================================= */}
      {viewDetailsModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E3EAE5] shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E3EAE5] pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center border border-[#16834A]/20 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-extrabold text-[#17231C]">
                      {selectedBusiness.name}
                    </h2>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        CATEGORY_MAP[selectedBusiness.category]?.bg || 'bg-slate-50'
                      } ${
                        CATEGORY_MAP[selectedBusiness.category]?.text || 'text-slate-800'
                      }`}
                    >
                      {CATEGORY_MAP[selectedBusiness.category]?.label || selectedBusiness.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#66736B] mt-0.5">
                    MongoDB ID: <code className="bg-slate-100 px-1 py-0.5 rounded">{selectedBusiness._id}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailsModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Alert Banners if Suspended or Rejected */}
            {!selectedBusiness.isActive && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3">
                <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Business Account Suspended
                  </h4>
                  <p className="text-xs mt-0.5 text-rose-800">
                    {selectedBusiness.suspensionReason || 'This business has been suspended by an administrator.'}
                  </p>
                </div>
              </div>
            )}

            {selectedBusiness.verificationStatus === 'rejected' && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Verification Rejected
                  </h4>
                  <p className="text-xs mt-0.5 text-rose-800">
                    {selectedBusiness.rejectionReason || 'Verification request was rejected.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-[#E3EAE5] pb-2 text-xs font-bold">
              {[
                { id: 'overview', label: 'Overview & Owner', icon: Info },
                { id: 'services', label: `Services (${selectedBusiness.services?.length || selectedBusiness.totalServices || 0})`, icon: Layers },
                { id: 'staff', label: `Staff (${selectedBusiness.staff?.length || 0})`, icon: Users },
                { id: 'appointments', label: 'Appointments Activity', icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                      detailsTab === tab.id
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'text-[#66736B] hover:bg-[#F3FAF5] hover:text-[#17231C]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {loadingDetails ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#66736B]">
                <Loader2 className="w-6 h-6 text-[#16834A] animate-spin" />
                <span className="text-xs">Loading complete profile...</span>
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW & OWNER */}
                {detailsTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F3FAF5] p-5 rounded-2xl border border-[#E3EAE5] text-xs">
                      <div>
                        <span className="text-[#66736B] block">Verification Status:</span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border ${
                              VERIFICATION_STYLES[selectedBusiness.verificationStatus]?.bg || 'bg-slate-100'
                            } ${
                              VERIFICATION_STYLES[selectedBusiness.verificationStatus]?.text || 'text-slate-800'
                            }`}
                          >
                            {VERIFICATION_STYLES[selectedBusiness.verificationStatus]?.label ||
                              selectedBusiness.verificationStatus}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[#66736B] block">Account Status:</span>
                        <div className="mt-1 flex items-center gap-1.5">
                          {selectedBusiness.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-[#EAF6EE] text-[#16834A] border border-[#16834A]/25">
                              Operational / Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Suspended
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[#66736B] block">Booking System:</span>
                        <span className="font-semibold text-[#17231C]">
                          {selectedBusiness.isBookingsOpen !== false ? '✅ Bookings Open' : '❌ Bookings Closed'}
                        </span>
                        {selectedBusiness.closureReason && (
                          <p className="text-[11px] text-[#66736B]">Reason: {selectedBusiness.closureReason}</p>
                        )}
                      </div>

                      <div>
                        <span className="text-[#66736B] block">Timezone:</span>
                        <span className="font-semibold text-[#17231C]">
                          {selectedBusiness.timezone || 'UTC'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#66736B] block">Registered On:</span>
                        <span className="font-semibold text-[#17231C]">
                          {formatDate(selectedBusiness.createdAt)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#66736B] block">Last Updated:</span>
                        <span className="font-semibold text-[#17231C]">
                          {formatDate(selectedBusiness.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Business Description & Address */}
                    <div className="space-y-4">
                      {selectedBusiness.description && (
                        <div>
                          <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider mb-1">
                            Description
                          </h4>
                          <p className="text-xs text-[#17231C] bg-white p-3.5 rounded-xl border border-[#E3EAE5] leading-relaxed">
                            {selectedBusiness.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-[#E3EAE5] space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#16834A]">
                            <MapPin className="w-4 h-4" />
                            Physical Address
                          </div>
                          <p className="text-xs text-[#17231C] font-medium">
                            {formatAddress(selectedBusiness.address)}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E3EAE5] space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#16834A]">
                            <Phone className="w-4 h-4" />
                            Direct Contact
                          </div>
                          <p className="text-xs text-[#17231C]">
                            Phone: <strong>{selectedBusiness.contactPhone || '—'}</strong>
                          </p>
                          <p className="text-xs text-[#17231C]">
                            Email: <strong>{selectedBusiness.contactEmail || '—'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Owner Profile Card */}
                    <div>
                      <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider mb-2">
                        Business Owner Information
                      </h4>
                      {selectedBusiness.owner ? (
                        <div className="bg-[#F3FAF5] p-4 rounded-2xl border border-[#E3EAE5] flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#16834A] text-white flex items-center justify-center font-bold text-sm">
                              {selectedBusiness.owner.name ? selectedBusiness.owner.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#17231C]">
                                {selectedBusiness.owner.name}
                              </div>
                              <div className="text-xs text-[#66736B] flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                {selectedBusiness.owner.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-[#66736B] block">Role: <strong className="text-[#17231C] capitalize">{selectedBusiness.owner.role || 'Provider'}</strong></span>
                            <span className="text-[#66736B] block">ID: <code className="text-[11px]">{selectedBusiness.owner._id}</code></span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-[#E3EAE5] text-xs text-[#66736B] text-center">
                          No owner profile linked to this business.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: SERVICES */}
                {detailsTab === 'services' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                        Registered Healthcare & Booking Services
                      </h4>
                      <span className="text-xs text-[#66736B]">
                        {selectedBusiness.services?.length || 0} services configured
                      </span>
                    </div>

                    {!selectedBusiness.services || selectedBusiness.services.length === 0 ? (
                      <div className="p-8 text-center bg-[#F3FAF5] rounded-2xl border border-[#E3EAE5] text-xs text-[#66736B]">
                        No services configured for this business.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E3EAE5] border border-[#E3EAE5] rounded-2xl overflow-hidden bg-white">
                        {selectedBusiness.services.map((srv) => (
                          <div key={srv._id} className="p-4 flex items-center justify-between gap-4 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-[#17231C] block text-sm">
                                {srv.name}
                              </span>
                              {srv.description && (
                                <p className="text-[#66736B] text-xs line-clamp-1">{srv.description}</p>
                              )}
                              <span className="text-[11px] text-[#66736B]">
                                Duration: <strong>{srv.durationMinutes} mins</strong> • Price: <strong>${(srv.price || 0).toFixed(2)}</strong>
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] shrink-0 ${
                                srv.isActive
                                  ? 'bg-[#EAF6EE] text-[#16834A]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {srv.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STAFF */}
                {detailsTab === 'staff' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                        Assigned Practitioners & Staff Members
                      </h4>
                      <span className="text-xs text-[#66736B]">
                        {selectedBusiness.staff?.length || 0} staff members
                      </span>
                    </div>

                    {!selectedBusiness.staff || selectedBusiness.staff.length === 0 ? (
                      <div className="p-8 text-center bg-[#F3FAF5] rounded-2xl border border-[#E3EAE5] text-xs text-[#66736B]">
                        No staff members assigned to this business yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E3EAE5] border border-[#E3EAE5] rounded-2xl overflow-hidden bg-white">
                        {selectedBusiness.staff.map((st) => (
                          <div key={st._id} className="p-4 flex items-center justify-between gap-4 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#17231C] text-sm">
                                  {st.userId?.name || st.name || 'Staff Member'}
                                </span>
                                <span className="bg-[#EAF6EE] text-[#16834A] px-2 py-0.5 rounded font-semibold text-[11px]">
                                  {st.title || 'Specialist'}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#66736B] block">
                                {st.userId?.email || st.email || '—'}
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] shrink-0 ${
                                st.isActive !== false
                                  ? 'bg-[#EAF6EE] text-[#16834A]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {st.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: APPOINTMENTS ACTIVITY */}
                {detailsTab === 'appointments' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                      Appointment Performance & History
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-[#F3FAF5] p-4 rounded-xl border border-[#E3EAE5] text-center">
                        <span className="text-xs font-semibold text-[#66736B] block">Total Bookings</span>
                        <span className="text-2xl font-extrabold text-[#17231C] mt-1 block">
                          {selectedBusiness.appointmentStats?.total ?? selectedBusiness.totalAppointments ?? 0}
                        </span>
                      </div>

                      <div className="bg-[#EAF6EE] p-4 rounded-xl border border-[#16834A]/20 text-center">
                        <span className="text-xs font-semibold text-[#16834A] block">Completed Visits</span>
                        <span className="text-2xl font-extrabold text-[#16834A] mt-1 block">
                          {selectedBusiness.appointmentStats?.completed ?? 0}
                        </span>
                      </div>

                      <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center">
                        <span className="text-xs font-semibold text-sky-700 block">In Queue / Active</span>
                        <span className="text-2xl font-extrabold text-sky-800 mt-1 block">
                          {(selectedBusiness.appointmentStats?.inQueue ?? 0) + (selectedBusiness.appointmentStats?.confirmed ?? 0)}
                        </span>
                      </div>

                      <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
                        <span className="text-xs font-semibold text-rose-700 block">Cancelled</span>
                        <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
                          {selectedBusiness.appointmentStats?.cancelled ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Modal Bottom Actions Bar */}
            <div className="border-t border-[#E3EAE5] pt-5 flex items-center justify-between flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDetailsModalOpen(false)}
              >
                Close Profile
              </Button>

              <div className="flex items-center gap-2">
                {selectedBusiness.verificationStatus !== 'verified' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setViewDetailsModalOpen(false);
                      handleOpenApproveModal(selectedBusiness);
                    }}
                    className="bg-[#16834A] hover:bg-[#11643A] text-white gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Verify
                  </Button>
                )}

                {selectedBusiness.verificationStatus !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewDetailsModalOpen(false);
                      handleOpenRejectModal(selectedBusiness);
                    }}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Reject Application
                  </Button>
                )}

                {selectedBusiness.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewDetailsModalOpen(false);
                      handleOpenStatusModal(selectedBusiness);
                    }}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend Business
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setViewDetailsModalOpen(false);
                      handleOpenStatusModal(selectedBusiness);
                    }}
                    className="bg-[#16834A] hover:bg-[#11643A] text-white gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Reactivate Account
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. APPROVE CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {approveModalOpen && approveModalBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E3EAE5] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#17231C]">
                Approve Business Verification?
              </h3>
              <p className="text-xs text-[#66736B]">
                Are you sure you want to approve and verify{' '}
                <strong className="text-[#17231C]">"{approveModalBusiness.name}"</strong>?
              </p>
            </div>

            {approveModalBusiness.owner?._id &&
              currentAdmin?._id &&
              approveModalBusiness.owner._id.toString() === currentAdmin._id.toString() && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">
                  ⚠️ Security safeguard: Business owners cannot approve their own businesses.
                </div>
              )}

            <div className="bg-[#F3FAF5] p-3.5 rounded-xl border border-[#E3EAE5] text-xs text-[#66736B] space-y-1">
              <p>• Verification status will be set to <strong>Verified</strong>.</p>
              <p>• Provider can freely accept appointments and publish services.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setApproveModalOpen(false);
                  setApproveModalBusiness(null);
                }}
                disabled={isSubmittingApprove}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmApprove}
                disabled={
                  isSubmittingApprove ||
                  (approveModalBusiness.owner?._id &&
                    currentAdmin?._id &&
                    approveModalBusiness.owner._id.toString() === currentAdmin._id.toString())
                }
                className="bg-[#16834A] hover:bg-[#11643A] text-white"
              >
                {isSubmittingApprove ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </span>
                ) : (
                  'Confirm & Verify'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REJECT CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {rejectModalOpen && rejectModalBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E3EAE5] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#17231C]">
                Reject Business Application
              </h3>
              <p className="text-xs text-[#66736B]">
                Reject verification application for{' '}
                <strong className="text-[#17231C]">"{rejectModalBusiness.name}"</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#17231C] block">
                Rejection Reason (Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete medical practitioner license or invalid contact details."
                rows={3}
                className="w-full p-3 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <span className="text-[11px] text-[#66736B] block">
                This reason will be recorded and visible on the business profile.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectModalBusiness(null);
                  setRejectionReason('');
                }}
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || rejectionReason.trim().length < 3}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmittingReject ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </span>
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUSPEND / REACTIVATE MODAL                                             */}
      {/* ========================================================================= */}
      {statusModalOpen && statusModalBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E3EAE5] shadow-2xl p-6 sm:p-7 space-y-5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                statusModalBusiness.isActive
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-[#EAF6EE] text-[#16834A]'
              }`}
            >
              {statusModalBusiness.isActive ? (
                <Ban className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#17231C]">
                {statusModalBusiness.isActive
                  ? 'Suspend Business Account?'
                  : 'Reactivate Business Account?'}
              </h3>
              <p className="text-xs text-[#66736B]">
                {statusModalBusiness.isActive ? (
                  <>
                    Suspending{' '}
                    <strong className="text-[#17231C]">"{statusModalBusiness.name}"</strong> will prevent new customer bookings and service discovery. Historical records remain fully preserved.
                  </>
                ) : (
                  <>
                    Reactivating{' '}
                    <strong className="text-[#17231C]">"{statusModalBusiness.name}"</strong> will restore access to bookings and discovery.
                  </>
                )}
              </p>
            </div>

            {statusModalBusiness.isActive && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17231C] block">
                  Suspension Reason (Optional)
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g., Pending regulatory compliance audit or temporary investigation."
                  rows={2}
                  className="w-full p-3 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusModalOpen(false);
                  setStatusModalBusiness(null);
                  setSuspensionReason('');
                }}
                disabled={isSubmittingStatus}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmStatus}
                disabled={isSubmittingStatus}
                className={
                  statusModalBusiness.isActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#16834A] hover:bg-[#11643A] text-white'
                }
              >
                {isSubmittingStatus ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </span>
                ) : statusModalBusiness.isActive ? (
                  'Suspend Business'
                ) : (
                  'Reactivate Business'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

