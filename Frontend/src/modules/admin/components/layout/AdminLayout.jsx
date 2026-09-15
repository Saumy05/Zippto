import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminBottomNav from './AdminBottomNav';
import useAdminHeaderHeight from '../../hooks/useAdminHeaderHeight';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const headerHeight = useAdminHeaderHeight();
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  // Bottom nav height is 64px (h-16) on mobile
  const bottomNavHeight = 64;
  // Match content padding with layout spacing: mobile p-3 (12px), tablet sm:p-4 (16px), desktop lg:p-6 (24px)
  const contentGap = isDesktop ? 24 : isTablet ? 16 : 12;
  const topPadding = headerHeight + contentGap;
  const bottomPadding = bottomNavHeight + 12;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - No transition-all on layout container to eliminate jitter */}
      <div className="flex-1 flex flex-col lg:ml-[260px] min-w-0 max-w-full overflow-x-hidden">
        {/* Header */}
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content - responsive clearance for fixed header and bottom nav */}
        <main
          className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden pt-[84px] sm:pt-[112px] lg:pt-[120px] lg:pb-6 scrollbar-admin w-full min-w-0"
          style={{
            paddingTop: `${topPadding}px`,
            paddingBottom: !isDesktop
              ? `calc(${bottomPadding}px + env(safe-area-inset-bottom, 0px))`
              : undefined,
          }}
        >
          <div className="w-full max-w-full overflow-x-hidden min-w-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout;


