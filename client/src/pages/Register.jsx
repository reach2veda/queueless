import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers,
  User,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'business' ? 'provider' : 'customer';

  const [accountType, setAccountType] = useState(initialType);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Clinic');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('type') === 'business') {
      setAccountType('provider');
    }
  }, [searchParams]);

  const validate = () => {
    const errors = {};

    if (accountType === 'customer') {
      if (!name.trim()) errors.name = 'Full name is required';
      else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    } else {
      if (!businessName.trim()) errors.businessName = 'Business name is required';
      if (!ownerName.trim()) errors.ownerName = 'Owner / Manager name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please provide a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      if (!confirmPassword) {
        setServerError('Please confirm your password.');
      } else if (password !== confirmPassword) {
        setServerError('Passwords do not match.');
      }
      return;
    }

    setIsLoading(true);

    const payload = {
      name: accountType === 'customer' ? name : ownerName,
      email,
      password,
      confirmPassword,
      phone,
      role: accountType,
      ...(accountType === 'provider' && {
        businessName,
        businessCategory,
      }),
    };

    try {
      const result = await register(payload);
      if (result.success) {
        if (result.user.role === 'provider') {
          navigate('/provider/dashboard');
        } else {
          navigate('/customer/dashboard');
        }
      }
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Header */}
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
          <div className="text-xs text-[#66736B]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#16834A] hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
              Create Your QueueLess Account
            </h1>
            <p className="text-sm text-[#66736B]">
              Skip lines as a customer or streamline appointments as a business.
            </p>
          </div>

          {/* Account Type Selector Pill */}
          <div className="grid grid-cols-2 gap-2 bg-[#F3FAF5] p-1.5 rounded-2xl border border-[#E3EAE5]">
            <button
              type="button"
              onClick={() => {
                setAccountType('customer');
                setFormErrors({});
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                accountType === 'customer'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('provider');
                setFormErrors({});
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                accountType === 'provider'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Business / Provider</span>
            </button>
          </div>

          {/* Server Error Notice */}
          {serverError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {accountType === 'customer' ? (
              <Input
                label="Full Name"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={formErrors.name}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            ) : (
              <>
                <Input
                  label="Business Name"
                  placeholder="Apex Medical Center / Luxe Salon"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  error={formErrors.businessName}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Owner / Manager Name"
                    placeholder="Dr. John Smith"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    error={formErrors.ownerName}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#17231C]">
                      Business Category
                    </label>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#E3EAE5] bg-white text-[#17231C] text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                    >
                      <option value="Clinic">Clinic & Healthcare</option>
                      <option value="Salon">Salon & Spa</option>
                      <option value="Bank">Bank & Finance</option>
                      <option value="ServiceCenter">Service & Repair Center</option>
                      <option value="Administration">College & Administrative Office</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PasswordInput
                label="Create Password"
                id="reg-password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  if (formErrors.password) {
                    setFormErrors((prev) => ({ ...prev, password: '' }));
                  }
                  if (confirmPassword && val !== confirmPassword) {
                    setFormErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                  } else if (confirmPassword && val === confirmPassword) {
                    setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    if (serverError === 'Passwords do not match.') setServerError('');
                  }
                }}
                error={formErrors.password}
                required
              />

              <PasswordInput
                label="Confirm Password"
                id="reg-confirm-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfirmPassword(val);
                  if (password && val !== password) {
                    setFormErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                  } else {
                    setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    if (serverError === 'Passwords do not match.') setServerError('');
                  }
                }}
                error={formErrors.confirmPassword}
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-md shadow-[#16834A]/20"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create {accountType === 'customer' ? 'Customer' : 'Business'} Account
              </Button>
            </div>
          </form>

          {/* Informational security note */}
          <div className="p-3.5 rounded-xl bg-[#F3FAF5] border border-[#E3EAE5] text-xs text-[#66736B] flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-[#16834A] shrink-0" />
            <span>
              Staff accounts are provisioned securely by authorized providers. Platform administrators cannot be registered publicly.
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E3EAE5] py-4 text-center text-xs text-[#66736B]">
        &copy; {new Date().getFullYear()} QueueLess Inc. All rights reserved.
      </footer>
    </div>
  );
}

