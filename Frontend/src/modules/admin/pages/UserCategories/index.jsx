import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ensureIds, loadCatalog, saveCatalog } from "./utils";
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import ServicesPage from "./pages/ServicesPage";
import BrandsPage from "./pages/BrandsPage";
import VendorServicesPage from "./pages/VendorServicesPage";
import VendorPartsPage from "./pages/VendorPartsPage";

import { cityService } from "../../services/cityService";
import { categoryService } from "../../../../services/catalogService";
import { CustomSelect } from '../../../../components/common';

const UserCategories = () => {
  const [catalog, setCatalog] = useState(() => ensureIds(loadCatalog()));
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    const handler = () => setCatalog(ensureIds(loadCatalog()));
    window.addEventListener("adminUserAppCatalogUpdated", handler);
    return () => window.removeEventListener("adminUserAppCatalogUpdated", handler);
  }, []);

  // Fetch real categories from MongoDB API and keep catalog synced
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const params = {};
        if (selectedCity) params.cityId = selectedCity;
        const response = await categoryService.getAll(params);
        if (response.success && response.categories) {
          const mappedCategories = response.categories.map((cat, idx) => ({
            id: cat.id || cat._id,
            title: cat.title,
            slug: cat.slug,
            homeIconUrl: cat.homeIconUrl || "",
            homeBadge: cat.homeBadge || "",
            hasSaleBadge: Boolean(cat.hasSaleBadge),
            showOnHome: cat.showOnHome !== false,
            homeOrder: Number.isFinite(cat.homeOrder) ? cat.homeOrder : idx,
            cityIds: cat.cityIds || [],
            description: cat.description || "",
            imageUrl: cat.imageUrl || "",
            status: cat.status || "active",
            isPopular: Boolean(cat.isPopular),
          }));

          setCatalog((prev) => {
            const next = { ...prev, categories: mappedCategories };
            saveCatalog(next);
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to fetch categories in UserCategories container:', error);
      }
    };
    fetchCategories();
  }, [selectedCity]);

  // Fetch cities once for the parent container
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await cityService.getAll();
        if (response.success) {
          const loadedCities = (response.cities || []).filter(city => city.isActive);
          setCities(loadedCities);

          // Auto-select default or first city if none selected
          if (!selectedCity && loadedCities.length > 0) {
            const defaultCity = loadedCities.find(c => c.isDefault);
            // Handle potentially different ID formats
            const cityId = defaultCity
              ? (defaultCity._id || defaultCity.id)
              : (loadedCities[0]._id || loadedCities[0].id);

            if (cityId) {
              setSelectedCity(cityId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Get admin role to control UI visibility
  const isAdminSuper = (() => {
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      const stored = JSON.parse(storedData || '{}');
      return (stored.role || 'admin') === 'super_admin';
    } catch (e) {
      return false;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Global City Filter Header - Visible only to Super Admin */}
      {isAdminSuper && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-xl shadow-lg flex items-center justify-between text-white border border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Parameters</h2>
            <p className="text-sm text-slate-300">Filter all catalog content by city</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-200">Selected City:</label>
            <div className="w-56">
              <CustomSelect
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                options={cities.map(city => ({
                  value: city._id || city.id,
                  label: city.name
                }))}
                variant="dark"
                size="md"
                align="right"
                placeholder="Select city..."
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="sections" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="brands" element={<BrandsPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="vendor-services" element={<VendorServicesPage />} />
          <Route path="vendor-parts" element={<VendorPartsPage />} />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default UserCategories;


