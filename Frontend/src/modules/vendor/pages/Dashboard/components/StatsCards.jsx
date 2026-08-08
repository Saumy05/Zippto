import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiBriefcase, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../../theme';

const StatsCards = memo(({ stats }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Today's Earnings",
      value: `₹${stats.todayEarnings.toLocaleString()}`,
      subtitle: 'Daily net revenue',
      icon: FaWallet,
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
      badgeBg: 'bg-teal-50/80 text-teal-700',
      onClick: () => navigate('/vendor/wallet')
    },
    {
      title: 'Pending Alerts',
      value: stats.pendingAlerts,
      subtitle: stats.pendingAlerts > 0 ? 'Requires attention' : 'All caught up',
      icon: FiClock,
      iconBg: stats.pendingAlerts > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200/60' : 'bg-slate-50 text-slate-600 border border-slate-200/60',
      badgeBg: stats.pendingAlerts > 0 ? 'bg-amber-100/80 text-amber-800 font-bold' : 'bg-slate-100 text-slate-600',
      onClick: () => navigate('/vendor/booking-alerts')
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs,
      subtitle: 'Currently in progress',
      icon: FiBriefcase,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      badgeBg: 'bg-indigo-50/80 text-indigo-700',
      onClick: () => navigate('/vendor/jobs')
    },
    {
      title: 'Completed Jobs',
      value: stats.completedJobs,
      subtitle: 'Total fulfilled',
      icon: FiCheckCircle,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      badgeBg: 'bg-emerald-50/80 text-emerald-700',
      onClick: () => navigate('/vendor/jobs')
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {cards.map((card, index) => {
          const IconComponent = card.icon;

          return (
            <div
              key={index}
              onClick={card.onClick}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl ${card.iconBg} transition-transform group-hover:scale-105`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
                  {card.value}
                </p>
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md ${card.badgeBg}`}>
                  {card.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StatsCards.displayName = 'VendorStatsCards';

export default StatsCards;
