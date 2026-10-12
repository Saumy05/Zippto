import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const CityContext = createContext();

export const useCity = () => useContext(CityContext);

export const CityProvider = ({ children }) => {
  const [currentCity, setCurrentCity] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cities and restore selection on mount
  useEffect(() => {
    const initCity = async () => {
      try {
        setLoading(true);
        // Fetch active cities from public API
        const response = await api.get('/public/cities');

        if (response.data.success && response.data.cities.length > 0) {
          const fetchedCities = response.data.cities;
          setCities(fetchedCities);

          // Check if user has a saved city
          const savedCityId = localStorage.getItem('selectedCityId');
          let selected = null;

          if (savedCityId) {
            selected = fetchedCities.find(c => c._id === savedCityId || c.id === savedCityId);
          }

          // If no active saved city, fallback to default or first active
          if (!selected) {
            selected = fetchedCities.find(c => c.isDefault) || fetchedCities[0];
          }

          setCurrentCity(selected);
          if (selected) {
            localStorage.setItem('selectedCityId', selected._id || selected.id);
          }
        }
      } catch (error) {
        console.error('Failed to load cities:', error);
      } finally {
        setLoading(false);
      }
    };

    initCity();
  }, []);

  // When GPS detects the user's city, switch to the matching service city (if we operate there)
  useEffect(() => {
    if (cities.length === 0) return undefined;
    const matchDetected = (detected) => {
      const name = String(detected || '').trim().toLowerCase();
      if (!name) return;
      const match = cities.find(c => {
        const n = String(c.name || '').toLowerCase();
        return n === name || name.includes(n) || n.includes(name);
      });
      if (match) {
        setCurrentCity(prev => ((prev?._id || prev?.id) === (match._id || match.id) ? prev : match));
        localStorage.setItem('selectedCityId', match._id || match.id);
      }
    };
    const onDetected = (e) => matchDetected(e.detail?.city);
    window.addEventListener('userLocationDetected', onDetected);
    // Location may have been detected before the city list finished loading
    try { matchDetected(localStorage.getItem('currentCity')); } catch (e) { /* ignore */ }
    return () => window.removeEventListener('userLocationDetected', onDetected);
  }, [cities]);

  const selectCity = (city) => {
    setCurrentCity(city);
    if (city) {
      localStorage.setItem('selectedCityId', city._id || city.id);
    } else {
      localStorage.removeItem('selectedCityId');
    }
  };

  const value = {
    currentCity,
    cities,
    selectCity,
    loading
  };

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
};
