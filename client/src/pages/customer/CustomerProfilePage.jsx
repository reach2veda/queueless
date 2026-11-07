import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
  Loader2,
  Camera,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../services/api';

export default function CustomerProfilePage() {
  const { user, updateUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch the latest profile directly from MongoDB on page load
  useEffect(() => {
    let isMounted = true;
    const fetchFreshProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.user && isMounted) {
          const freshUser = res.data.user;
          setName(freshUser.name || '');
          setPhone(freshUser.phone || '');
          setAvatarUrl(freshUser.avatarUrl || '');
          if (updateUser) {
            updateUser(freshUser);
          }
        }
      } catch (err) {
        if (user && isMounted) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setAvatarUrl(user.avatarUrl || '');
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    fetchFreshProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize if user changes from auth context
  useEffect(() => {
    if (user && !loadingProfile) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleReset = () => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
      setError('');
      setSavedSuccess(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSavedSuccess(false);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (!trimmedName) {
      setError('Full name is required.');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }

    if (trimmedName.length > 60) {
      setError('Full name cannot exceed 60 characters.');
      return;
    }

    if (trimmedPhone.length > 25) {
      setError('Phone number cannot exceed 25 characters.');
      return;
    }

    setSaving(true);

    try {
      // Send secure PATCH request with only permitted fields
      const res = await api.patch('/auth/profile', {
        name: trimmedName,
        phone: trimmedPhone,
        avatarUrl: trimmedAvatar,
      });

      if (res.data?.success && res.data?.user) {
        const updatedUser = res.data.user;
        setName(updatedUser.name || '');
        setPhone(updatedUser.phone || '');
        setAvatarUrl(updatedUser.avatarUrl || '');

        // Immediately update global AuthContext user state
        if (updateUser) {
          updateUser(updatedUser);
        }

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 5000);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.data?.error?.message ||
        err.message ||
        'Failed to update profile settings. Please try again.';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Profile & Account Settings" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl w-full mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Personal Credentials
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Account Profile
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Manage your personal contact information, verified email, and account security preferences.
              </p>
            </div>

            {/* Profile Avatar & Role Summary Badge */}
            <div className="flex items-center space-x-3 bg-[#F3FAF5] p-3 rounded-2xl border border-[#E3EAE5]">
              <div className="w-12 h-12 rounded-xl bg-[#EAF6EE] text-[#16834A] border border-[#16834A]/20 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-inner">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#17231C] truncate max-w-[160px]">
                  {name || 'Customer'}
                </p>
                <span className="inline-block text-[11px] font-semibold text-[#11643A] bg-[#EAF6EE] px-2 py-0.5 rounded-md border border-[#16834A]/20 capitalize">
                  {user?.role || 'customer'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between font-semibold shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-600 hover:text-rose-800 text-xs underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs flex items-center space-x-2.5 font-semibold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0" />
              <span>Your profile preferences have been successfully updated and saved in MongoDB.</span>
            </div>
          )}

          {/* Main Edit Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card">
            {loadingProfile ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
                <p className="text-sm font-semibold text-[#17231C]">Loading profile from database...</p>
                <p className="text-xs text-[#66736B]">Synchronizing your latest credentials</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                    placeholder="e.g. Jane Doe"
                    required
                    maxLength={60}
                    helperText="Your legal or preferred display name (2-60 characters)."
                  />

                  <Input
                    label="Email Address (Protected)"
                    value={user?.email || ''}
                    leftIcon={<Mail className="w-4 h-4" />}
                    disabled
                    helperText="Email is securely tied to your login account and cannot be modified directly."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                    placeholder="+1 (555) 000-0000"
                    maxLength={25}
                    helperText="Used for appointment confirmations and real-time queue notifications."
                  />

                  <Input
                    label="Avatar Image URL (Optional)"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    leftIcon={<Camera className="w-4 h-4" />}
                    placeholder="https://example.com/avatar.jpg"
                    maxLength={500}
                    helperText="Paste a web image link to customize your account avatar."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#17231C] flex items-center justify-between">
                      <span>Account Role & Access Level</span>
                      <span className="text-[11px] text-[#66736B] font-normal flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-[#66736B]" />
                        <span>System Protected</span>
                      </span>
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] text-xs font-bold text-[#11643A] flex items-center justify-between">
                      <span className="capitalize">{user?.role || 'Customer'}</span>
                      <span className="text-[11px] font-normal text-[#66736B]">Standard Platform Access</span>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Role permissions are cryptographically verified by server middleware.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#17231C]">
                      Account Created
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] text-xs text-[#17231C] flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#16834A]" />
                      <span>
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Active Member'}
                      </span>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Account record registration timestamp in MongoDB.
                    </p>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-[#E3EAE5] flex items-center justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleReset}
                    disabled={saving}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Reset Changes
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={saving}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
