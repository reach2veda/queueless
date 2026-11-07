import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Power,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Stethoscope,
  Briefcase
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';

const DAYS_OF_WEEK = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
  { index: 0, label: 'Sun' },
];

export default function StaffManagementSection({ services = [] }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    role: 'doctor',
    serviceIds: [],
    workingDays: [1, 2, 3, 4, 5],
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    notes: '',
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/staff/my');
      if (res.data?.success) {
        setStaff(res.data.staff || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load staff roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      title: '',
      role: 'doctor',
      serviceIds: services.map((s) => s._id),
      workingDays: [1, 2, 3, 4, 5],
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      title: member.title || '',
      role: member.role || 'doctor',
      serviceIds: (member.serviceIds || []).map((s) => (typeof s === 'object' ? s._id : s)),
      workingDays: member.workingDays || [1, 2, 3, 4, 5],
      workingHoursStart: member.workingHours?.start || '09:00',
      workingHoursEnd: member.workingHours?.end || '17:00',
      notes: member.notes || '',
    });
    setModalOpen(true);
  };

  const handleToggleDay = (dayIndex) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(dayIndex);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== dayIndex)
          : [...prev.workingDays, dayIndex].sort(),
      };
    });
  };

  const handleToggleService = (serviceId) => {
    setFormData((prev) => {
      const exists = prev.serviceIds.includes(serviceId);
      return {
        ...prev,
        serviceIds: exists
          ? prev.serviceIds.filter((id) => id !== serviceId)
          : [...prev.serviceIds, serviceId],
      };
    });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Staff member name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      title: formData.title.trim(),
      role: formData.role,
      serviceIds: formData.serviceIds,
      workingDays: formData.workingDays,
      workingHours: {
        start: formData.workingHoursStart,
        end: formData.workingHoursEnd,
      },
      notes: formData.notes.trim(),
    };

    try {
      if (editingStaff) {
        await api.patch(`/staff/${editingStaff._id}`, payload);
        setSuccessMsg(`Updated details for ${payload.name}`);
      } else {
        await api.post('/staff', payload);
        setSuccessMsg(`Staff member ${payload.name} added successfully`);
      }
      setModalOpen(false);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus, name) => {
    try {
      setError('');
      await api.patch(`/staff/${staffId}/toggle-status`);
      setSuccessMsg(`${name} is now ${currentStatus ? 'Deactivated' : 'Active'}`);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to update staff status');
    }
  };

  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your staff roster?`)) {
      return;
    }

    try {
      setError('');
      await api.delete(`/staff/${staffId}`);
      setSuccessMsg(`Staff member ${name} removed`);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to remove staff member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-lg font-bold text-[#17231C] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#16834A]" />
            <span>Staff & Practitioner Roster</span>
          </h3>
          <p className="text-xs text-[#66736B]">
            Manage doctor/specialist accounts, designated working hours, and assignable services.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAddModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/30 text-[#11643A] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Staff Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#66736B]">
          Loading staff roster...
        </div>
      ) : staff.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-[#F3FAF5] rounded-3xl border border-dashed border-[#E3EAE5]">
          <Users className="w-10 h-10 text-[#66736B]/60 mx-auto" />
          <h4 className="font-bold text-[#17231C] text-sm">No Staff Members Added Yet</h4>
          <p className="text-xs text-[#66736B] max-w-sm mx-auto">
            Add practitioners, nurses, or receptionists to assign them to customer bookings and queues.
          </p>
          <Button variant="primary" size="sm" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add First Staff Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staff.map((member) => (
            <div
              key={member._id}
              className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                member.isActive
                  ? 'bg-white border-[#E3EAE5] shadow-card hover:shadow-soft'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Header & Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        member.isActive
                          ? 'bg-[#EAF6EE] text-[#16834A] border border-[#16834A]/20'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#17231C]">{member.name}</h4>
                      <p className="text-xs text-[#66736B]">
                        {member.title || member.role || 'Staff Member'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      member.isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-[#66736B]">
                  {member.email && (
                    <p className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>{member.email}</span>
                    </p>
                  )}
                  {member.phone && (
                    <p className="flex items-center space-x-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>{member.phone}</span>
                    </p>
                  )}
                </div>

                {/* Working hours & days */}
                <div className="bg-[#F3FAF5] p-3 rounded-2xl space-y-1.5 text-xs border border-[#E3EAE5]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#17231C] flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>Hours:</span>
                    </span>
                    <span className="font-mono text-[#11643A] font-semibold">
                      {member.workingHours?.start || '09:00'} - {member.workingHours?.end || '17:00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#17231C] flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>Days:</span>
                    </span>
                    <div className="flex space-x-1">
                      {DAYS_OF_WEEK.map((d) => {
                        const isWorking = member.workingDays?.includes(d.index);
                        return (
                          <span
                            key={d.index}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                              isWorking
                                ? 'bg-[#16834A] text-white'
                                : 'bg-white text-slate-400 border border-slate-200'
                            }`}
                          >
                            {d.label.slice(0, 1)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Assigned Services */}
                {member.serviceIds && member.serviceIds.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736B]">
                      Assigned Services
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.serviceIds.map((s) => {
                        const name = typeof s === 'object' ? s.name : services.find((sv) => sv._id === s)?.name || 'Service';
                        return (
                          <span
                            key={typeof s === 'object' ? s._id : s}
                            className="text-[10px] bg-[#EAF6EE] text-[#11643A] px-2 py-0.5 rounded-lg border border-[#16834A]/20"
                          >
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#E3EAE5] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(member._id, member.isActive, member.name)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center space-x-1 transition-colors ${
                    member.isActive
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{member.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    className="p-1.5 rounded-xl text-[#66736B] hover:text-[#16834A] hover:bg-[#F3FAF5]"
                    title="Edit Staff Member"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(member._id, member.name)}
                    className="p-1.5 rounded-xl text-[#66736B] hover:text-rose-600 hover:bg-rose-50"
                    title="Remove Staff Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-soft-lg w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between bg-white shrink-0">
              <h3 className="font-bold text-base text-[#17231C]">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStaff} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Emily Watson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Pediatrician"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Email Address</label>
                  <input
                    type="email"
                    placeholder="emily@metrohealth.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-1">
                <label className="font-semibold text-[#17231C]">Working Hours</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[#66736B] block mb-0.5">Start Time</span>
                    <input
                      type="time"
                      value={formData.workingHoursStart}
                      onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#66736B] block mb-0.5">End Time</span>
                    <input
                      type="time"
                      value={formData.workingHoursEnd}
                      onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                    />
                  </div>
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-1">
                <label className="font-semibold text-[#17231C]">Working Days</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formData.workingDays.includes(d.index);
                    return (
                      <button
                        key={d.index}
                        type="button"
                        onClick={() => handleToggleDay(d.index)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#16834A] text-white shadow-xs'
                            : 'bg-[#F3FAF5] text-[#66736B] border border-[#E3EAE5] hover:border-[#16834A]/40'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignable Services */}
              {services.length > 0 && (
                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Assignable Services</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {services.map((srv) => {
                      const isSelected = formData.serviceIds.includes(srv._id);
                      return (
                        <div
                          key={srv._id}
                          onClick={() => handleToggleService(srv._id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#EAF6EE] border-[#16834A] text-[#11643A]'
                              : 'bg-white border-[#E3EAE5] text-[#66736B]'
                          }`}
                        >
                          <span className="font-semibold text-xs">{srv.name}</span>
                          <span className="text-[10px] font-mono">${srv.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[#17231C]">Internal Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Counter 2 or room 104..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#E3EAE5] flex justify-end space-x-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                  {editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

