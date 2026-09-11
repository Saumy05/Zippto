const axios = require('axios');

/**
 * Location Service
 * Handles location-based operations using Google Maps API
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Geocode address to coordinates using Google Maps API
 * @param {string} address - Full address string
 * @returns {Promise<Object>} {lat, lng} coordinates
 */
const geocodeAddress = async (address) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured, geocoding skipped');
      return null;
    }

    const response = await axios.get(`${GOOGLE_MAPS_API_URL}/geocode/json`, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }

    throw new Error(`Geocoding failed: ${response.data.status}`);
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

const _buildVendorQuery = (filters = {}, hasCoordinates = false) => {
  const checkCashLimit = filters.checkCashLimit;
  const serviceCategory = filters.service;
  const categorySlug = filters.categorySlug;
  const brandSlug = filters.brandSlug;
  const skills = filters.skills;
  
  const queryFilters = { ...filters };
  delete queryFilters.checkCashLimit;
  delete queryFilters.service;
  delete queryFilters.categorySlug;
  delete queryFilters.brandSlug;
  delete queryFilters.brandTitle;
  delete queryFilters.serviceTitle;
  delete queryFilters.skills;
  delete queryFilters.city;

  const baseQuery = {
    $or: [
      { approvalStatus: { $in: ['approved', 'APPROVED'] } },
      { status: { $in: ['active', 'approved', 'ACTIVE', 'APPROVED'] } },
      { isApproved: true }
    ],
    isActive: true,
    ...queryFilters
  };

  // Only apply strict city regex filter if GPS coordinates are missing
  // When coordinates are available, geographic radius handles proximity
  if (filters.city && !hasCoordinates) {
    baseQuery['address.city'] = { $regex: new RegExp(filters.city, 'i') };
  }

  // Collect all matching tokens and patterns for category/service/skill
  const matchTokens = new Set();
  const regexPatterns = [];

  if (serviceCategory) {
    const clean = serviceCategory.trim();
    const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    matchTokens.add(clean);
    matchTokens.add(slug);
    regexPatterns.push(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    regexPatterns.push(new RegExp(`^${slug}$`, 'i'));

    // Category aliases and variants
    if (/appliance|ac/i.test(clean)) {
      matchTokens.add('ac-appliance-repair');
      matchTokens.add('AC & Appliance Repair');
      matchTokens.add('ac');
      matchTokens.add('appliance-repair-service');
      matchTokens.add('Appliance Repair & Service');
      regexPatterns.push(/ac.*appliance/i);
      regexPatterns.push(/appliance.*repair/i);
    }
    if (/electric/i.test(clean)) {
      matchTokens.add('electrician');
      matchTokens.add('Electricity');
      matchTokens.add('electrician-plumber-carpenter');
    }
    if (/plumb/i.test(clean)) {
      matchTokens.add('plumber');
      matchTokens.add('Plumbing');
      matchTokens.add('electrician-plumber-carpenter');
    }
    if (/carpent/i.test(clean)) {
      matchTokens.add('carpenter');
      matchTokens.add('Carpenter');
      matchTokens.add('electrician-plumber-carpenter');
    }
    if (/clean/i.test(clean)) {
      matchTokens.add('cleaning');
      matchTokens.add('cleaning-service');
      matchTokens.add('Cleaning Service');
    }
    if (/paint/i.test(clean)) {
      matchTokens.add('painting-service');
      matchTokens.add('Painting Service');
    }
    if (/pest/i.test(clean)) {
      matchTokens.add('pest-control');
      matchTokens.add('Pest Control');
    }
  }

  if (categorySlug) {
    matchTokens.add(categorySlug);
    matchTokens.add(categorySlug.replace(/-/g, ' '));
  }

  const tokenArray = Array.from(matchTokens);
  const orConditions = [];

  if (tokenArray.length > 0 || regexPatterns.length > 0) {
    const combinedPatterns = [...tokenArray, ...regexPatterns];
    orConditions.push(
      { service: { $in: combinedPatterns } },
      { serviceCategory: { $in: combinedPatterns } },
      { categories: { $in: combinedPatterns } }
    );
  }

  // Match brand or specific skill in vendor skills array
  if (brandSlug) {
    orConditions.push({ skills: brandSlug });
    orConditions.push({ skills: new RegExp(brandSlug, 'i') });
  }
  if (skills) {
    const skillList = Array.isArray(skills) ? skills : [skills];
    orConditions.push({ skills: { $in: skillList } });
  }

  if (orConditions.length > 0) {
    baseQuery.$and = baseQuery.$and || [];
    baseQuery.$and.push({ $or: orConditions });
  }

  if (checkCashLimit) {
    baseQuery.$expr = { $lte: ["$wallet.dues", "$wallet.cashLimit"] };
  }

  return baseQuery;
};

/**
 * Find vendors within specified radius of a location
 */
const findNearbyVendors = async (centerLocation, radiusKm = 10, filters = {}) => {
  const Vendor = require('../models/Vendor');
  const Settings = require('../models/Settings');
  const { getNearbyVendorsFromCache, isRedisConnected } = require('./redisService');

  const hasCoordinates = !!(centerLocation && typeof centerLocation.lat === 'number' && typeof centerLocation.lng === 'number');

  if (!hasCoordinates) {
    console.warn('[LocationService] Invalid coordinates. City fallback for:', filters.city);
    if (filters.city) {
      return findVendorsByCity(filters.city, filters);
    }
    // If neither coordinates nor city, query all approved vendors
    const fallbackVendors = await Vendor.find(_buildVendorQuery(filters, false))
      .select('name businessName phone address location profilePhoto service rating isOnline availability settings')
      .limit(20);
    return fallbackVendors.map(v => ({ ...v.toObject(), distance: 1.0 }));
  }

  try {
    // Fetch default radius from settings
    if (radiusKm === 10) {
      const globalSettings = await Settings.findOne({ type: 'global' }).select('searchRadius').lean();
      if (globalSettings?.searchRadius) radiusKm = globalSettings.searchRadius;
    }

    const baseQuery = _buildVendorQuery(filters, hasCoordinates);
    const totalApprovedVendors = await Vendor.countDocuments({ approvalStatus: { $in: ['approved', 'APPROVED'] }, isActive: true });
    console.log(`[LocationService] Total Approved/Active Vendors in DB: ${totalApprovedVendors}`);
    console.log(`[LocationService] Searching with query: ${JSON.stringify(baseQuery)}`);

    // OPTION 1: Try Redis geo cache first (fastest - <5ms)
    if (isRedisConnected()) {
      const cachedVendors = await getNearbyVendorsFromCache(centerLocation.lat, centerLocation.lng, radiusKm);

      if (cachedVendors && cachedVendors.length > 0) {
        console.log(`[LocationService] Found ${cachedVendors.length} vendors from Redis cache`);

        // Fetch full vendor details from MongoDB
        const vendorIds = cachedVendors.map(v => v.vendorId);
        const vendors = await Vendor.find({
          _id: { $in: vendorIds },
          ...baseQuery
        }).select('name businessName phone address profilePhoto service rating isOnline availability geoLocation');

        // Merge distance from cache
        const vendorMap = new Map(vendors.map(v => [v._id.toString(), v.toObject()]));
        const result = cachedVendors
          .filter(cv => vendorMap.has(cv.vendorId))
          .map(cv => ({
            ...vendorMap.get(cv.vendorId),
            distance: cv.distance
          }));

        if (result.length > 0) {
          result.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return (a.distance || 0) - (b.distance || 0);
          });
          console.log(`[LocationService] Found ${result.length} matching vendors via Redis path`);
          return result;
        }
      }
    }

    // OPTION 2: Try MongoDB 2dsphere geo query (fast)
    let nearbyVendors = [];

    try {
      // Check if any vendors have geoLocation set
      const hasGeoVendors = await Vendor.countDocuments({
        ...baseQuery,
        'geoLocation.coordinates': { $ne: [0, 0] }
      });

      if (hasGeoVendors > 0) {
        // Use fast 2dsphere query
        const geoVendors = await Vendor.find({
          ...baseQuery,
          geoLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [centerLocation.lng, centerLocation.lat] // GeoJSON is [lng, lat]
              },
              $maxDistance: radiusKm * 1000 // Convert km to meters
            }
          }
        })
          .select('name businessName phone address profilePhoto service rating isOnline availability geoLocation settings')
          .limit(50);

        // Calculate distance for each vendor
        nearbyVendors = geoVendors.map(vendor => {
          const vendorObj = vendor.toObject();
          if (vendor.geoLocation && vendor.geoLocation.coordinates) {
            vendorObj.distance = calculateDistance(centerLocation, {
              lat: vendor.geoLocation.coordinates[1],
              lng: vendor.geoLocation.coordinates[0]
            });
          } else {
            vendorObj.distance = null;
          }
          return vendorObj;
        });

        // Filter by individual vendor range
        nearbyVendors = nearbyVendors.filter(v => {
          const vRange = v.settings?.serviceRange || radiusKm;
          return v.distance !== null && v.distance <= vRange;
        });

        console.log(`[LocationService] Found ${nearbyVendors.length} vendors using 2dsphere query`);
        if (nearbyVendors.length > 0) {
          nearbyVendors.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return (a.distance || 0) - (b.distance || 0);
          });
          return nearbyVendors;
        }
        console.log('[LocationService] 2dsphere query yielded 0 in-range vendors. Continuing to Haversine fallback...');
      }
    } catch (geoError) {
      console.warn('[LocationService] 2dsphere query failed, falling back to Haversine:', geoError.message);
    }

    // OPTION 3: Fallback using Haversine formula (checks location or address.lat/lng)
    const vendors = await Vendor.find(baseQuery)
      .select('name businessName phone address location profilePhoto service rating isOnline availability settings');

    console.log(`[LocationService] Haversine fallback: found ${vendors.length} vendors matching baseQuery before distance filter`);

    // Calculate distances and filter by radius
    nearbyVendors = vendors.map(vendor => {
      let distance = null;

      // PRIORITY: Use real-time location (location) first, then registered address
      const vLat = vendor.location?.lat || vendor.address?.lat;
      const vLng = vendor.location?.lng || vendor.address?.lng;

      if (vLat && vLng) {
        distance = calculateDistance(centerLocation, {
          lat: vLat,
          lng: vLng
        });
      }

      const vRange = vendor.settings?.serviceRange || radiusKm;
      return {
        ...vendor.toObject(),
        distance: distance,
        withinRange: distance !== null && distance <= vRange,
        isUsingCurrentLocation: !!vendor.location?.lat
      };
    }).filter(vendor => vendor.withinRange);

    const currentLocCount = nearbyVendors.filter(v => v.isUsingCurrentLocation).length;
    console.log(`[LocationService] Found ${nearbyVendors.length} vendors (Online/Current: ${currentLocCount}) using Haversine`);

    // Fallback A: If 0 vendors found within strict radius, return all matching approved category vendors with fallback distance
    if (nearbyVendors.length === 0 && vendors.length > 0) {
      console.log(`[LocationService] Radius match was 0, but found ${vendors.length} approved vendors for service. Using category fallback list.`);
      nearbyVendors = vendors.map(v => ({
        ...v.toObject(),
        distance: 1.5
      }));
    }

    // Fallback B: If still 0 vendors found (e.g. category mismatch or new vendor with no categories set), alert active approved vendors
    if (nearbyVendors.length === 0) {
      console.log('[LocationService] 0 vendors with category filter. Querying all active approved vendors as safety net...');
      const broadVendors = await Vendor.find({
        $or: [
          { approvalStatus: { $in: ['approved', 'APPROVED'] } },
          { status: { $in: ['active', 'approved', 'ACTIVE', 'APPROVED'] } },
          { isApproved: true }
        ],
        isActive: true
      })
        .select('name businessName phone address location profilePhoto service rating isOnline availability settings')
        .limit(20);

      if (broadVendors.length > 0) {
        console.log(`[LocationService] Broad safety net found ${broadVendors.length} active approved vendors.`);
        nearbyVendors = broadVendors.map(v => ({
          ...v.toObject(),
          distance: 2.0
        }));
      }
    }

    if (nearbyVendors.length > 0) {
      nearbyVendors.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.distance || 0) - (b.distance || 0);
      });
    }

    return nearbyVendors;
  } catch (error) {
    console.error('Find nearby vendors error:', error);
    return [];
  }
};

const getDistanceMatrix = async (origins, destinations) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured, using mock distances');
      // Return mock distances
      return origins.map(() => destinations.map(() => ({ distance: { value: 5000 } })));
    }

    const originsStr = origins.map(coord => `${coord.lat},${coord.lng}`).join('|');
    const destinationsStr = destinations.map(coord => `${coord.lat},${coord.lng}`).join('|');

    const response = await axios.get(`${GOOGLE_MAPS_API_URL}/distancematrix/json`, {
      params: {
        origins: originsStr,
        destinations: destinationsStr,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    return response.data.rows;
  } catch (error) {
    console.error('Distance matrix error:', error);
    return [];
  }
};

/**
 * Find vendors in a specific city (fallback when coordinates are missing)
 * @param {string} city - City name
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of vendors
 */
const findVendorsByCity = async (city, filters = {}) => {
  try {
    const Vendor = require('../models/Vendor');
    const baseQuery = _buildVendorQuery({ ...filters, city });

    console.log(`[LocationService] City search query: ${JSON.stringify(baseQuery)}`);
    const vendors = await Vendor.find(baseQuery)
      .select('name businessName phone address location profilePhoto service rating isOnline availability settings')
      .limit(50);

    console.log(`[LocationService] Found ${vendors.length} vendors in city: ${city}`);
    return vendors.map(v => ({ ...v.toObject(), distance: null }));
  } catch (error) {
    console.error('Find vendors by city error:', error);
    return [];
  }
};

module.exports = {
  geocodeAddress,
  findNearbyVendors,
  findVendorsByCity,
  calculateDistance,
  getDistanceMatrix
};
