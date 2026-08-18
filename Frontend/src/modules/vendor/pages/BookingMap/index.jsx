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
const SHOW_SIMULATION_BUTTON = import.meta.env.VITE_ENABLE_MAP_SIMULATION === 'true';

// Zomato-like Premium Map Style (Silver/Clean)
const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
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
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [heading, setHeading] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false); // Lifted state up
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [actionLoading, setActionLoading] = useState(false);
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

  // DEBUG: Location Simulator for testing
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    language: localStorage.getItem('zippto_language') || 'en'
  });

  const mapRef = useRef(null);

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
        // Error fetching booking
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded) fetchBooking();
  }, [id, isLoaded]);

  // Watch Location
  useEffect(() => {
    // START CHANGE: If simulating, do NOT watch real GPS position
    if (isSimulating) return;
    // END CHANGE

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          // START CHANGE: Double check simulating state inside callback
          if (isSimulating) return;
          // END CHANGE
          const { latitude, longitude, heading: gpsHeading } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });

          // Use GPS heading if available (more accurate for movement)
          if (gpsHeading !== null && !isNaN(gpsHeading)) {
            setHeading(gpsHeading);
          }
        },
        (error) => {
          // GPS Tracking Error
          if (error.code === 1) { // PERMISSION_DENIED
            // toast.error("Location permission denied. Map cannot track you.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      toast.error("Geolocation not supported on this device");
    }
  }, [isSimulating]); // Add isSimulating to dependency array

  const socket = useAppNotifications('vendor'); // Get socket instance 

  // ... 

  // Animated location for smooth marker movement
  const [animatedLocation, setAnimatedLocation] = useState(null);
  const targetLocationRef = useRef(null);
  const animatedLocationRef = useRef(null);
  const animationFrameRef = useRef(null);

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

      const lerpFactor = 0.1;
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

  // Sync Location to Backend (Periodic)
  useEffect(() => {
    if (socket && id) {
      socket.emit('join_tracking', id);
    }
  }, [socket, id]);

  useEffect(() => {
    if (currentLocation && socket && id) {
      const syncInterval = setInterval(() => {
        // START CHANGE: If simulating, do NOT emit periodic updates here (simulation loop does it)
        if (isSimulating) return;
        // END CHANGE

        if (currentLocation.lat && currentLocation.lng) {
          socket.emit('update_location', {
            bookingId: id,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            heading: heading
          });
        }
      }, 5000);

      return () => clearInterval(syncInterval);
    }
  }, [currentLocation, socket, id, heading, isSimulating]); // Add isSimulating to dependency array

  // DEBUG: Location Simulator Functions
  const startSimulation = () => {
    if (!currentLocation || !coords || !socket) {
      toast.error('Wait for map to load first');
      return;
    }

    if (!routePath || routePath.length === 0) {
      toast.error('No road path found. Wait for route to load.');
      return;
    }

    setIsSimulating(true);
    toast.success('🚀 Simulation started! Following the road.');

    // Generate detailed points along the specific road path
    const pathPoints = [];
    const stepMeters = 20; // Distance between points (smaller = smoother)

    // Use the FULL path for simulation, not the sliced visualization path
    const simPath = fullRoutePathRef.current && fullRoutePathRef.current.length > 0 ? fullRoutePathRef.current : routePath;

    for (let i = 0; i < simPath.length - 1; i++) {
      const p1 = simPath[i];
      const p2 = simPath[i + 1];

      // Helper to safely get coords whether it's a LatLng object or plain object
      const getLat = (p) => typeof p.lat === 'function' ? p.lat() : p.lat;
      const getLng = (p) => typeof p.lng === 'function' ? p.lng() : p.lng;

      const lat1 = getLat(p1);
      const lng1 = getLng(p1);
      const lat2 = getLat(p2);
      const lng2 = getLng(p2);

      const p1LatLng = new window.google.maps.LatLng(lat1, lng1);
      const p2LatLng = new window.google.maps.LatLng(lat2, lng2);

      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1LatLng, p2LatLng);
      const steps = Math.max(1, Math.floor(dist / stepMeters));

      for (let j = 0; j < steps; j++) {
        const fraction = j / steps;
        const lat = lat1 + (lat2 - lat1) * fraction;
        const lng = lng1 + (lng2 - lng1) * fraction;
        pathPoints.push({ lat, lng });
      }
    }
    // Add destination
    const last = simPath[simPath.length - 1];
    const lastLat = typeof last.lat === 'function' ? last.lat() : last.lat;
    const lastLng = typeof last.lng === 'function' ? last.lng() : last.lng;
    pathPoints.push({ lat: lastLat, lng: lastLng });

    let pathIndex = 0;

    simulationRef.current = setInterval(() => {
      if (pathIndex >= pathPoints.length) {
        stopSimulation();
        toast.success('✅ Arrived at destination!');
        return;
      }

      const point = pathPoints[pathIndex];
      let simHeading = heading;

      // Calculate heading for correct icon rotation
      if (pathIndex < pathPoints.length - 1) {
        const nextPoint = pathPoints[pathIndex + 1];
        simHeading = window.google.maps.geometry.spherical.computeHeading(
          new window.google.maps.LatLng(point),
          new window.google.maps.LatLng(nextPoint)
        );
      }

      // Emit to socket
      socket.emit('update_location', {
        bookingId: id,
        lat: point.lat,
        lng: point.lng,
        heading: simHeading
      });

      // Update local display
      setCurrentLocation(point);
      setHeading(simHeading);

      pathIndex++;
    }, 1000); // Update every 1 second
  };

  const stopSimulation = () => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setIsSimulating(false);
  };

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  // ... existing code ...

  const prevLocationRef = useRef(null);
  const directionsCalculatedRef = useRef(false);

  const fullRoutePathRef = useRef([]);

  // Calculate Route ONCE on initial load only
  useEffect(() => {
    if (isLoaded && currentLocation && coords && map && !directionsCalculatedRef.current) {
      directionsCalculatedRef.current = true; // Prevent recalculation

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

            // Fit complete route bounds nicely inside viewport
            try {
              const bounds = new window.google.maps.LatLngBounds();
              bounds.extend(currentLocation);
              bounds.extend(coords);
              map.fitBounds(bounds, {
                top: 100,
                bottom: 300,
                left: 50,
                right: 50
              });
            } catch (err) {
              map.setCenter(currentLocation);
              map.setZoom(15);
            }
          } else {
            setRouteError('Could not calculate a driving route to this location.');
          }
        }
      );
    }
  }, [isLoaded, coords, map, currentLocation]);

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
      } else if (coords) {
        // Initial heading towards job destination
        const start = new window.google.maps.LatLng(currentLocation);
        const end = new window.google.maps.LatLng(coords);
        setHeading(window.google.maps.geometry.spherical.computeHeading(start, end));
      }
      prevLocationRef.current = currentLocation;
    }
  }, [currentLocation, isLoaded, coords]);

  // Sync Map Heading & Tilt for Navigation Feel
  useEffect(() => {
    if (map && currentLocation && heading && isAutoCenter) {
      map.setHeading(heading);
      map.setTilt(45); // 45 degree tilt for 3D feel
    }
  }, [map, heading, isAutoCenter, currentLocation]);

  // Memoize Map Markers to prevent flickering/blinking
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
        className="pointer-events-none"
      >
        <div
          className="relative z-20 w-16 h-16"
          style={{
            transform: `rotate(${heading}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <img
            src="/MapRider.png"
            alt="Rider"
            className="w-full h-full object-contain drop-shadow-xl rounded-full"
          />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-teal-500/30 rounded-full animate-ping z-10 pointer-events-none"></div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-12 h-3 bg-black/20 blur-sm rounded-full z-0"></div>
      </div>
    </OverlayView>
  ), [animatedLocation, heading]);

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
        <div className="w-full bg-[#005f56] text-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.35)] p-4 flex items-center gap-4 pointer-events-auto border border-teal-600/30">
          {/* Maneuver Arrow Icon */}
          <div className="w-11 h-11 flex items-center justify-center shrink-0">
            {maneuverTarget.type === 'right' ? (
              <FiCornerUpRight className="w-9 h-9 text-white stroke-[3]" />
            ) : maneuverTarget.type === 'left' ? (
              <FiCornerUpLeft className="w-9 h-9 text-white stroke-[3]" />
            ) : (
              <FiArrowUp className="w-9 h-9 text-white stroke-[3]" />
            )}
          </div>

          {/* Maneuver Text (towards Road Name) */}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-[#80cbc4] tracking-wide mr-1.5 lowercase">
              {maneuverTarget.prefix}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate leading-tight inline">
              {maneuverTarget.name}
            </h2>
          </div>
        </div>

        {/* Subsequent Next Step "Then ↰" */}
        {nextStep && (
          <div className="bg-[#004d40] text-teal-100 px-4 py-1 rounded-b-xl text-xs font-extrabold flex items-center gap-2 shadow-md ml-3 border-t border-teal-700/50 pointer-events-auto">
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
          defaultZoom={15}
          onLoad={map => {
            setMap(map);
            map.setTilt(45);
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
              {/* Electric Google Maps Blue Polyline */}
              <PolylineF
                path={routePath}
                options={{
                  strokeColor: "#1d4ed8",
                  strokeWeight: 10,
                  strokeOpacity: 0.35,
                  zIndex: 40
                }}
              />
              <PolylineF
                path={routePath}
                options={{
                  strokeColor: "#2563eb",
                  strokeWeight: 7,
                  strokeOpacity: 1,
                  zIndex: 50
                }}
              />
            </>
          )}

          {/* Turn Label on Map */}
          {coords && (
            <OverlayView
              position={coords}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="relative -translate-x-1/2 -translate-y-12 pointer-events-none">
                <div className="bg-[#2563eb] text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-xl border border-white/40 tracking-tight whitespace-nowrap">
                  {maneuverTarget.name}
                </div>
              </div>
            </OverlayView>
          )}

          {destinationMarker}
          {riderMarker}
        </GoogleMap>

        {/* 2. RIGHT FLOATING GOOGLE MAPS ACTION BUTTONS (SCREENSHOT MATCH) */}
        <div className="absolute top-28 right-3.5 flex flex-col items-center gap-3 z-30 pointer-events-auto">
          {/* Compass Needle Button */}
          <button
            type="button"
            onClick={() => {
              if (map) {
                map.setHeading(0);
                map.setTilt(45);
                setHeading(0);
              }
            }}
            className="w-12 h-12 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
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

          {/* Search / Route Overview Button */}
          <button
            type="button"
            onClick={() => {
              if (map && coords && currentLocation) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(currentLocation);
                bounds.extend(coords);
                map.fitBounds(bounds, { top: 90, bottom: 200, left: 50, right: 50 });
              }
            }}
            className="w-12 h-12 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center justify-center text-slate-700 active:scale-90 transition-all cursor-pointer hover:bg-slate-50"
            title="Search / Full Route Overview"
          >
            <FiSearch className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Mute Voice Guidance Audio Button */}
          <button
            type="button"
            onClick={() => {
              setIsMuted(!isMuted);
              toast.success(isMuted ? 'Voice guidance on' : 'Voice guidance muted');
            }}
            className="w-12 h-12 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center justify-center text-slate-700 active:scale-90 transition-all cursor-pointer hover:bg-slate-50"
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {isMuted ? <FiVolumeX className="w-5 h-5 stroke-[2.5]" /> : <FiVolume2 className="w-5 h-5 stroke-[2.5]" />}
          </button>

          {/* Incident Report Button */}
          <button
            type="button"
            onClick={() => toast.success('Traffic condition reported')}
            className="bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] px-3.5 py-2.5 rounded-full border border-slate-100 flex items-center gap-1.5 text-slate-800 font-black text-xs active:scale-95 transition-all cursor-pointer hover:bg-slate-50"
            title="Report Incident"
          >
            <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
              +
            </div>
            <span>Report</span>
          </button>

          {/* Simulation Toggle Badge */}
          {SHOW_SIMULATION_BUTTON && (
            <button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`px-3 py-1.5 rounded-full shadow-lg transition-all active:scale-90 text-[10px] font-black tracking-wide flex items-center gap-1.5 cursor-pointer ${isSimulating ? 'bg-rose-500 text-white' : 'bg-purple-600 text-white'}`}
            >
              <span>{isSimulating ? '⏹ Stop' : '🚀 Sim'}</span>
            </button>
          )}
        </div>

        {/* 3. BOTTOM-LEFT FLOATING SPEEDOMETER & RECENTER (SCREENSHOT MATCH) */}
        <div className="absolute bottom-28 left-3.5 z-30 flex items-center gap-2 pointer-events-auto">
          {/* Speedometer Circle */}
          <div className="w-14 h-14 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] border-2 border-slate-200 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-slate-900 leading-none">--</span>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase mt-0.5">km/h</span>
          </div>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={() => {
              setIsAutoCenter(true);
              if (map && currentLocation) {
                map.panTo(currentLocation);
                map.setZoom(18);
                map.setTilt(45);
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
