import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Clock,
  User,
  Users,
  Ticket,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
  Phone,
  Mail
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Bookings' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AppointmentsSection() {
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [appRes, staffRes] = await Promise.all([
        api.get('/appointments/business/all'),
        api.get('/staff/my'),
      ]);

      if (appRes.data?.success) {
        setAppointments(appRes.data.appointments || []);
      }
      if (staffRes.data?.success) {
        setStaff(staffRes.data.staff || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load appointments roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignStaff = async (appointmentId, staffId) => {
    setAssigningId(appointmentId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.patch(`/appointments/${appointmentId}/assign-staff`, {
        staffId: staffId || null,
      });

      if (res.data?.success) {
        setAppointments((prev) =>
          prev.map((app) =>
            app._id === appointmentId ? res.data.appointment : app
          )
        );
        const assignedStaffName = staff.find((s) => s._id === staffId)?.name || 'staff';
        setSuccessMsg(staffId ? `Assigned appointment to ${assignedStaffName}` : 'Staff assignment removed');
      }
    } catch (err) {
      setError(err.message || 'Failed to assign staff member');
    } finally {
      setAssigningId(null);
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    const matchesStatus =
      selectedStatus === 'all' ? true : app.status === selectedStatus;
    const matchesSearch =
      (app.customerId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.tokenNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.serviceId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.bookingReference || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-lg font-bold text-[#17231C] flex items-center space-x-2">
            <CalendarCheck2 className="w-5 h-5 text-[#16834A]" />
            <span>Appointment Bookings & Staff Assignment</span>
          </h3>
          <p className="text-xs text-[#66736B]">
            Review upcoming and completed patient visits, monitor queue tokens, and assign designated practitioners.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16834A]' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Alerts */}
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

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name, token number (QL...), or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EAE5] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
          />
        </div>

        <div className="sm:col-span-4 flex items-center space-x-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedStatus(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === f.value
                  ? 'bg-[#16834A] text-white shadow-xs'
                  : 'bg-white border border-[#E3EAE5] text-[#66736B] hover:border-[#16834A]/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#66736B]">
          Loading appointments...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-[#F3FAF5] rounded-3xl border border-dashed border-[#E3EAE5]">
          <CalendarCheck2 className="w-10 h-10 text-[#66736B]/60 mx-auto" />
          <h4 className="font-bold text-[#17231C] text-sm">No Appointments Found</h4>
          <p className="text-xs text-[#66736B]">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try clearing search filters.'
              : 'Appointments booked by customers will show up here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((app) => {
            const currentStaffId = typeof app.staffId === 'object' ? app.staffId?._id : app.staffId;
            return (
              <div
                key={app._id}
                className="p-5 rounded-3xl bg-white border border-[#E3EAE5] shadow-card hover:shadow-soft transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Patient & Token Info */}
                <div className="flex items-start space-x-4">
                  {/* Token Badge */}
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#11643A] flex flex-col items-center justify-center border-2 border-[#16834A]/25 shrink-0 shadow-xs">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#16834A]">
                      Token
                    </span>
                    <span className="font-mono font-extrabold text-sm">
                      {app.tokenNumber || 'QL001'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-[#17231C]">
                        {app.customerId?.name || 'Customer Guest'}
                      </h4>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#66736B]">
                      {app.customerId?.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-[#16834A]" />
                          <span>{app.customerId.email}</span>
                        </span>
                      )}
                      {app.customerId?.phone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-[#16834A]" />
                          <span>{app.customerId.phone}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#66736B]">
                      Service:{' '}
                      <strong className="text-[#17231C]">
                        {app.serviceId?.name || 'Standard Consultation'}
                      </strong>
                      <span className="mx-2">•</span>
                      Ref:{' '}
                      <span className="font-mono font-semibold text-[#11643A]">
                        {app.bookingReference}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Date, Time & Staff Assignment */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E3EAE5]">
                  {/* Slot Details */}
                  <div className="text-left sm:text-right space-y-0.5">
                    <div className="text-xs font-bold text-[#17231C] flex items-center sm:justify-end space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>{app.startTime} - {app.endTime}</span>
                    </div>
                    <div className="text-[11px] text-[#66736B] font-mono">
                      {app.appointmentDate}
                    </div>
                  </div>

                  {/* Staff Assignment Dropdown */}
                  <div className="flex items-center space-x-2 bg-[#F3FAF5] p-2 rounded-2xl border border-[#E3EAE5]">
                    <Users className="w-4 h-4 text-[#16834A] shrink-0" />
                    <div className="text-xs">
                      <span className="text-[10px] text-[#66736B] block">Assign Staff:</span>
                      <select
                        disabled={assigningId === app._id}
                        value={currentStaffId || ''}
                        onChange={(e) => handleAssignStaff(app._id, e.target.value)}
                        className="bg-white border border-[#E3EAE5] rounded-lg px-2 py-1 text-xs font-semibold text-[#17231C] focus:outline-none focus:ring-1 focus:ring-[#16834A]"
                      >
                        <option value="">Unassigned</option>
                        {staff
                          .filter((s) => s.isActive)
                          .map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.title || s.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

