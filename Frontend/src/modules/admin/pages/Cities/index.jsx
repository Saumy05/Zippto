import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { cityService } from '../../services/cityService';
import { HiPlus, HiPencil, HiTrash, HiCheck, HiX, HiSearch, HiArrowLeft, HiChevronRight } from 'react-icons/hi';

const NO_STATE = 'No state';
const PAGE_SIZE = 50;


const CityManagement = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  // The chosen state lives in the URL (?state=West Bengal) so refresh and the Back button keep working
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedState = searchParams.get('state'); // null = list of states
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    country: 'India',
    isActive: true,
    isDefault: false
  });

  const fetchCities = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await cityService.getAll();
      if (response.success) {
        setCities(response.cities);
      }
    } catch (error) {
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCity) {
        await cityService.update(editingCity._id, formData);
        toast.success('City updated successfully');
      } else {
        await cityService.create(formData);
        toast.success('City created successfully');
      }
      setIsModalOpen(false);
      setEditingCity(null);
      resetForm();
      fetchCities(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await cityService.delete(id);
      toast.success('City deleted successfully');
      setCities((prev) => prev.filter((c) => c._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await cityService.toggleStatus(id);
      toast.success('Status updated');
      setCities((prev) => prev.map((c) => (c._id === id ? { ...c, isActive: res.city ? res.city.isActive : !c.isActive } : c)));
    } catch (error) {
      toast.error('Status update failed');
    }
  };

  const openEditModal = (city) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      state: city.state,
      country: city.country,
      isActive: city.isActive,
      isDefault: city.isDefault
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCity(null);
    resetForm();
    // Adding from inside a state pre-fills that state
    if (selectedState && selectedState !== NO_STATE) {
      setFormData((prev) => ({ ...prev, state: selectedState }));
    }
    setIsModalOpen(true);
  };

  const openState = (name) => {
    setSearchParams({ state: name });
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0 });
  };

  const backToStates = () => {
    setSearchParams({});
    setSearch('');
    setVisibleCount(PAGE_SIZE);
  };

  // Cities grouped by state, states sorted A-Z
  const states = useMemo(() => {
    const map = new Map();
    cities.forEach((c) => {
      const key = (c.state || '').trim() || NO_STATE;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        cities: list.sort((a, b) => a.name.localeCompare(b.name)),
        active: list.filter((c) => c.isActive).length
      }))
      .sort((a, b) => {
        if (a.name === NO_STATE) return 1;
        if (b.name === NO_STATE) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [cities]);

  const query = search.trim().toLowerCase();

  // State list: a state matches by its own name or by any of its cities
  const visibleStates = useMemo(() => {
    if (!query) return states.map((st) => ({ ...st, matches: null }));
    return states
      .map((st) => {
        const nameMatch = st.name.toLowerCase().includes(query);
        const matches = st.cities.filter((c) => c.name.toLowerCase().includes(query)).length;
        return { ...st, matches: nameMatch ? st.cities.length : matches, show: nameMatch || matches > 0 };
      })
      .filter((st) => st.show);
  }, [states, query]);

  const currentState = states.find((st) => st.name === selectedState) || null;
  const stateCities = useMemo(() => {
    if (!currentState) return [];
    if (!query || currentState.name.toLowerCase().includes(query)) return currentState.cities;
    return currentState.cities.filter((c) => c.name.toLowerCase().includes(query));
  }, [currentState, query]);

  const resetForm = () => {
    setFormData({
      name: '',
      state: '',
      country: 'India',
      isActive: true,
      isDefault: false
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div>
          {selectedState && (
            <button
              onClick={backToStates}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-700 mb-1"
            >
              <HiArrowLeft /> All states
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedState ? selectedState : 'City Management'}
          </h1>
          <p className="text-sm text-gray-500">
            {selectedState && currentState
              ? `${currentState.cities.length} cities · ${currentState.active} active`
              : `${states.length} states / UTs · ${cities.length} cities · ${cities.filter((c) => c.isActive).length} active`}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <HiPlus /> Add City
        </button>
      </div>

      <div className="relative mb-5 max-w-md">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
          placeholder={selectedState ? `Search cities in ${selectedState}` : 'Search states or cities'}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {loading && <div className="p-8 text-center text-gray-400">Loading...</div>}

      {/* Step 1: states */}
      {!loading && !selectedState && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleStates.map((st) => (
              <button
                key={st.name}
                onClick={() => openState(st.name)}
                className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md hover:ring-1 hover:ring-teal-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{st.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {st.cities.length} cities
                    {st.active === st.cities.length
                      ? ' · all active'
                      : ` · ${st.active} active`}
                    {st.matches !== null && (
                      <span className="text-teal-700 font-medium"> · {st.matches} match</span>
                    )}
                  </p>
                </div>
                <HiChevronRight className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
          {visibleStates.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              {cities.length === 0 ? 'No cities found. Add your first city!' : 'No states or cities match your search.'}
            </div>
          )}
        </>
      )}

      {/* Step 2: cities of the selected state */}
      {!loading && selectedState && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-600">City</th>
                <th className="p-4 font-semibold text-gray-600">Slug</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600">Default</th>
                <th className="p-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stateCities.slice(0, visibleCount).map((city) => (
                <tr key={city._id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-900">{city.name}</td>
                  <td className="p-4 text-gray-500 text-sm">{city.slug}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(city._id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${city.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {city.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    {city.isDefault ? (
                      <span className="flex items-center gap-1 text-teal-600 text-sm font-medium">
                        <HiCheck /> Default
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(city)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                      {!city.isDefault && (
                        <button
                          onClick={() => handleDelete(city._id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stateCities.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    {currentState ? 'No cities match your search.' : 'No cities in this state yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {stateCities.length > visibleCount && (
            <div className="p-4 border-t border-gray-100 text-center">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
              >
                Show more ({stateCities.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Modal - Inline Implementation for simplicity if common modal not found easily */}
      {/* Assuming we might want a simple overlay here if we don't use the common Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg">{editingCity ? 'Edit City' : 'Add City'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:bg-gray-200 rounded-full p-1"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  list="city-states"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Maharashtra"
                />
                <datalist id="city-states">
                  {states.filter((st) => st.name !== NO_STATE).map((st) => (
                    <option key={st.name} value={st.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    disabled={editingCity?.isDefault} // Cannot unset default directly, must set another
                  />
                  <span className="text-sm text-gray-700">Default City</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  {editingCity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityManagement;
