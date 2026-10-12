/**
 * Free place search / reverse geocoding via OpenStreetMap Nominatim.
 * Used as a fallback when the Google Maps APIs are unavailable (e.g. billing not enabled on the key).
 * Nominatim usage policy: max ~1 request/second, so callers must debounce.
 */
const BASE = 'https://nominatim.openstreetmap.org';

const toPlace = (item) => {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || '';
  const area = a.suburb || a.neighbourhood || a.city_district || a.quarter || a.road || '';
  const state = a.state || '';
  return {
    address: [area, city, state].filter(Boolean).join(', ') || item.display_name || '',
    city,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon)
  };
};

export const searchPlacesOSM = async (query, signal) => {
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search failed');
  const items = await res.json();
  return items.map((item) => {
    const place = toPlace(item);
    const parts = (item.display_name || '').split(', ');
    return {
      id: String(item.place_id),
      main: parts[0] || place.city,
      secondary: parts.slice(1, 4).join(', '),
      place
    };
  });
};

export const reverseGeocodeOSM = async ({ latitude, longitude }) => {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const item = await res.json();
  if (!item || item.error) return null;
  return { ...toPlace(item), latitude, longitude };
};
