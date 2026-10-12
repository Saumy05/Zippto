/**
 * Reverse-geocode coordinates into a short "Area, City, State" label using the Google Geocoding API
 * (same logic the legacy Home page used) and persist it for the rest of the app.
 *
 * Stores: currentAddress, currentCity, userCoords (localStorage)
 * Emits:  'userLocationDetected' (detail: { address, city, latitude, longitude })
 */
export const detectAndStoreAddress = async ({ latitude, longitude }) => {
  try {
    localStorage.setItem('userCoords', JSON.stringify({ latitude, longitude }));
  } catch (e) { /* storage unavailable */ }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const getComponent = (type) =>
      result.address_components.find((c) => c.types.includes(type))?.long_name || '';

    const area = getComponent('sublocality_level_1') || getComponent('neighborhood') || getComponent('locality');
    const city = getComponent('locality') || getComponent('administrative_area_level_2');
    const state = getComponent('administrative_area_level_1');
    const address = [area, city, state].filter(Boolean).join(', ');
    if (!address) return null;

    try {
      localStorage.setItem('currentAddress', address);
      if (city) localStorage.setItem('currentCity', city);
    } catch (e) { /* storage unavailable */ }

    const detail = { address, city, latitude, longitude };
    window.dispatchEvent(new CustomEvent('userLocationDetected', { detail }));
    return detail;
  } catch (e) {
    return null;
  }
};
