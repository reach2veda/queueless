import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Bell,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';

const ANNOUNCEMENT_TYPES = [
  { value: 'general', label: 'General Announcement' },
  { value: 'holiday', label: 'Holiday Notice' },
  { value: 'temporary_closure', label: 'Temporary Closure' },
  { value: 'booking_delay', label: 'Queue / Booking Delay' },
  { value: 'new_service', label: 'New Service Offered' },
  { value: 'schedule_change', label: 'Schedule Change' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'medium', label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'high', label: 'High', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'urgent', label: 'Urgent', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
];

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    priority: 'medium',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    isPublished: true,
    notifyCustomers: true,
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/announcements/my');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      type: 'general',
      priority: 'medium',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      isPublished: true,
      notifyCustomers: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      priority: item.priority,
      startDate: item.startDate,
      endDate: item.endDate,
      isPublished: item.isPublished,
      notifyCustomers: false, // Don't re-spam customers on minor edit
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please provide announcement title and description');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingItem) {
        await api.patch(`/announcements/${editingItem._id}`, formData);
        setSuccessMsg(`Announcement "${formData.title}" updated`);
      } else {
        const res = await api.post('/announcements', formData);
        const notifyCount = res.data?.notifiedCustomersCount;
        setSuccessMsg(
          `Announcement created! ${notifyCount > 0 ? `Sent in-app notifications to ${notifyCount} patients.` : ''}`
        );
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (id, currentPublished, title) => {
    try {
      setError('');
      await api.patch(`/announcements/${id}/publish`);
      setSuccessMsg(
        `Announcement "${title}" is now ${currentPublished ? 'Unpublished' : 'Published & Visible'}`
      );
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to toggle publication status');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return;

    try {
      setError('');
      await api.delete(`/announcements/${id}`);
      setSuccessMsg(`Announcement "${title}" removed`);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  const getPriorityBadgeClass = (priority) => {
    const found = PRIORITY_LEVELS.find((p) => p.value === priority);
    return found ? found.badge : 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-lg font-bold text-[#17231C] flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-[#16834A]" />
            <span>Customer Announcements & Notices</span>
          </h3>
          <p className="text-xs text-[#66736B]">
            Broadcast clinic updates, holiday closures, delays, and schedule changes directly to customer booking screens and notification inboxes.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Announcement
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

      {/* Announcements List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#66736B]">
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-[#F3FAF5] rounded-3xl border border-dashed border-[#E3EAE5]">
          <Megaphone className="w-10 h-10 text-[#66736B]/60 mx-auto" />
          <h4 className="font-bold text-[#17231C] text-sm">No Active Announcements</h4>
          <p className="text-xs text-[#66736B] max-w-sm mx-auto">
            Keep your patients informed about holiday schedules, unexpected delays, or special operating hours.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Create First Notice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {announcements.map((item) => (
            <div
              key={item._id}
              className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                item.isPublished
                  ? 'bg-white border-[#E3EAE5] shadow-card hover:shadow-soft'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <div className="space-y-3">
                {/* Badges & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPriorityBadgeClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#EAF6EE] text-[#11643A] px-2.5 py-0.5 rounded-full border border-[#16834A]/20">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.isPublished
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.isPublished ? '● Published' : '○ Draft'}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h4 className="font-bold text-sm text-[#17231C]">{item.title}</h4>
                  <p className="text-xs text-[#66736B] leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>

                {/* Dates */}
                <div className="flex items-center space-x-1.5 text-[11px] text-[#66736B] font-mono bg-[#F3FAF5] p-2.5 rounded-xl border border-[#E3EAE5]">
                  <Calendar className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>Valid: {item.startDate} to {item.endDate}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#E3EAE5] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(item._id, item.isPublished, item.title)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center space-x-1.5 transition-colors ${
                    item.isPublished
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {item.isPublished ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Unpublish</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-xl text-[#66736B] hover:text-[#16834A] hover:bg-[#F3FAF5]"
                    title="Edit Announcement"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id, item.title)}
                    className="p-1.5 rounded-xl text-[#66736B] hover:text-rose-600 hover:bg-rose-50"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-soft-lg w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between bg-white shrink-0">
              <h3 className="font-bold text-base text-[#17231C]">
                {editingItem ? 'Edit Announcement' : 'Create Customer Announcement'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-semibold text-[#17231C]">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extended Clinic Hours on Weekends"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-[#17231C]">Announcement Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide complete details for patients visiting your clinic..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Announcement Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Urgency / Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#17231C]">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
                  />
                </div>
              </div>

              {/* Checkboxes: Published & Notify */}
              <div className="space-y-2 pt-2 border-t border-[#E3EAE5]">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded text-[#16834A] focus:ring-[#16834A]"
                  />
                  <span className="font-semibold text-[#17231C]">Publish announcement immediately</span>
                </label>

                {!editingItem && (
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notifyCustomers}
                      onChange={(e) => setFormData({ ...formData, notifyCustomers: e.target.checked })}
                      className="rounded text-[#16834A] focus:ring-[#16834A]"
                    />
                    <span className="font-semibold text-[#17231C]">
                      Notify patients with upcoming bookings (In-App Notification)
                    </span>
                  </label>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#E3EAE5] flex justify-end space-x-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                  {editingItem ? 'Save Changes' : 'Publish Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

