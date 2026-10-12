// Location Permission Checker Component for Zippto
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import flutterBridge from '../../utils/flutterBridge';
import { detectAndStoreAddress } from '../../utils/detectAddress';
import LocationAccessModal from './LocationAccessModal';

// Location is only needed in the customer and partner apps (not admin / marketing pages).
const getScope = (pathname) => {
    if (pathname.startsWith('/vendor')) return 'vendor';
    if (pathname === '/' || pathname.startsWith('/user')) return 'user';
    return null;
};

const SESSION_KEY = 'location_prompt_checked';

const getPermissionState = async () => {
    try {
        if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            return status.state; // 'granted' | 'prompt' | 'denied'
        }
    } catch (e) { /* Permissions API not supported (older Safari / some WebViews) */ }
    return 'unknown';
};

export const LocationPermissionChecker = () => {
    const { pathname } = useLocation();
    const scope = getScope(pathname);
    const [modal, setModal] = useState({ open: false, locationDisabled: false });
    const startedRef = useRef(false);

    const applyLocation = useCallback(async (location) => {
        localStorage.setItem('location_granted', 'true');
        window.dispatchEvent(new CustomEvent('locationUpdate', { detail: location }));
        // Fire-and-forget: turns coordinates into the address shown in the app header
        detectAndStoreAddress(location);
    }, []);

    const checkPermission = useCallback(async ({ manual = false } = {}) => {
        const state = await getPermissionState();

        // Browser says the user already blocked location: a native prompt can't appear again,
        // so explain how to enable it instead of failing silently.
        if (state === 'denied') {
            setModal({ open: true, locationDisabled: false });
            return;
        }

        try {
            // 'prompt' state: this call triggers the browser / WebView permission dialog.
            const location = await flutterBridge.getCurrentLocation();
            await applyLocation(location);
        } catch (err) {
            // 1 = permission denied, 2 = position unavailable (GPS off), 3 = timeout
            if (err?.code === 1) {
                setModal({ open: true, locationDisabled: false });
            } else if (err?.code === 2) {
                setModal({ open: true, locationDisabled: true });
            } else if (manual) {
                setModal({ open: true, locationDisabled: false });
            }
        }
    }, [applyLocation]);

    // Ask once per session, the first time the user lands in the customer/partner app.
    useEffect(() => {
        if (!scope || startedRef.current) return undefined;
        try {
            if (sessionStorage.getItem(SESSION_KEY) === 'true') return undefined;
        } catch (e) { /* ignore */ }

        startedRef.current = true;
        // Delay so the Flutter WebView bridge is ready
        const timer = setTimeout(() => {
            try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (e) { /* ignore */ }
            checkPermission();
        }, 1500);
        return () => {
            clearTimeout(timer);
            // StrictMode re-mount: allow the effect to schedule again
            startedRef.current = false;
        };
    }, [scope, checkPermission]);

    // Global listener for manual triggers (see utils/locationTrigger.js)
    useEffect(() => {
        const handleManualTrigger = () => checkPermission({ manual: true });
        window.addEventListener('requestLocationPrompt', handleManualTrigger);
        return () => window.removeEventListener('requestLocationPrompt', handleManualTrigger);
    }, [checkPermission]);

    return (
        <LocationAccessModal
            isOpen={modal.open}
            initialLocationDisabled={modal.locationDisabled}
            userType={scope === 'vendor' ? 'vendor' : 'user'}
            onClose={() => setModal((m) => ({ ...m, open: false }))}
            onSuccess={applyLocation}
        />
    );
};
