import React, { useState, useEffect } from 'react';
import { Search, Filter, Building2, MapPin, Clock, Star, ArrowRight, PlusCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import BookAppointmentModal from '../../components/booking/BookAppointmentModal';
import api from '../../services/api';

export default function ExploreServicesPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Fetch businesses from MongoDB Atlas API
  const fetchBusinesses = () => {
    setLoading(true);
    let url = '/businesses';
    if (selectedCategory !== 'all') {
      url += `?category=${selectedCategory}`;
    }
    api
      .get(url)
      .then((res) => {
        setBusinesses(res.data.businesses || []);
      })
      .catch(() => {
        setBusinesses([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBusinesses();
  }, [selectedCategory]);

  const filteredBusinesses = businesses.filter((b) => {
    return (
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenBooking = (business) => {
    setSelectedBusiness(business);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Explore Services & Providers" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Discovery & Scheduling
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Find Local Providers & Schedule Appointments
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Discover verified clinics, salons, and offices with real-time slot availability.
              </p>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by clinic name, city, or service description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E3EAE5] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                >
                  <option value="all">All Service Categories</option>
                  <option value="clinic">Hospitals & Clinics</option>
                  <option value="salon">Salons & Spas</option>
                  <option value="bank">Banks & Finance</option>
                  <option value="service_center">Service Centers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Providers Grid */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] shadow-card text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
              <p className="text-xs text-[#66736B]">Loading verified service providers...</p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] shadow-card text-center space-y-3">
              <Building2 className="w-10 h-10 text-[#66736B] mx-auto" />
              <h3 className="font-bold text-base text-[#17231C]">No providers found</h3>
              <p className="text-xs text-[#66736B]">Try adjusting your search query or category filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBusinesses.map((b) => (
                <div
                  key={b._id}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold capitalize text-[#11643A] bg-[#EAF6EE] px-2.5 py-0.5 rounded-md">
                            {b.category}
                          </span>
                          <span className="text-xs font-semibold text-[#16834A] flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#17231C] mt-1">{b.name}</h3>
                        <p className="text-xs text-[#66736B] flex items-center space-x-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#16834A]" />
                          <span>{b.address?.city || 'Downtown'}, {b.address?.state || 'NY'}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        {b.isBookingsOpen === false ? (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-block">
                            Bookings Closed
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#16834A] bg-[#EAF6EE] px-2.5 py-0.5 rounded-full inline-block">
                            Bookings Open
                          </span>
                        )}
                        <span className="text-[11px] text-[#66736B] font-mono block mt-1">{b.timezone || 'America/New_York'}</span>
                      </div>
                    </div>

                    {b.isBookingsOpen === false && b.closureReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                        <strong>Notice:</strong> {b.closureReason}
                      </div>
                    )}

                    <p className="text-xs text-[#66736B] leading-relaxed line-clamp-2">
                      {b.description || 'Verified service facility with automated queue ticketing and appointment management.'}
                    </p>

                    {b.contactPhone && (
                      <p className="text-xs text-[#17231C] font-semibold">
                        Tel: <span className="text-[#66736B] font-normal">{b.contactPhone}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#E3EAE5] flex items-center justify-between">
                    <Link to="/customer/appointments">
                      <Button variant="outline" size="sm">
                        My Bookings
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenBooking(b)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Book Appointment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Booking Modal */}
      {selectedBusiness && (
        <BookAppointmentModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          business={selectedBusiness}
        />
      )}
    </div>
  );
}
