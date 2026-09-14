import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { gsap } from 'gsap';
import { themeColors } from '../../../../theme';
import api from '../../../../services/api';

const NotificationBell = ({ notificationCount = 0, size = 'sm' }) => {
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const bellButtonRef = useRef(null);
  const [count, setCount] = useState(notificationCount);

  // Sizing definitions: 'sm' (default 34px, ideal for top headers), 'md' (40px)
  const isMd = size === 'md';
  const bellDim = isMd ? 40 : 34;
  const iconSizeClass = isMd ? 'w-5 h-5' : 'w-4 h-4';
  const badgeSize = isMd ? 18 : 16;
  const badgeFont = isMd ? 'text-[10px]' : 'text-[9px]';

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count on mount
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (!token) return; // Not logged in, count 0

        const res = await api.get('/notifications/user');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail (e.g. 401 not logged in)
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={bellButtonRef}
      className="relative rounded-full cursor-pointer group active:scale-95 transition-transform duration-300 z-50 shrink-0"
      style={{
        width: `${bellDim}px`,
        height: `${bellDim}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1px'
      }}
      onClick={(e) => {
        e.stopPropagation();
        navigate('/user/notifications');
      }}
      onMouseEnter={() => {
        if (bellButtonRef.current && bellRef.current) {
          const btn = bellButtonRef.current.querySelector('button');
          gsap.to(bellButtonRef.current, { scale: 1.06, duration: 0.25, ease: 'power2.out' });
          if (btn) {
            gsap.to(btn, {
              boxShadow: count > 0
                ? '0 4px 14px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                : `0 3px 10px ${themeColors.brand.teal}35`,
              duration: 0.25,
              ease: 'power2.out',
            });
          }
          gsap.to(bellRef.current, { rotation: 12, scale: 1.08, duration: 0.25, ease: 'power2.out' });
        }
      }}
      onMouseLeave={() => {
        if (bellButtonRef.current && bellRef.current) {
          const btn = bellButtonRef.current.querySelector('button');
          gsap.to(bellButtonRef.current, { scale: 1.0, duration: 0.25, ease: 'power2.out' });
          if (btn) {
            gsap.to(btn, {
              boxShadow: count > 0
                ? '0 2px 8px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                : `0 1px 4px ${themeColors.brand.teal}20`,
              duration: 0.25,
              ease: 'power2.out',
            });
          }
          gsap.to(bellRef.current, { rotation: 0, scale: 1.0, duration: 0.25, ease: 'power2.out' });
        }
      }}
    >
      {/* 1. Gradient Border */}
      <div
        className="absolute inset-[-1.5px] rounded-full z-0"
        style={{
          background: themeColors.brand.conic,
          boxShadow: `0 0 5px ${themeColors.brand.orange}20`
        }}
      />

      {/* 2. White Mask */}
      <div className="absolute inset-[1px] rounded-full bg-white z-0" />

      {/* 3. Inner Button */}
      <button
        className="relative z-10 w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: count > 0
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(52, 121, 137, 0.08) 0%, rgba(187, 95, 54, 0.08) 100%)',
          boxShadow: count > 0
            ? '0 2px 8px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            : '0 1px 4px rgba(52, 121, 137, 0.12)',
        }}
      >
        <svg width="0" height="0" className="absolute">
          <linearGradient id="homestr-bell-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={themeColors.brand.teal} />
            <stop offset="50%" stopColor={themeColors.brand.yellow} />
            <stop offset="100%" stopColor={themeColors.brand.orange} />
          </linearGradient>
        </svg>

        <FiBell
          ref={bellRef}
          className={`${iconSizeClass} transition-all duration-300`}
          style={{
            stroke: count > 0 ? '#EF4444' : 'url(#homestr-bell-gradient)',
            strokeWidth: '2.2',
            color: 'transparent',
            filter: count > 0
              ? 'drop-shadow(0 1px 4px rgba(239, 68, 68, 0.35))'
              : 'drop-shadow(0 1px 2px rgba(52, 121, 137, 0.25))',
          }}
        />
      </button>

      {/* 4. Active Badge */}
      {count > 0 && (
        <span
          className={`absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white ${badgeFont} font-bold rounded-full flex items-center justify-center z-20`}
          style={{
            minWidth: `${badgeSize}px`,
            height: `${badgeSize}px`,
            padding: '0 3px',
            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4), 0 0 0 1.5px #fff',
            border: '1.5px solid #fff',
            lineHeight: 1
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;
