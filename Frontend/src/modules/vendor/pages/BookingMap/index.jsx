// BookingMap component for tracking vendor journey and arrival verification
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, OverlayView, PolylineF } from '@react-google-maps/api';
import { FiArrowLeft, FiNavigation, FiMapPin, FiCrosshair, FiPhone, FiClock, FiCheckCircle, FiX, FiMaximize, FiMinimize, FiWifiOff, FiAlertTriangle, FiRefreshCw, FiUser, FiCopy, FiCheck, FiPlus, FiMinus, FiCornerUpRight, FiCornerUpLeft, FiArrowUp, FiCompass, FiVolume2, FiVolumeX, FiSearch } from 'react-icons/fi';
import { FaMotorcycle } from 'react-icons/fa';
import { getBookingById, verifySelfVisit } from '../../services/bookingService';
import VisitVerificationModal from '../../components/common/VisitVerificationModal';
import vendorService from '../../../../services/vendorService';
import { toast } from 'react-hot-toast';
import { useAppNotifications } from '../../../../hooks/useAppNotifications';

// Simple toggle for the simulation button (Controlled via .env)
// High-Detail Google Maps Driving Navigation Style (Visible Building Blocks, Clear Road Network, Direction Contrast)
const mapStyles = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f3f6f9" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#ffffff" }, { "weight": 3 }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#edf1f5" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#cbd5e1" }, { "weight": 1.2 }]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#eaedf2" }]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#c4ced9" }, { "weight": 1.2 }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#f3f6f9" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#eaedf2" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#c4ced9" }, { "weight": 1 }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#dcfce7" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#94a9be" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#788ea3" }, { "weight": 1.5 }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#839bb2" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#677e93" }, { "weight": 2 }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#94a9be" }]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#9cb0c3" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#bae6fd" }]
  }
];

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const libraries = ['places', 'geometry'];

const BookingMap = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [map, setMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [routePath, setRoutePath] = useState([]);
  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState('--');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    language: localStorage.getItem('zippto_language') || 'en'
  });

  const socket = useAppNotifications('vendor');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await getBookingById(id);
        const data = response.data || response;
        setBooking(data);

        // 1. Destination: Fixed Booking Address from DB
        const bAddr = data.address || {};

        if (bAddr.lat && bAddr.lng) {
          setCoords({ lat: parseFloat(bAddr.lat), lng: parseFloat(bAddr.lng) });
        } else {
          const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr.addressLine1 || ''}, ${bAddr.city || ''}, ${bAddr.state || ''} ${bAddr.pincode || ''}`;
          if (addressStr.replaceAll(',', '').trim() && !addressStr.toLowerCase().includes('current location')) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: addressStr }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setCoords(results[0].geometry.location.toJSON());
              }
            });
          }
        }

      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded) fetchBooking();
  }, [id, isLoaded]);

  // Real-Time GPS Tracking based on Vendor's Physical Movement
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading: gpsHeading, speed: gpsSpeed } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        setCurrentLocation(newPos);

        // Update real-time speed in km/h
        if (gpsSpeed !== null && !isNaN(gpsSpeed) && gpsSpeed > 0) {
          setSpeed(Math.round(gpsSpeed * 3.6));
        } else {
          setSpeed('--');
        }

        // Update heading if provided by device compass/GPS
        if (gpsHeading !== null && !isNaN(gpsHeading)) {
          setHeading(gpsHeading);
        }

        // Live broadcast location to customer tracker via socket
        if (socket && id) {
          socket.emit('update_location', {
            bookingId: id,
            lat: latitude,
            lng: longitude,
            heading: (gpsHeading !== null && !isNaN(gpsHeading)) ? gpsHeading : heading,
            speed: (gpsSpeed !== null && !isNaN(gpsSpeed)) ? Math.round(gpsSpeed * 3.6) : 0
          });
        }
      },
      (error) => {
        console.warn("GPS Tracking notice:", error);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket, id, heading]);

  // Animated location for smooth marker interpolation
  const [animatedLocation, setAnimatedLocation] = useState(null);
  const targetLocationRef = useRef(null);
  const animatedLocationRef = useRef(null);
  const animationFrameRef = useRef(null);
  const prevLocationRef = useRef(null);
  const directionsCalculatedRef = useRef(false);
  const fullRoutePathRef = useRef([]);

  useEffect(() => {
    if (!currentLocation) return;

    targetLocationRef.current = currentLocation;

    if (!animatedLocationRef.current) {
      animatedLocationRef.current = currentLocation;
      setAnimatedLocation(currentLocation);
      return;
    }

    const animateToTarget = () => {
      const target = targetLocationRef.current;
      const current = animatedLocationRef.current;
      if (!target || !current) return;

      const latDiff = target.lat - current.lat;
      const lngDiff = target.lng - current.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance < 0.00001) {
        animatedLocationRef.current = target;
        setAnimatedLocation(target);
        return;
      }

      const lerpFactor = 0.15;
      const newLat = current.lat + latDiff * lerpFactor;
      const newLng = current.lng + lngDiff * lerpFactor;
      const newLocation = { lat: newLat, lng: newLng };

      animatedLocationRef.current = newLocation;
      setAnimatedLocation(newLocation);
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animateToTarget);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentLocation]);

  // Join tracking room on socket
  useEffect(() => {
    if (socket && id) {
      socket.emit('join_tracking', id);
    }
  }, [socket, id]);

  // Calculate Route ONCE on initial load only
  useEffect(() => {
    if (isLoaded && currentLocation && coords && map && !directionsCalculatedRef.current) {
      directionsCalculatedRef.current = true;

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: currentLocation,
          destination: coords,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            setRouteError(null);
            const leg = result.routes[0].legs[0];
            setDistance(leg.distance.text);
            setDuration(leg.duration.text);

            // Store full path and set initial state
            fullRoutePathRef.current = result.routes[0].overview_path;
            setRoutePath(result.routes[0].overview_path);

            // Zoom closely into vendor in 3D driving perspective mode (Google Maps style)
            map.setCenter(currentLocation);
            map.setZoom(18);
            map.setTilt(55);
            if (heading) map.setHeading(heading);
          } else {
            setRouteError('Could not calculate a driving route to this location.');
          }
        }
      );
    }
  }, [isLoaded, coords, map, currentLocation, heading]);

  // Update distance, ETA, and Clear Traveled Path as vendor moves
  useEffect(() => {
    if (isLoaded && currentLocation && coords && window.google && directionsCalculatedRef.current) {
      // 1. Calculate straight-line distance
      const riderPoint = new window.google.maps.LatLng(currentLocation);
      const destPoint = new window.google.maps.LatLng(coords);
      const distanceMeters = window.google.maps.geometry.spherical.computeDistanceBetween(riderPoint, destPoint);

      // Convert to km
      const distanceKm = distanceMeters / 1000;

      // Format distance
      if (distanceKm < 1) {
        setDistance(`${Math.round(distanceMeters)} m`);
      } else {
        setDistance(`${distanceKm.toFixed(1)} km`);
      }

      // Estimate time (assuming average speed of 30 km/h in city)
      const avgSpeedKmh = 30;
      const timeHours = distanceKm / avgSpeedKmh;
      const timeMinutes = Math.round(timeHours * 60);

      if (timeMinutes < 1) {
        setDuration('< 1 min');
      } else if (timeMinutes < 60) {
        setDuration(`${timeMinutes} min`);
      } else {
        const hours = Math.floor(timeMinutes / 60);
        const mins = timeMinutes % 60;
        setDuration(`${hours} hr ${mins} min`);
      }

      // 2. Clear Traveled Path Visualization
      if (fullRoutePathRef.current && fullRoutePathRef.current.length > 0) {
        let closestIndex = -1;
        let minDist = Infinity;

        fullRoutePathRef.current.forEach((p, idx) => {
          const d = window.google.maps.geometry.spherical.computeDistanceBetween(riderPoint, p);
          if (d < minDist) {
            minDist = d;
            closestIndex = idx;
          }
        });

        if (closestIndex !== -1) {
          const remaining = fullRoutePathRef.current.slice(closestIndex + 1);
          setRoutePath([currentLocation, ...remaining]);
        }
      }
    }
  }, [currentLocation, coords, isLoaded]);

  // Calculate Heading based on movement (Direction Sense)
  useEffect(() => {
    if (isLoaded && currentLocation && window.google) {
      if (prevLocationRef.current) {
        const start = new window.google.maps.LatLng(prevLocationRef.current);
        const end = new window.google.maps.LatLng(currentLocation);
        const distanceMoved = window.google.maps.geometry.spherical.computeDistanceBetween(start, end);

        // Update heading only if movement is significant (> 2 meters) to prevent jitter
        if (distanceMoved > 1) { // Reduced threshold
          const newHeading = window.google.maps.geometry.spherical.computeHeading(start, end);
          setHeading(newHeading);
        }
      } else if (directions?.routes?.[0]?.overview_path?.length > 1) {
        // Initial heading aligned precisely with first road segment of the route
        const path = directions.routes[0].overview_path;
        const start = path[0];
        const end = path[1];
        const routeHeading = window.google.maps.geometry.spherical.computeHeading(start, end);
        setHeading(routeHeading);
      } else if (coords) {
        // Fallback heading towards destination
        const start = new window.google.maps.LatLng(currentLocation);
        const end = new window.google.maps.LatLng(coords);
        setHeading(window.google.maps.geometry.spherical.computeHeading(start, end));
      }
      prevLocationRef.current = currentLocation;
    }
  }, [currentLocation, isLoaded, coords, directions]);

  // Sync Map Heading, Tilt & Zoom for Navigation Feel
  useEffect(() => {
    if (map && currentLocation && isAutoCenter) {
      map.panTo(currentLocation);
      map.setZoom(19); // Close-up 3D navigation zoom
      map.setTilt(55); // 3D driving perspective
      if (heading !== null && heading !== undefined) {
        map.setHeading(heading);
      }
    }
  }, [map, heading, isAutoCenter, currentLocation]);

  // Turn intersection coordinate for floating street badge
  const turnPoint = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps) return coords;
    const steps = directions.routes[0].legs[0].steps;
    if (steps.length > 0 && steps[0].end_location) {
      const loc = steps[0].end_location;
      return {
        lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
        lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng
      };
    }
    return coords;
  }, [directions, coords]);

  // Destination Marker
  const destinationMarker = useMemo(() => coords && (
    <OverlayView
      position={coords}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="relative -translate-x-1/2 -translate-y-[90%] pointer-events-none flex flex-col items-center">
        <FiMapPin className="w-10 h-10 text-red-600 drop-shadow-xl fill-red-600 stroke-white stroke-[1.5px]" />
        <div className="w-3 h-1 bg-black/20 rounded-full blur-[2px] mt-[-2px]"></div>
      </div>
    </OverlayView>
  ), [coords]);

  // Authentic Google Maps Navigation Vehicle (Blue Dot + White Ring + Forward Light Beam Cone)
  const riderMarker = useMemo(() => animatedLocation && (
    <OverlayView
      position={animatedLocation}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        style={{
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer'
        }}
        className="pointer-events-none flex items-center justify-center"
      >
        {/* Soft forward driving light cone pointing straight along the road */}
        <div className="absolute z-10 w-28 h-28 pointer-events-none flex items-center justify-center">
          <div
            className="w-14 h-24 -mt-14 bg-gradient-to-t from-[#2563eb]/40 via-[#60a5fa]/20 to-transparent pointer-events-none rounded-t-full"
            style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
          />
        </div>

        {/* Outer White Beacon Ring */}
        <div className="relative z-20 w-7 h-7 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 border-slate-100">
          {/* Inner Royal Blue Dot */}
          <div className="w-4 h-4 rounded-full bg-[#1a73e8] shadow-inner" />
        </div>
      </div>
    </OverlayView>
  ), [animatedLocation]);

  const currentStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps) return null;
    const steps = directions.routes[0].legs[0].steps;
    return steps[0] || null;
  }, [directions]);

  const nextStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps) return null;
    const steps = directions.routes[0].legs[0].steps;
    return steps[1] || null;
  }, [directions]);

  const arrivalClockTime = useMemo(() => {
    if (!duration) return '';
    const match = duration.match(/(\d+)\s*min/);
    const mins = match ? parseInt(match[1], 10) : 4;
    const target = new Date(Date.now() + mins * 60000);
    return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [duration]);

  const maneuverTarget = useMemo(() => {
    if (!currentStep) {
      const fallbackName = typeof booking?.address === 'object'
        ? (booking?.address?.addressLine1 || booking?.address?.city || 'Job Location')
        : (booking?.address || 'Job Location');
      return {
        type: 'straight',
        prefix: 'towards',
        name: fallbackName
      };
    }
    const rawText = currentStep.instructions ? currentStep.instructions.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const isRight = currentStep.maneuver?.includes('right') || rawText.toLowerCase().includes('right');
    const isLeft = currentStep.maneuver?.includes('left') || rawText.toLowerCase().includes('left');

    const match = rawText.match(/(?:onto|towards|on|at)\s+([^,]+)/i);
    const streetName = match ? match[1].trim() : rawText || 'Destination';

    return {
      type: isRight ? 'right' : isLeft ? 'left' : 'straight',
      prefix: rawText.toLowerCase().includes('onto') ? 'onto' : 'towards',
      name: streetName
    };
  }, [currentStep, booking?.address]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeId: 'roadmap',
    gestureHandling: 'greedy',
    rotateControl: false,
    tiltControl: false,
    isFractionalZoomEnabled: true,
    mapTypeControl: false,
    mapTypeControlOptions: {
      mapTypeIds: []
    },
    streetViewControl: false,
    fullscreenControl: false,
    styles: mapStyles
  }), []);

  if (!isLoaded || loading) return <div className="h-screen bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="h-screen flex flex-col relative bg-slate-900 overflow-hidden select-none">
      {/* 1. TOP GOOGLE MAPS NAVIGATION HUD (EXACT SCREENSHOT MATCH) */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex flex-col items-start">
        {/* Main Turn Maneuver Bar */}
        <div className="w-full bg-[#005f56] text-white rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] p-3.5 sm:p-4 flex items-center gap-3.5 pointer-events-auto border border-teal-600/30">
          {/* Maneuver Arrow Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
            {maneuverTarget.type === 'right' ? (
              <FiCornerUpRight className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[3]" />
            ) : maneuverTarget.type === 'left' ? (
              <FiCornerUpLeft className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[3]" />
            ) : (
              <FiArrowUp className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[3]" />
            )}
          </div>

          {/* Maneuver Text (towards Road Name) */}
          <div className="flex-1 min-w-0 pr-1">
            <span className="text-xs font-bold text-[#80cbc4] tracking-wide mr-1.5 lowercase">
              {maneuverTarget.prefix}
            </span>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate leading-snug inline">
              {maneuverTarget.name}
            </h2>
          </div>
        </div>

        {/* Subsequent Next Step "Then ↰" */}
        {nextStep && (
          <div className="bg-[#004d40] text-teal-100 px-3.5 py-1 rounded-b-xl text-xs font-extrabold flex items-center gap-2 shadow-md ml-3 border-t border-teal-700/50 pointer-events-auto">
            <span className="italic font-serif font-bold text-teal-200">Then</span>
            {nextStep.maneuver?.includes('right') ? (
              <FiCornerUpRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            ) : (
              <FiCornerUpLeft className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            )}
          </div>
        )}
      </div>

      {/* No Internet Overlay */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-4 right-4 z-50 bg-red-500 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <FiWifiOff className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm">No Internet Connection</h3>
              <p className="text-xs text-red-100">Check your network settings.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Error Overlay (Centered) */}
      <AnimatePresence>
        {routeError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-x-4 top-[25%] z-40 bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-auto border border-gray-100"
          >
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <FiAlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-2">Route Not Found</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We couldn't calculate a driving path to this location. The destination might be unreachable by road or off the map.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={() => {
                  const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(booking?.address?.addressLine1 || '');
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                }}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                Open Maps
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Canvas */}
      <div className="flex-1 w-full h-full relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          defaultCenter={defaultCenter}
          defaultZoom={19}
          onLoad={map => {
            setMap(map);
            map.setTilt(55);
            if (currentLocation) {
              map.setCenter(currentLocation);
              map.setZoom(19);
              if (heading) map.setHeading(heading);
            }
          }}
          onDragStart={() => setIsAutoCenter(false)}
          options={mapOptions}
        >
          {directions && (
            <>
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  suppressPolylines: true
                }}
              />
              {/* Electric Google Maps Blue Polyline with Dark Border Casing */}
              <PolylineF
                path={routePath}
                options={{
                  strokeColor: "#1e1b4b",
                  strokeWeight: 11,
                  strokeOpacity: 0.75,
                  zIndex: 40
                }}
              />
              <PolylineF
                path={routePath}
                options={{
                  strokeColor: "#2563eb",
                  strokeWeight: 8,
                  strokeOpacity: 1,
                  zIndex: 50
                }}
              />
            </>
          )}

          {/* Turn Label on Map with Pointer (Matching Screenshot) */}
          {turnPoint && (
            <OverlayView
              position={turnPoint}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="relative -translate-x-1/2 -translate-y-[120%] pointer-events-none flex flex-col items-center">
                <div className="bg-[#1a73e8] text-white px-3 py-1 rounded-xl text-xs font-black shadow-2xl border-2 border-white tracking-tight whitespace-nowrap drop-shadow-md">
                  {maneuverTarget.name}
                </div>
                {/* Downward Pointer Triangle */}
                <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-white -mt-[1px]" />
              </div>
            </OverlayView>
          )}

          {destinationMarker}
          {riderMarker}
        </GoogleMap>

        {/* 2. RIGHT FLOATING COMPASS CONTROL */}
        <div className="absolute top-28 right-3.5 flex flex-col items-center gap-3 z-30 pointer-events-auto">
          {/* Compass Needle Button */}
          <button
            type="button"
            onClick={() => {
              if (map && currentLocation) {
                map.setHeading(0);
                map.setTilt(55);
                map.setZoom(19);
                map.panTo(currentLocation);
                setHeading(0);
              }
            }}
            className="w-12 h-12 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer hover:bg-slate-50"
            title="Reset North Compass"
          >
            <div
              className="w-7 h-7 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <polygon points="12,2 15,12 9,12" fill="#ef4444" />
                <polygon points="12,22 9,12 15,12" fill="#94a3b8" />
              </svg>
            </div>
          </button>
        </div>

        {/* 3. BOTTOM-LEFT FLOATING SPEEDOMETER & RECENTER */}
        <div className="absolute bottom-28 left-3.5 z-30 flex items-center gap-2 pointer-events-auto">
          {/* Real GPS Speedometer */}
          <div className="w-14 h-14 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border-2 border-slate-200 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-slate-900 leading-none">{speed}</span>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase mt-0.5">km/h</span>
          </div>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={() => {
              setIsAutoCenter(true);
              if (map && currentLocation) {
                map.panTo(currentLocation);
                map.setZoom(19);
                map.setTilt(55);
                map.setHeading(heading || 0);
              }
            }}
            className={`w-11 h-11 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-90 transition-all cursor-pointer ${isAutoCenter ? 'bg-teal-600 text-white shadow-teal-600/30' : 'bg-white text-slate-700'}`}
            title="Recenter Map"
          >
            <FiCrosshair className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 4. GOOGLE MAPS LIVE NAVIGATION BOTTOM BAR (EXACT SCREENSHOT MATCH) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t border-slate-100 z-30 p-3 pb-6 transition-all duration-300">
        {/* Grabber Handle */}
        <button
          type="button"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          className="w-full flex justify-center py-1 -mt-1 mb-2 cursor-pointer"
        >
          <div className="w-10 h-1 bg-slate-300 rounded-full hover:bg-slate-400 transition-colors" />
        </button>

        {/* 3-Column Navigation Status Bar */}
        <div className="flex items-center justify-between px-3">
          {/* Left: Circular Exit (✕) */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xl font-bold active:scale-90 transition-all cursor-pointer shadow-2xs"
            title="Exit Navigation"
          >
            <FiX className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Center: Large Green ETA + Trip Metrics */}
          <div
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            className="flex-1 text-center cursor-pointer px-3"
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-2xl sm:text-3xl font-black text-[#15803d] tracking-tight">
                {duration || '4 min'}
              </span>
              <span className="text-emerald-600 text-lg">🍃</span>
            </div>
            <p className="text-xs font-bold text-slate-500 tracking-wide">
              {distance || '1.1 km'} • {arrivalClockTime || '18:12'}
            </p>
          </div>

          {/* Right: Alternate Routes / Google Maps External Launch */}
          <button
            type="button"
            onClick={() => {
              const bAddr = booking?.address;
              const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr?.addressLine1 || ''}, ${bAddr?.city || ''}`;
              const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(addressStr);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
            }}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs group"
            title="Open Turn-by-Turn in Google Maps"
          >
            <FiNavigation className="w-5 h-5 text-teal-800 group-hover:rotate-45 transition-transform" />
          </button>
        </div>

        {/* Expandable Customer / Action Drawer */}
        <AnimatePresence>
          {isSheetExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-100 mt-3 space-y-3 px-2"
            >
              {/* Customer Quick Summary Strip */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {((booking?.userId?.name || booking?.customerName || 'Customer')[0] || 'C').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 truncate">
                      {booking?.userId?.name || booking?.customerName || 'Customer'}
                    </h4>
                    <p className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Verified Customer
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 block">
                    ₹{booking?.finalAmount || booking?.totalAmount || booking?.totalPrice || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {booking?.paymentMethod === 'online' || booking?.paymentStatus === 'paid' ? 'Prepaid' : 'Pay at Home'}
                  </span>
                </div>
              </div>

              {/* Doorstep Address Section */}
              <div className="bg-slate-50 rounded-2xl p-3 flex items-start justify-between gap-3 border border-slate-200/70">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FiMapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-slate-700 line-clamp-2 leading-relaxed">
                    {typeof booking?.address === 'string' ? booking.address : `${booking?.address?.addressLine1 || ''}, ${booking?.address?.city || ''}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const addr = booking?.address;
                    const addrText = typeof addr === 'string' ? addr : `${addr?.addressLine1 || ''}, ${addr?.city || ''}`;
                    navigator.clipboard?.writeText(addrText);
                    setCopiedAddress(true);
                    toast.success('Address copied');
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0"
                >
                  {copiedAddress ? <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                {booking?.status === 'journey_started' && (
                  <button
                    onClick={() => setIsVisitModalOpen(true)}
                    className="px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 text-xs uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    <FiCheckCircle className="w-4 h-4" /> Reached
                  </button>
                )}

                {(booking?.userId?.phone || booking?.customerPhone) && (
                  <a
                    href={`tel:${booking.userId?.phone || booking.customerPhone}`}
                    className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <FiPhone className="w-4 h-4" /> Call Customer
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visit OTP Modal */}
      <VisitVerificationModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        bookingId={id}
        onSuccess={() => navigate(`/vendor/booking/${id}`)}
      />
    </div>
  );
};

export default BookingMap;
