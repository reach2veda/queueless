import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Power,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Loader2,
  ShieldAlert,
  Building2
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export default function ServicesManagementSection({ onServicesChanged }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    price: 0,
    isActive: true,
  });

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all services belonging to the authenticated provider's business
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/services/my');
      if (res.data?.success) {
        setServices(res.data.services || []);
      }
    } catch (err) {
      // Fallback: try with provider's profile businessId if /my is loading
      try {
        const bizRes = await api.get('/businesses/my/profile');
        if (bizRes.data?.business?._id) {
          const srvRes = await api.get(`/services?businessId=${bizRes.data.business._id}&includeInactive=true`);
          if (srvRes.data?.success) {
            setServices(srvRes.data.services || []);
            return;
          }
        }
      } catch {
        // Fallback failed
      }
      const errMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load service catalog';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      price: 0,
      isActive: true,
    });
    setModalError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (srv) => {
    setEditingService(srv);
    setFormData({
      name: srv.name || '',
      description: srv.description || '',
      durationMinutes: srv.durationMinutes || 30,
      price: srv.price ?? 0,
      isActive: srv.isActive !== false,
    });
    setModalError('');
    setModalOpen(true);
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setModalError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setModalError('Service name must be at least 2 characters long.');
      return;
    }
    if (trimmedName.length > 100) {
      setModalError('Service name cannot exceed 100 characters.');
      return;
    }

    const duration = parseInt(formData.durationMinutes, 10);
    if (isNaN(duration) || duration < 5 || duration > 480) {
      setModalError('Duration must be between 5 and 480 minutes (8 hours).');
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setModalError('Price cannot be negative.');
      return;
    }

    setSaving(true);

    try {
      if (editingService) {
        // Update existing service
        const res = await api.patch(`/services/${editingService._id}`, {
          name: trimmedName,
          description: formData.description.trim(),
          durationMinutes: duration,
          price: priceNum,
          isActive: formData.isActive,
        });

        if (res.data?.success) {
          showSuccess(`Service "${trimmedName}" updated successfully!`);
          setModalOpen(false);
          fetchServices();
          if (onServicesChanged) onServicesChanged();
        }
      } else {
        // Create new service
        const res = await api.post('/services', {
          name: trimmedName,
          description: formData.description.trim(),
          durationMinutes: duration,
          price: priceNum,
          isActive: formData.isActive,
        });

        if (res.data?.success) {
          showSuccess(`Service "${trimmedName}" added to catalog!`);
          setModalOpen(false);
          fetchServices();
          if (onServicesChanged) onServicesChanged();
        }
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.data?.error?.message ||
        err.message ||
        'Failed to save service';
      setModalError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Service Active Status
  const handleToggleActive = async (srv) => {
    try {
      const newStatus = !srv.isActive;
      const res = await api.patch(`/services/${srv._id}`, {
        isActive: newStatus,
      });

      if (res.data?.success) {
        showSuccess(
          `Service "${srv.name}" is now ${newStatus ? 'Active & Bookable' : 'Inactive & Hidden from customers'}.`
        );
        fetchServices();
        if (onServicesChanged) onServicesChanged();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to toggle service status');
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (srv) => {
    setServiceToDelete(srv);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setDeleting(true);

    try {
      const res = await api.delete(`/services/${serviceToDelete._id}`);
      if (res.data?.success) {
        showSuccess(res.data.message || `Service "${serviceToDelete.name}" removed successfully.`);
        setDeleteModalOpen(false);
        setServiceToDelete(null);
        fetchServices();
        if (onServicesChanged) onServicesChanged();
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.data?.error?.message ||
        err.message ||
        'Failed to delete service';
      setError(errMsg);
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Search Logic
  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (srv.description && srv.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return srv.isActive !== false;
    if (statusFilter === 'inactive') return srv.isActive === false;
    return true;
  });

  const activeCount = services.filter((s) => s.isActive !== false).length;
  const inactiveCount = services.filter((s) => s.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Section Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-[#EAF6EE] text-[#16834A]">
              <Tag className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-xl text-[#17231C]">
              Services & Pricing Catalog
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#66736B] mt-1">
            Define consultation types, medical procedures, durations, and pricing shown to prospective customers.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Service
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs flex items-center justify-between font-semibold shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-[#16834A] hover:text-[#11643A] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between font-semibold shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] text-xs focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-[#16834A] text-white shadow-soft-sm'
                : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
            }`}
          >
            All ({services.length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'active'
                ? 'bg-[#16834A] text-white shadow-soft-sm'
                : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-soft-sm'
                : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Services List / Cards */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
          <p className="text-sm font-semibold text-[#17231C]">Loading service catalog...</p>
          <p className="text-xs text-[#66736B]">Synchronizing service procedures from MongoDB Atlas</p>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border border-[#16834A]/20 shadow-inner">
            <Tag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-[#17231C]">No Services in Catalog Yet</h4>
            <p className="text-xs text-[#66736B] max-w-sm mx-auto leading-relaxed">
              Add the medical consultations, diagnostic procedures, or salon treatments your business offers so customers can book appointments online.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add First Service
          </Button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-2">
          <p className="text-sm font-semibold text-[#17231C]">No services found matching "{searchQuery}"</p>
          <p className="text-xs text-[#66736B]">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((srv) => {
            const isActive = srv.isActive !== false;

            return (
              <div
                key={srv._id}
                className={`p-5 rounded-3xl border transition-all space-y-3 flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-[#E3EAE5] shadow-card hover:shadow-soft'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isActive
                          ? 'bg-[#EAF6EE] text-[#11643A] border-[#16834A]/20'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#16834A]' : 'bg-slate-400'}`}
                      />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </span>

                    <span className="font-mono text-xs font-bold text-[#11643A] bg-[#EAF6EE] px-2.5 py-1 rounded-lg border border-[#16834A]/20">
                      {srv.price === 0 ? 'Free' : `$${srv.price.toFixed(2)}`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="font-extrabold text-base text-[#17231C] leading-snug">
                      {srv.name}
                    </h4>
                    <p className="text-xs text-[#66736B] line-clamp-2 mt-1 leading-relaxed">
                      {srv.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Duration & Actions Row */}
                <div className="pt-3 border-t border-[#E3EAE5] flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#66736B] flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-[#16834A]" />
                    <span>{srv.durationMinutes} minutes</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(srv)}
                      title={isActive ? 'Deactivate service (hide from booking)' : 'Activate service (show for booking)'}
                      className={`p-1.5 rounded-xl transition-colors ${
                        isActive
                          ? 'text-[#16834A] hover:bg-[#EAF6EE]'
                          : 'text-slate-400 hover:text-[#16834A] hover:bg-[#EAF6EE]'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(srv)}
                      title="Edit service details"
                      className="p-1.5 rounded-xl text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(srv)}
                      title="Delete service"
                      className="p-1.5 rounded-xl text-[#66736B] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E3EAE5] shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#EAF6EE] text-[#16834A]">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#17231C]">
                    {editingService ? 'Edit Service Details' : 'Add New Service to Catalog'}
                  </h3>
                  <p className="text-xs text-[#66736B]">
                    {editingService ? 'Update pricing, duration, or active status' : 'Configure a service procedure for customer bookings'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <Input
                label="Service Name"
                placeholder="e.g. General Health Consultation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                maxLength={100}
                helperText="Enter a descriptive title for this service (2-100 characters)."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#17231C]">
                    Duration (Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[#E3EAE5] bg-white px-3.5 py-2.5 text-sm text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setFormData({ ...formData, durationMinutes: mins })}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-colors ${
                          Number(formData.durationMinutes) === mins
                            ? 'bg-[#16834A] text-white border-[#16834A]'
                            : 'bg-[#F3FAF5] text-[#66736B] border-[#E3EAE5] hover:bg-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#17231C]">
                    Price (USD $)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#66736B]">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full rounded-xl border border-[#E3EAE5] bg-white pl-8 pr-3.5 py-2.5 text-sm text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                    />
                  </div>
                  <p className="text-[11px] text-[#66736B]">Enter 0 for free consultations.</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#17231C]">
                  Service Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what this appointment or procedure covers, preparation needed, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  className="w-full rounded-xl border border-[#E3EAE5] bg-white p-3 text-sm text-[#17231C] placeholder:text-[#66736B]/60 focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                />
                <p className="text-[11px] text-[#66736B] text-right">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Active Toggle Checkbox */}
              <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-[#F3FAF5] border border-[#E3EAE5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#16834A] rounded border-[#E3EAE5] focus:ring-[#16834A]"
                />
                <div className="text-xs">
                  <p className="font-bold text-[#17231C]">Active & Available for Booking</p>
                  <p className="text-[#66736B] text-[11px]">
                    When checked, customers can immediately discover and book this service online.
                  </p>
                </div>
              </label>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#E3EAE5] flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={saving}>
                  {editingService ? 'Save Changes' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteModalOpen && serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E3EAE5] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-lg text-[#17231C]">
                Delete Service?
              </h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#17231C]">"{serviceToDelete.name}"</strong>?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Safety & Reference Integrity Rules:</span>
              </p>
              <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-0.5">
                <li>Deletion will be <strong>blocked</strong> if there are active bookings scheduled.</li>
                <li>If past appointments exist, the service will be <strong>soft-deactivated</strong> to preserve historical customer records.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleConfirmDelete}
                isLoading={deleting}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

