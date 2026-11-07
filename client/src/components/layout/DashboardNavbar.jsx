import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Bell,
  LogOut,
  User,
  Shield,
  Menu,
  Check,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Clock,
  Megaphone,
  XCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import api from '../../services/api';

export default function DashboardNavbar({ title = 'Dashboard', toggleSidebar }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const roleBadgeStyles = {
    customer: 'bg-[#EAF6EE] text-[#11643A] border-[#16834A]/20',
    provider: 'bg-blue-50 text-blue-700 border-blue-200',
    staff: 'bg-amber-50 text-amber-800 border-amber-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  };

  // Fetch all notifications list
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.get('/notifications/my');
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Poll for notifications periodically
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // When opening dropdown, load full notifications list
  const handleToggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications((prev) => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'holiday':
      case 'temporary_closure':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'booking_delay':
      case 'schedule_change':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'cancellation':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'announcement':
      case 'new_service':
        return <Megaphone className="w-4 h-4 text-[#16834A]" />;
      default:
        return <Info className="w-4 h-4 text-[#16834A]" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E3EAE5] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left Title / Mobile Toggle */}
      <div className="flex items-center space-x-3">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-[#17231C]">{title}</h1>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Role Badge */}
        {user?.role && (
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
              roleBadgeStyles[user.role] || roleBadgeStyles.customer
            }`}
          >
            {user.role} Portal
          </span>
        )}

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleNotifications}
            title="Notifications"
            className="relative p-2 rounded-xl text-[#66736B] hover:text-[#16834A] hover:bg-[#F3FAF5] transition-colors focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-[#16834A] rounded-full border-2 border-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-soft-lg border border-[#E3EAE5] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-[#F3FAF5] border-b border-[#E3EAE5] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231C]">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-[#EAF6EE] text-[#11643A] px-2 py-0.5 rounded-full border border-[#16834A]/20">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#16834A] hover:text-[#11643A] flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#E3EAE5]">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-xs text-[#66736B]">
                    Loading updates...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <Bell className="w-8 h-8 text-[#66736B]/40 mx-auto" />
                    <p className="text-xs font-semibold text-[#17231C]">No notifications</p>
                    <p className="text-[11px] text-[#66736B]">
                      You're all caught up on announcements and bookings.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3.5 transition-colors flex items-start space-x-3 ${
                        n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-[#EAF6EE]/30 hover:bg-[#EAF6EE]/50'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-white border border-[#E3EAE5] shadow-xs shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className={`text-xs ${n.isRead ? 'font-medium text-[#17231C]' : 'font-bold text-[#11643A]'}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(n._id, e)}
                              title="Mark as read"
                              className="text-[10px] text-[#16834A] hover:text-[#11643A] shrink-0 p-1 rounded-md hover:bg-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-[#66736B] leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center space-x-2 text-[10px] text-[#66736B]/70 pt-0.5">
                          {n.businessId?.name && <span>{n.businessId.name} • </span>}
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Avatar */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EAF6EE] text-[#16834A] flex items-center justify-center font-bold text-xs border border-[#16834A]/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline-block text-xs font-semibold text-[#17231C]">
            {user?.name || 'User'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl text-[#66736B] hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
