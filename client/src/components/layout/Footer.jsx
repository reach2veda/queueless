import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E3EAE5] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#E3EAE5]">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#16834A] text-white flex items-center justify-center shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#17231C]">
                Queue<span className="text-[#16834A]">Less</span>
              </span>
            </Link>
            <p className="text-sm text-[#66736B] leading-relaxed max-w-sm">
              Skip the wait. Own your time. The modern smart appointment scheduling and virtual queue management platform designed for service excellence.
            </p>
            <div className="flex items-center space-x-2 text-xs text-[#16834A] font-semibold bg-[#EAF6EE] px-3 py-1.5 rounded-full w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span>Production-Grade MERN Architecture</span>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#17231C] uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2 text-sm text-[#66736B]">
              <li><a href="#services" className="hover:text-[#16834A] transition-colors">Clinics & Healthcare</a></li>
              <li><a href="#services" className="hover:text-[#16834A] transition-colors">Salons & Spas</a></li>
              <li><a href="#services" className="hover:text-[#16834A] transition-colors">Banks & Financial</a></li>
              <li><a href="#services" className="hover:text-[#16834A] transition-colors">Service Centers</a></li>
              <li><a href="#services" className="hover:text-[#16834A] transition-colors">College & Admin Offices</a></li>
            </ul>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#17231C] uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm text-[#66736B]">
              <li><a href="#how-it-works" className="hover:text-[#16834A] transition-colors">How It Works</a></li>
              <li><a href="#features" className="hover:text-[#16834A] transition-colors">Live Queue Engine</a></li>
              <li><a href="#for-businesses" className="hover:text-[#16834A] transition-colors">Provider Dashboard</a></li>
              <li><Link to="/register" className="hover:text-[#16834A] transition-colors">Register Business</Link></li>
              <li><Link to="/dev-diagnostics" className="hover:text-[#16834A] transition-colors text-xs text-slate-400">System Diagnostics</Link></li>
            </ul>
          </div>

          {/* User Access Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#17231C] uppercase tracking-wider">Access</h4>
            <ul className="space-y-2 text-sm text-[#66736B]">
              <li><Link to="/login" className="hover:text-[#16834A] transition-colors">Customer Portal</Link></li>
              <li><Link to="/login" className="hover:text-[#16834A] transition-colors">Provider Login</Link></li>
              <li><Link to="/login" className="hover:text-[#16834A] transition-colors">Staff Terminal</Link></li>
              <li><Link to="/login" className="hover:text-[#16834A] transition-colors">Admin Gateway</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#66736B] space-y-4 sm:space-y-0">
          <p>&copy; {new Date().getFullYear()} QueueLess Inc. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="hover:text-[#17231C] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#17231C] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#17231C] cursor-pointer">Security Overview</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

