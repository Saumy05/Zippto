import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '../services/notificationService';

/**
 * Hook to retrieve and reactively synchronize unread user notification count.
 * Keeps header bells, notifications drawers, and app badges unified across routes.
 */
export const useUserNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
        : null;

      if (!token) {
        setUnreadCount(0);
        return;
      }

      const count = await getUnreadCount();
      setUnreadCount(Math.max(0, Number(count) || 0));
    } catch (e) {
      // In case of error (network failure / 401), keep previous count or fallback
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const safeRefresh = async () => {
      if (!cancelled) {
        await refreshUnread();
      }
    };

    safeRefresh();

    // Check periodically in the background (every 30 seconds)
    const interval = setInterval(safeRefresh, 30000);

    const handleLoggedOut = () => {
      if (!cancelled) setUnreadCount(0);
    };

    window.addEventListener('userNotificationsChanged', safeRefresh);
    window.addEventListener('userNotificationsUpdated', safeRefresh);
    window.addEventListener('userLoggedIn', safeRefresh);
    window.addEventListener('userLoggedOut', handleLoggedOut);
    window.addEventListener('focus', safeRefresh);
    window.addEventListener('storage', safeRefresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('userNotificationsChanged', safeRefresh);
      window.removeEventListener('userNotificationsUpdated', safeRefresh);
      window.removeEventListener('userLoggedIn', safeRefresh);
      window.removeEventListener('userLoggedOut', handleLoggedOut);
      window.removeEventListener('focus', safeRefresh);
      window.removeEventListener('storage', safeRefresh);
    };
  }, [refreshUnread]);

  return { unreadCount, refreshUnread };
};

export default useUserNotificationCount;

