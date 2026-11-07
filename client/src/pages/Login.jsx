import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layers, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import QueueTicket from '../components/ui/QueueTicket';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Validate inputs on client
  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        // Dynamic role-based redirection
        const userRole = result.user.role;
        const redirectPath =
          location.state?.from?.pathname ||
          (userRole === 'admin'
            ? '/admin/dashboard'
            : userRole === 'provider'
            ? '/provider/dashboard'
            : userRole === 'staff'
            ? '/staff/dashboard'
            : '/customer/dashboard');

        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 1-Click Authenticator & Form Filler
  const handleDemoLogin = async (role, demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setFormErrors({});
    setServerError('');
    setIsLoading(true);

    try {
      const result = await loginDemo(role);
      if (result.success) {
        const redirectPath =
          location.state?.from?.pathname ||
          (result.user.role === 'provider'
            ? '/provider/dashboard'
            : result.user.role === 'admin'
            ? '/admin/dashboard'
            : '/customer/dashboard');

        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setServerError(err.message || 'Demo account is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-[#E3EAE5] bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#16834A] text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#17231C]">
              Queue<span className="text-[#16834A]">Less</span>
            </span>
          </Link>
          <Link to="/" className="text-xs font-semibold text-[#66736B] hover:text-[#17231C] transition-colors">
            Back to Homepage
          </Link>
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 items-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12 gap-12">
        
        {/* LEFT COLUMN: Clean White Form */}
        <div className="lg:col-span-6 max-w-md w-full mx-auto space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-sm text-[#66736B]">
              Your appointments and queues, all in one place.
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Notice</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={formErrors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={formErrors.password}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E3EAE5] text-[#16834A] focus:ring-[#16834A]/30 w-4 h-4 cursor-pointer"
                />
                <span className="text-[#66736B]">Remember me</span>
              </label>

              <a
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset instructions will be sent to your registered email.');
                }}
                className="text-[#16834A] font-semibold hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-md shadow-[#16834A]/20"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Register Link */}
          <p className="text-center text-xs text-[#66736B] pt-2">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-[#16834A] hover:underline">
              Create an account
            </Link>
          </p>

          {/* Development Quick-Fill Helper */}
          <div className="pt-4 border-t border-[#E3EAE5]">
            <p className="text-[11px] font-semibold text-[#66736B] uppercase tracking-wider mb-2">
              Quick Test Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('customer', 'customer@queueless.com')}
                className="px-2.5 py-2 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] hover:bg-[#EAF6EE] text-[#17231C] text-left transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Customer Demo</span>
                  <span className="text-[10px] text-[#16834A] font-bold">1-Click &rarr;</span>
                </div>
                <span className="block text-[10px] text-[#66736B] truncate">customer@queueless.com</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('provider', 'provider@queueless.com')}
                className="px-2.5 py-2 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] hover:bg-[#EAF6EE] text-[#17231C] text-left transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#11643A]">Provider Demo</span>
                  <span className="text-[10px] text-[#16834A] font-bold">1-Click &rarr;</span>
                </div>
                <span className="block text-[10px] text-[#66736B] truncate">provider@queueless.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: White-and-Green Illustration & Live Preview */}
        <div className="hidden lg:flex lg:col-span-6 flex-col items-center justify-center relative p-8">
          <div className="w-full max-w-md bg-[#F3FAF5] rounded-3xl p-8 border border-[#E3EAE5] relative overflow-hidden shadow-soft">
            <div className="space-y-4 mb-6">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Live Queue Ecosystem
              </span>
              <h3 className="text-xl font-bold text-[#17231C]">
                Real-Time Transparency for Every Appointment
              </h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Log in to view live waiting estimates, counter calls, and seamless check-ins powered by our atomic queue engine.
              </p>
            </div>

            {/* Visual Queue Ticket Component */}
            <div className="transform scale-95 origin-top">
              <QueueTicket
                ticketNumber="Q-042"
                businessName="Apex Medical Center"
                serviceName="General Consultation"
                positionAhead={2}
                estimatedWait={14}
                status="SERVING"
                date="Today, 11:15 AM"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-[#E3EAE5]/60 flex items-center justify-between text-xs text-[#66736B]">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                <span>Protected by HTTP-Only JWT</span>
              </div>
              <span>Port 5000 API Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="border-t border-[#E3EAE5] py-4 text-center text-xs text-[#66736B]">
        &copy; {new Date().getFullYear()} QueueLess Inc. All rights reserved.
      </footer>
    </div>
  );
}

