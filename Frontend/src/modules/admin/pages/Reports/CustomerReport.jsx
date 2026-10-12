import React, { useState, useEffect } from 'react';
import { FiUsers, FiUserCheck, FiTrendingUp } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const CustomerReport = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminReportService.getCustomerReport();
        if (res.success) setData(res.data);
      } catch {
        toast.error('Failed to load customer report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-gray-500 p-6">No customer data available.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <CardShell className="bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><FiUsers /> Total Customers</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{data.totalUsers}</p>
        </CardShell>
        <CardShell className="bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><FiUserCheck /> Total Bookings</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{data.totalBookings}</p>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell className="bg-white p-4">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2"><FiTrendingUp /> Top 10 Customers by Bookings</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topUsers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} width={100} />
                <Tooltip formatter={(v, n) => (n === 'Spent' ? `₹${v}` : v)} />
                <Bar dataKey="bookingCount" name="Bookings" fill="#2874F0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <div className="space-y-6">
          <CardShell className="bg-white p-4">
            <h3 className="text-base font-bold mb-4">Verification Status</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.verificationStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="_id">
                    {data.verificationStatus.map((entry, i) => <Cell key={entry._id} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardShell>

          <CardShell className="bg-white p-4">
            <h3 className="text-base font-bold mb-4">New Customers per Month</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" name="Customers" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
};

export default CustomerReport;
