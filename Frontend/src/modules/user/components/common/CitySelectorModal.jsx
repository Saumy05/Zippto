import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiLocationMarker, HiSearch, HiHome, HiBriefcase } from 'react-icons/hi';
import { useJsApiLoader } from '@react-google-maps/api';
import { useCity } from '../../../../context/CityContext';
import flutterBridge from '../../../../utils/flutterBridge';
import { userAuthService } from '../../../../services/authService';

// Must match the libraries used by every other useJsApiLoader call (same loader id).
const libraries = ['places', 'geometry'];

const sameCity = (a, b) => {
  const x = String(a || '').trim().toLowerCase();
  const y = String(b || '').trim().toLowerCase();
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

const component = (result, type) =>
  result.address_components?.find((c) => c.types.includes(type))?.long_name || '';

/** Turn a Google geocoder result into { address, city, latitude, longitude } */
const parseGeocode = (result) => {
  const area =
    component(result, 'sublocality_level_1') || component(result, 'neighborhood') || component(result, 'locality');
  const city = component(result, 'locality') || component(result, 'administrative_area_level_2');
  const state = component(result, 'administrative_area_level_1');
  const loc = result.geometry?.location;
  return {
    address: [area, city, state].filter(Boolean).join(', '),
    city,
    latitude: typeof loc?.lat === 'function' ? loc.lat() : loc?.lat,
    longitude: typeof loc?.lng === 'function' ? loc.lng() : loc?.lng
  };
};

const CitySelectorModal = ({ isOpen, onClose }) => {
  const { cities, selectCity } = useCity();
  const modalRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
    language: localStorage.getItem('zippto_language') || 'en'
  });

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'error' | 'info', text }
  const [savedAddresses, setSavedAddresses] = useState([]);

  // The user's saved addresses (from Manage Addresses): choosing one needs no search and no Maps call
  useEffect(() => {
    if (!isOpen || !localStorage.getItem('accessToken')) return undefined;
    let cancelled = false;
    userAuthService.getProfile()
      .then((res) => {
        if (!cancelled && res?.success) setSavedAddresses(res.user?.addresses || []);
      })
      .catch(() => { /* not logged in / offline: just hide the list */ });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      setQuery('');
      setPredictions([]);
      setNotice(null);
      setDetecting(false);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Lock page scroll while the sheet is open (html AND body: both are scroll containers in this app)
  useEffect(() => {
    if (!isOpen) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
    };
  }, [isOpen]);

  // Debounced place suggestions. Google Places autocomplete.
  useEffect(() => {
    const text = query.trim();
    if (!isOpen || text.length < 2) {
      setPredictions([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (!isLoaded || !window.google?.maps?.places) {
        setPredictions([]);
        setSearching(false);
        return;
      }
      new window.google.maps.places.AutocompleteService().getPlacePredictions(
        { input: text, componentRestrictions: { country: 'in' }, types: ['geocode'] },
        (results, status) => {
          if (controller.signal.aborted) return;
          setSearching(false);
          if (status === 'OK' && results?.length) {
            setPredictions(
              results.slice(0, 6).map((p) => ({
                id: p.place_id,
                main: p.structured_formatting?.main_text || p.description,
                secondary: p.structured_formatting?.secondary_text || '',
                googlePlaceId: p.place_id,
                description: p.description
              }))
            );
          } else {
            setPredictions([]);
          }
        }
      );
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen, isLoaded]);

  /** Persist the chosen place, then switch to the matching service city (or explain we're not there yet). */
  const applyPlace = useCallback(
    ({ address, city, latitude, longitude }) => {
      try {
        if (latitude != null && longitude != null) {
          localStorage.setItem('userCoords', JSON.stringify({ latitude, longitude }));
        }
        if (address) localStorage.setItem('currentAddress', address);
        if (city) localStorage.setItem('currentCity', city);
      } catch (e) { /* storage unavailable */ }

      window.dispatchEvent(new CustomEvent('userLocationDetected', { detail: { address, city, latitude, longitude } }));

      const match = cities.find((c) => sameCity(c.name, city));
      if (match) {
        selectCity(match);
        onClose();
        return;
      }
      setNotice({
        type: 'info',
        text: city
          ? `We're not available in ${city} yet. Please pick one of the cities we serve below.`
          : "We couldn't work out the city for that place. Please pick one of the cities below."
      });
    },
    [cities, selectCity, onClose]
  );

  const handlePredictionSelect = (prediction) => {
    setNotice(null);
    setPredictions([]);
    setQuery(prediction.description || [prediction.main, prediction.secondary].filter(Boolean).join(', '));

    new window.google.maps.Geocoder().geocode({ placeId: prediction.googlePlaceId }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        applyPlace(parseGeocode(results[0]));
      } else {
        setNotice({ type: 'error', text: "Couldn't load that place. Please try another search." });
      }
    });
  };

  const reverseGeocode = ({ latitude, longitude }) =>
    new Promise((resolve) => {
      if (!isLoaded || !window.google?.maps?.Geocoder) {
        resolve(null);
        return;
      }
      new window.google.maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
        resolve(status === 'OK' && results?.[0] ? parseGeocode(results[0]) : null);
      });
    });

  const handleSavedAddressSelect = (a) => {
    setNotice(null);
    applyPlace({
      address: [a.addressLine1, a.city].filter(Boolean).join(', '),
      city: a.city,
      latitude: a.lat,
      longitude: a.lng
    });
  };

  const handleUseCurrentLocation = async () => {
    setNotice(null);
    setDetecting(true);
    try {
      const coords = await flutterBridge.getCurrentLocation();
      const place = await reverseGeocode(coords);
      if (!place || !place.city) {
        setNotice({
          type: 'error',
          text: "We got your location but couldn't turn it into a city. Please search for your area above."
        });
        return;
      }
      applyPlace(place);
    } catch (err) {
      const code = err?.code;
      setNotice({
        type: 'error',
        text:
          code === 1
            ? 'Location permission is blocked. Allow it in your browser settings, or search for your area above.'
            : code === 2
              ? 'Your device could not find your location. Turn on GPS/Wi-Fi, or search for your area above.'
              : code === 3
                ? 'Finding your location took too long. Please try again or search for your area above.'
                : "Couldn't get your location. Please search for your area above."
      });
    } finally {
      setDetecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] touch-none"
            onWheel={(e) => e.preventDefault()}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
          >
            <div
              ref={modalRef}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Choose your location</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Search your area or use your current location</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto overscroll-contain p-3 flex-1">
                {/* Search */}
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setNotice(null);
                    }}
                    placeholder="Search area, locality or city"
                    autoComplete="off"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* Suggestions */}
                {query.trim().length >= 2 && (
                  <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                    {predictions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePredictionSelect(p)}
                        className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                      >
                        <HiLocationMarker className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-800 truncate">
                            {p.main}
                          </span>
                          <span className="block text-xs text-gray-400 truncate">
                            {p.secondary}
                          </span>
                        </span>
                      </button>
                    ))}
                    {predictions.length === 0 && (
                      <p className="px-3 py-3 text-xs text-gray-400">
                        {searching ? 'Searching…' : 'No places found. Try a different search.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Saved addresses (hidden while searching) */}
                {savedAddresses.length > 0 && query.trim().length < 2 && (
                  <div className="mt-3">
                    <p className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Saved addresses</p>
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {savedAddresses.map((a) => {
                        const Icon = a.type === 'work' ? HiBriefcase : a.type === 'other' ? HiLocationMarker : HiHome;
                        return (
                          <button
                            key={a._id || a.id || `${a.addressLine1}|${a.addressLine2 || ''}`}
                            type="button"
                            onClick={() => handleSavedAddressSelect(a)}
                            className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                          >
                            <Icon className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-800 capitalize">{a.type || 'home'}</span>
                                {a.isDefault && (
                                  <span className="px-1.5 py-px rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">Default</span>
                                )}
                              </span>
                              <span className="block text-xs text-gray-500 truncate">
                                {a.addressLine2 ? `${a.addressLine2}, ` : ''}{a.addressLine1}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Current location */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={detecting}
                  className="w-full mt-3 p-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 transition-colors disabled:opacity-60"
                >
                  <HiLocationMarker className="w-5 h-5 shrink-0" />
                  <span className="text-left">{detecting ? 'Detecting your location…' : 'Use my current location'}</span>
                </button>

                {notice && (
                  <p
                    className={`mt-2 px-3 py-2 rounded-lg text-xs leading-snug ${
                      notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {notice.text}
                  </p>
                )}

                {cities.length === 0 && (
                  <div className="text-center py-6 mt-2 text-gray-400">
                    <p className="font-semibold text-gray-500">We're not live in any city yet.</p>
                    <p className="text-xs mt-1">Please check back soon.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CitySelectorModal;
