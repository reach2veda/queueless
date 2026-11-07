import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Users,
  CalendarCheck2,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Stethoscope,
  Scissors,
  Landmark,
  Wrench,
  GraduationCap,
  Bell,
  Smartphone,
  ChevronRight,
  Zap
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import QueueTicket from '../components/ui/QueueTicket';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#17231C] selection:bg-[#EAF6EE] selection:text-[#11643A]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-gradient-to-b from-[#F3FAF5] via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs font-semibold shadow-soft-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Next-Gen Smart Virtual Queueing Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17231C] leading-[1.12]">
                Your Time Matters.{' '}
                <span className="text-[#16834A] relative inline-block">
                  Skip the Queue.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 10C50 3 150 2 298 9" stroke="#16834A" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#66736B] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Book appointments, join virtual queues and track your waiting time in real time. Get where you need to be without unnecessary waiting.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                <Link to="/register?type=customer" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto shadow-md shadow-[#16834A]/20"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Book an Appointment
                  </Button>
                </Link>

                <Link to="/register?type=business" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    leftIcon={<Building2 className="w-4 h-4 text-[#16834A]" />}
                  >
                    Register Your Business
                  </Button>
                </Link>
              </div>

              {/* Social Proof Mini Bar */}
              <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#66736B]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                  <span>Real-Time Position Tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                  <span>Atomic Double-Booking Prevention</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                  <span>Instant Notifications</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual: Live Queue Mockup & Ticket Preview */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
              <div className="relative w-full max-w-md">
                
                {/* Background decorative soft blur */}
                <div className="absolute -top-10 -right-10 w-72 h-72 bg-[#EAF6EE] rounded-full blur-3xl pointer-events-none -z-10"></div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#F3FAF5] rounded-full blur-2xl pointer-events-none -z-10"></div>

                {/* Main Queue Ticket Card */}
                <div className="relative z-10 transform transition-transform hover:-translate-y-1 duration-300">
                  <QueueTicket
                    ticketNumber="Q-104"
                    businessName="Metro Health Clinic"
                    serviceName="Doctor Consultation"
                    positionAhead={2}
                    estimatedWait={12}
                    status="WAITING"
                    date="Today • 10:45 AM"
                  />
                </div>

                {/* Floating Notification Badge */}
                <div className="absolute -top-4 -left-6 z-20 bg-white border border-[#E3EAE5] rounded-2xl p-3.5 shadow-soft flex items-center space-x-3 animate-bounce [animation-duration:3s]">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#17231C]">Live Update</p>
                    <p className="text-[11px] text-[#16834A] font-semibold">2 people served ahead of you</p>
                  </div>
                </div>

                {/* Floating Appointment Summary Pill */}
                <div className="absolute -bottom-6 -right-4 z-20 bg-white border border-[#E3EAE5] rounded-2xl p-3 shadow-soft flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                    <CalendarCheck2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold text-[#17231C]">Appointment Confirmed</p>
                    <p className="text-[10px] text-[#66736B]">Dr. Sarah Jenkins • Room 204</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: How QueueLess Works */}
      <section id="how-it-works" className="py-20 bg-white border-t border-[#E3EAE5]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#16834A] tracking-wider uppercase bg-[#EAF6EE] px-3 py-1 rounded-full">
              Seamless 3-Step Process
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#17231C]">
              How QueueLess Works
            </h2>
            <p className="text-sm text-[#66736B] leading-relaxed">
              We replace chaotic physical waiting rooms with an intuitive, transparent digital flow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-[#F3FAF5] rounded-3xl p-8 border border-[#E3EAE5] relative group hover:border-[#16834A]/40 transition-all duration-300">
              <span className="text-4xl font-extrabold text-[#16834A]/20 absolute top-6 right-6 font-mono">01</span>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mb-6 shadow-sm">
                <CalendarCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#17231C] mb-2">Book or Join Virtual Queue</h3>
              <p className="text-xs sm:text-sm text-[#66736B] leading-relaxed">
                Choose a provider, pick an available scheduled slot, or scan their QR code to join today's virtual walk-in queue from anywhere.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#F3FAF5] rounded-3xl p-8 border border-[#E3EAE5] relative group hover:border-[#16834A]/40 transition-all duration-300">
              <span className="text-4xl font-extrabold text-[#16834A]/20 absolute top-6 right-6 font-mono">02</span>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mb-6 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#17231C] mb-2">Live Real-Time Tracking</h3>
              <p className="text-xs sm:text-sm text-[#66736B] leading-relaxed">
                Monitor your position live on your phone. See how many people are ahead and receive dynamic waiting time estimates without standing in line.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#F3FAF5] rounded-3xl p-8 border border-[#E3EAE5] relative group hover:border-[#16834A]/40 transition-all duration-300">
              <span className="text-4xl font-extrabold text-[#16834A]/20 absolute top-6 right-6 font-mono">03</span>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mb-6 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#17231C] mb-2">Walk In Just in Time</h3>
              <p className="text-xs sm:text-sm text-[#66736B] leading-relaxed">
                Receive an instant alert when you are called. Walk directly to the service desk or consultation room and be served immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Core Platform Features */}
      <section id="features" className="py-20 bg-[#F3FAF5] border-t border-[#E3EAE5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#16834A] tracking-wider uppercase bg-[#EAF6EE] px-3 py-1 rounded-full">
              Built for Scale & Reliability
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#17231C]">
              Engineered for Modern Service Workflows
            </h2>
            <p className="text-sm text-[#66736B] leading-relaxed">
              Every feature is built on atomic database concurrency to guarantee zero double bookings and zero lost tickets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Atomic Queue Counter</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Unique sequential ticket numbers (Q001, Q002) generated atomically in MongoDB, eliminating race conditions even during high traffic surges.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Conflict-Free Scheduling</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Smart slot engine evaluates working hours, staff availability, and existing bookings to prevent double booking.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Dynamic Wait Calculation</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Algorithms calculate remaining time by factoring active staff count, historical completion durations, and serving status.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Multi-Staff Coordination</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Assign specific counters and queue streams to receptionists and doctors. Staff can call next, serve, skip, or recall customers.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Role-Based Access Control</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Strict backend enforcement separating Customer, Provider, Staff, and Administrator permissions with HTTP-only JWT cookies.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-3 hover:shadow-soft transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#17231C]">Zero App Download Required</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                Fully responsive progressive web client that runs seamlessly on mobile browsers, tablets, and desktop workstations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Services Supported */}
      <section id="services" className="py-20 bg-white border-t border-[#E3EAE5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#16834A] tracking-wider uppercase bg-[#EAF6EE] px-3 py-1 rounded-full">
              Configurable Across Industries
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#17231C]">
              Tailored for Every Busy Service Center
            </h2>
            <p className="text-sm text-[#66736B] leading-relaxed">
              QueueLess adapts to the exact scheduling and queue rules of diverse service industries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] text-center space-y-3 hover:border-[#16834A]/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#16834A] flex items-center justify-center mx-auto shadow-sm">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">Hospitals & Clinics</h4>
              <p className="text-xs text-[#66736B]">Doctor consultations, labs, diagnostics, and outpatient queues.</p>
            </div>

            <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] text-center space-y-3 hover:border-[#16834A]/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#16834A] flex items-center justify-center mx-auto shadow-sm">
                <Scissors className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">Salons & Spas</h4>
              <p className="text-xs text-[#66736B]">Stylist appointments, beauty treatments, and walk-in chairs.</p>
            </div>

            <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] text-center space-y-3 hover:border-[#16834A]/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#16834A] flex items-center justify-center mx-auto shadow-sm">
                <Landmark className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">Banks & Finance</h4>
              <p className="text-xs text-[#66736B]">Teller transactions, loans, account managers, and advisory counters.</p>
            </div>

            <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] text-center space-y-3 hover:border-[#16834A]/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#16834A] flex items-center justify-center mx-auto shadow-sm">
                <Wrench className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">Service Centers</h4>
              <p className="text-xs text-[#66736B]">Device repairs, customer service desks, and hardware drop-offs.</p>
            </div>

            <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] text-center space-y-3 hover:border-[#16834A]/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#16834A] flex items-center justify-center mx-auto shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">University Offices</h4>
              <p className="text-xs text-[#66736B]">Registrar counters, fee payments, and admissions counseling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Benefits Comparison (Customers vs. Businesses) */}
      <section id="for-businesses" className="py-20 bg-[#F3FAF5] border-t border-[#E3EAE5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#16834A] tracking-wider uppercase bg-[#EAF6EE] px-3 py-1 rounded-full">
              Value Proposition
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#17231C]">
              Win-Win for Visitors & Business Owners
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* For Customers */}
            <div className="bg-white rounded-3xl p-8 border border-[#E3EAE5] shadow-card space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#17231C]">For Customers</h3>
                  <p className="text-xs text-[#66736B]">Eliminate physical waiting anxiety and regain control of your day.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Wait Anywhere:</strong> Spend waiting time at a café or home instead of in crowded lobbies.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Real-Time Transparency:</strong> Live ticket position and estimated wait times updated dynamically.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>One-Click Rescheduling:</strong> Change or cancel bookings easily without repetitive phone calls.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Digital Queue History:</strong> Keep a record of past visits, receipts, and verified reviews.</span>
                </div>
              </div>
            </div>

            {/* For Businesses */}
            <div className="bg-white rounded-3xl p-8 border border-[#E3EAE5] shadow-card space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#17231C]">For Service Providers</h3>
                  <p className="text-xs text-[#66736B]">Streamline staff operations, reduce lobby chaos, and gain deep analytics.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Decongest Waiting Rooms:</strong> Maintain calm, safe, and organized reception areas.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Drastically Reduce No-Shows:</strong> Real-time SMS and browser notifications keep customers prompt.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Staff Productivity Analytics:</strong> Monitor average service times, counter efficiency, and peak hours.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
                  <span className="text-[#17231C]"><strong>Easy Staff Terminal:</strong> Simplified receptionist interface to call, serve, skip, or recall tickets.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Call to Action */}
      <section className="py-20 bg-white border-t border-[#E3EAE5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-tr from-[#16834A] to-[#11643A] rounded-3xl p-10 sm:p-14 text-white text-center shadow-soft-lg relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Eliminate Physical Queues?
              </h2>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                Join modern clinics, salons, and offices already streamlining their operations with QueueLess. Experience the future of time management today.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link to="/register?type=customer" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto bg-white text-[#11643A] hover:bg-slate-50 font-semibold"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/40 text-white bg-transparent hover:bg-white/10"
                  >
                    Sign In to Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

