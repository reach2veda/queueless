import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Menu, X, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'provider':
        return '/provider/dashboard';
      case 'staff':
        return '/staff/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'customer':
      default:
        return '/customer/dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E3EAE5] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-11 h-11 rounded-2xl bg-[#16834A] text-white flex items-center justify-center shadow-md shadow-[#16834A]/20 transition-transform duration-200 group-hover:scale-105">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-bold tracking-tight text-[#17231C]">
                Queue<span className="text-[#16834A]">Less</span>
              </span>
            </div>
            <p className="text-[10px] font-medium text-[#66736B] tracking-wide -mt-1">
              Skip the Wait. Own Your Time.
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors ${
              location.pathname === '/' ? 'text-[#16834A] font-semibold' : 'text-[#66736B] hover:text-[#17231C]'
            }`}
          >
            Home
          </Link>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-[#66736B] hover:text-[#17231C] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#services"
            className="text-sm font-medium text-[#66736B] hover:text-[#17231C] transition-colors"
          >
            Explore Services
          </a>
          <a
            href="#for-businesses"
            className="text-sm font-medium text-[#66736B] hover:text-[#17231C] transition-colors"
          >
            For Businesses
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link to={getDashboardLink()}>
                <Button variant="secondary" size="sm" leftIcon={<UserCheck className="w-4 h-4" />}>
                  Dashboard ({user.name.split(' ')[0]})
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E3EAE5] bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in fade-in duration-150">
          <nav className="flex flex-col space-y-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium rounded-lg text-[#17231C] hover:bg-[#F3FAF5]"
            >
              Home
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium rounded-lg text-[#66736B] hover:bg-[#F3FAF5]"
            >
              How It Works
            </a>
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium rounded-lg text-[#66736B] hover:bg-[#F3FAF5]"
            >
              Explore Services
            </a>
            <a
              href="#for-businesses"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium rounded-lg text-[#66736B] hover:bg-[#F3FAF5]"
            >
              For Businesses
            </a>
          </nav>

          <div className="pt-4 border-t border-[#E3EAE5] flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link to={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Go to Dashboard ({user.role})
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

