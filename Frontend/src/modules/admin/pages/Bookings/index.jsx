import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCalendar, FiDownload, FiUserCheck,
  FiClock, FiCheckCircle, FiBox, FiTruck, FiXCircle, FiRefreshCw, FiShoppingBag,
  FiX, FiAlertTriangle, FiPhone, FiStar, FiMapPin, FiUser
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminBookingService } from '../../../../services/adminBookingService';
import { getDashboardStats } from '../../../../services/adminDashboardService';

const BookingStatsCard = ({ title, count, icon: Icon, colorClass, bgClass }) => (
  <div className={`p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between ${bgClass}`}>
    <div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${colorClass.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{count}</p>
    </div>
    <div className={`w-12 h-12 rounded-full opacity-10 -mr-3 -mb-3 ${colorClass.replace('text-', 'bg-')}`}></div>
  </div>
);

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    total: 0
  });

  // Assign Vendor Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);
  const [availableVendors, setAvailableVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [assigningVendorId, setAssigningVendorId] = useState(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        startDate,
        endDate
      };
      if (statusFilter !== 'All Status') {
        params.status = statusFilter.toLowerCase().replace(' ', '_');
      }

      const res = await adminBookingService.getAllBookings(params);
      if (res.success) {
        setBookings(res.data);
        setTotalPages(res.pagination.pages);
      }

      if (stats.total === 0) {
        const statsRes = await getDashboardStats();
        if (statsRes.success) {
          const s = statsRes.data.stats;
          setStats({
            pending: s.pendingBookings || 0,
            confirmed: 0,
            inProgress: 0,
            completed: s.completedBookings || 0,
            cancelled: s.cancelledBookings || 0,
            total: s.totalBookings || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, statusFilter, startDate, endDate]);

  // Listen for live socket updates to refresh table
  useEffect(() => {
    const handleLiveUpdate = () => {
      fetchData();
    };
    window.addEventListener('adminBookingsUpdated', handleLiveUpdate);
    window.addEventListener('adminBookingAlert', handleLiveUpdate);

    return () => {
      window.removeEventListener('adminBookingsUpdated', handleLiveUpdate);
      window.removeEventListener('adminBookingAlert', handleLiveUpdate);
    };
  }, [page, debouncedSearch, statusFilter]);

  const handleOpenAssignModal = async (booking) => {
    setSelectedBookingForAssign(booking);
    setAssignModalOpen(true);
    setVendorSearch('');
    try {
      setLoadingVendors(true);
      const res = await adminBookingService.getAvailableVendors(booking._id);
      if (res.success) {
        setAvailableVendors(res.vendors || []);
      }
    } catch (err) {
      console.error('Failed to load available vendors:', err);
      toast.error('Failed to load available vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleAssignVendor = async (vendorId) => {
    if (!selectedBookingForAssign) return;
    try {
      setAssigningVendorId(vendorId);
      const res = await adminBookingService.assignVendor(selectedBookingForAssign._id, {
        vendorId,
        notes: 'Assigned manually by Admin'
      });

      if (res.success) {
        toast.success(res.message || 'Vendor assigned successfully!');
        setAssignModalOpen(false);
        fetchData();
      } else {
        toast.error(res.message || 'Failed to assign vendor');
      }
    } catch (err) {
      console.error('Error assigning vendor:', err);
      toast.error(err.message || 'Failed to assign vendor');
    } finally {
      setAssigningVendorId(null);
    }
  };

  const filteredVendors = availableVendors.filter(v => {
    if (!vendorSearch.trim()) return true;
    const q = vendorSearch.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.businessName && v.businessName.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q))
    );
  });

  const handleExport = () => {
    const headers = ['Order ID', 'Customer', 'Service', 'Total', 'Status', 'Date'];
    const rows = bookings.map(b => [
      b.bookingNumber,
      b.userId?.name || b.customerName || 'Unknown',
      b.serviceName || b.serviceId?.title || 'Service',
      b.finalAmount,
      b.status,
      new Date(b.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bookings.csv");
    document.body.appendChild(link);
    link.click();
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">Cancelled</span>;
      case 'in_progress':
      case 'started':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">In Progress</span>;
      case 'accepted':
      case 'assigned':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">Partner Assigned</span>;
      case 'no_vendors':
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500 text-white animate-pulse shadow-xs">🚨 Needs Vendor</span>;
      case 'searching':
      case 'requested':
      case 'pending':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">Searching</span>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BookingStatsCard title="Awaiting" count={stats.pending} icon={FiClock} bgClass="bg-yellow-50" colorClass="text-yellow-600" />
        <BookingStatsCard title="Confirmed" count={stats.pending} icon={FiCheckCircle} bgClass="bg-blue-50" colorClass="text-blue-600" />
        <BookingStatsCard title="In Progress" count={stats.inProgress} icon={FiBox} bgClass="bg-purple-50" colorClass="text-purple-600" />
        <BookingStatsCard title="Completed" count={stats.completed} icon={FiTruck} bgClass="bg-green-50" colorClass="text-green-600" />
        <BookingStatsCard title="Delivered" count={stats.completed} icon={FiCheckCircle} bgClass="bg-emerald-50" colorClass="text-emerald-600" />
        <BookingStatsCard title="Cancelled" count={stats.cancelled} icon={FiXCircle} bgClass="bg-red-50" colorClass="text-red-600" />
        <BookingStatsCard title="Returned" count={0} icon={FiRefreshCw} bgClass="bg-orange-50" colorClass="text-orange-600" />
        <BookingStatsCard title="Total Orders" count={stats.total} icon={FiShoppingBag} bgClass="bg-gray-50" colorClass="text-gray-600" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3 justify-between items-center">
        <div className="relative w-full lg:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, customer, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-green-500 cursor-pointer"
          >
            <option>All Status</option>
            <option value="pending">Pending</option>
            <option value="searching">Searching</option>
            <option value="no_vendors">Needs Vendor (Rejected/Timeout)</option>
            <option value="accepted">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            <FiCalendar className="text-gray-400 w-3.5 h-3.5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] text-gray-600 focus:outline-none w-20"
            />
            <span className="text-gray-400 text-[10px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] text-gray-600 focus:outline-none w-20"
            />
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shadow-green-200 cursor-pointer"
          >
            <FiDownload className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total (₹)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-gray-500">Loading bookings...</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-gray-500">No bookings found</td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const needsAssignment = ['no_vendors', 'rejected', 'searching', 'pending', 'requested'].includes(booking.status);

                  return (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 text-xs">#{booking.bookingNumber || booking._id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{booking.userId?.name || booking.customerName || 'Guest'}</p>
                          <p className="text-[10px] text-gray-400">{booking.userId?.phone || booking.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 text-xs font-bold">
                          {booking.serviceName || booking.serviceId?.title || 'Service'}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {booking.serviceCategory || booking.categoryId?.title || 'General'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {booking.vendorId ? (
                          <div>
                            <p className="font-bold text-teal-700 text-xs">{booking.vendorId?.name || booking.vendorId?.businessName || 'Assigned'}</p>
                            <p className="text-[10px] text-gray-400">{booking.vendorId?.phone}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 text-xs">₹{booking.finalAmount?.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-gray-600 font-medium">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {needsAssignment && (
                            <button
                              onClick={() => handleOpenAssignModal(booking)}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                              title="Manually Assign Service Partner"
                            >
                              <FiUserCheck className="w-3.5 h-3.5" />
                              <span>Assign Partner</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && bookings.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Showing {bookings.length} of {stats.total} entries</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Vendor Assignment Modal */}
      <AnimatePresence>
        {assignModalOpen && selectedBookingForAssign && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssignModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col relative z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <FiUserCheck className="text-teal-600 w-5 h-5" />
                    Assign Service Partner
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Booking #{selectedBookingForAssign.bookingNumber} • {selectedBookingForAssign.serviceName || selectedBookingForAssign.serviceId?.title}
                  </p>
                </div>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="p-2 rounded-xl bg-gray-200/70 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Booking Context Banner */}
              <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-900">Customer: </span>
                  <span className="text-amber-800">{selectedBookingForAssign.userId?.name || selectedBookingForAssign.customerName || 'Guest'} ({selectedBookingForAssign.userId?.phone || selectedBookingForAssign.customerPhone})</span>
                </div>
                <div className="font-bold text-amber-900">
                  ₹{selectedBookingForAssign.finalAmount?.toLocaleString()}
                </div>
              </div>

              {/* Vendor Search Input */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search available partners by name or phone..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              {/* Vendors List Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loadingVendors ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Finding matching partners...
                  </div>
                ) : filteredVendors.length === 0 ? (
                  <div className="py-12 text-center">
                    <FiAlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-gray-700">No matching partners found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try searching with a different name or phone number</p>
                  </div>
                ) : (
                  filteredVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="p-3 rounded-2xl border border-gray-200/80 hover:border-teal-400 bg-white hover:shadow-xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Profile Photo / Avatar */}
                        <div className="relative w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                          {vendor.profilePhoto ? (
                            <img src={vendor.profilePhoto} alt={vendor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{vendor.name.charAt(0).toUpperCase()}</span>
                          )}
                          {vendor.isOnline && (
                            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                          )}
                        </div>

                        {/* Vendor Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{vendor.name}</h4>
                            {vendor.matchesCategory && (
                              <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 font-black text-[9px] rounded-md border border-teal-200">
                                Match
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{vendor.businessName || vendor.phone}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <FiStar className="w-3 h-3 fill-amber-400" /> {vendor.rating || '4.8'}
                            </span>
                            <span>•</span>
                            <span>{vendor.totalJobs || 0} jobs</span>
                            {vendor.city && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5"><FiMapPin className="w-2.5 h-2.5" /> {vendor.city}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleAssignVendor(vendor.id)}
                        disabled={assigningVendorId === vendor.id}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {assigningVendorId === vendor.id ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Bookings;
