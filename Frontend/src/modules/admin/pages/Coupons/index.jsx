import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTag } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import couponService from '../../services/couponService';
import { cityService } from '../../services/cityService';

const EMPTY_FORM = {
  code: '', description: '', discountType: 'percentage', discountValue: '', maxDiscount: '',
  minOrderValue: '', validFrom: '', validUntil: '', usageLimit: '', perUserLimit: 1,
  cityIds: [], status: 'active'
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const statusStyle = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200'
};

// A coupon past its end date is shown as expired even if its stored status is still "active"
const effectiveStatus = (c) => (c.status === 'active' && new Date(c.validUntil) < new Date() ? 'expired' : c.status);

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed, object = open
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await couponService.getAll();
      if (res.success) setCoupons(res.coupons);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    cityService.getAll().then((r) => setCities(r.cities || r.data || [])).catch(() => {});
  }, [load]);

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY_FORM, validFrom: toDateInput(new Date()) }); };
  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      ...EMPTY_FORM, ...c,
      maxDiscount: c.maxDiscount ?? '', usageLimit: c.usageLimit ?? '',
      validFrom: toDateInput(c.validFrom), validUntil: toDateInput(c.validUntil),
      cityIds: (c.cityIds || []).map((x) => x._id || x)
    });
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discountValue || !form.validUntil) {
      return toast.error('Code, discount value and expiry date are required');
    }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      return toast.error('Percentage discount cannot exceed 100');
    }
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
      minOrderValue: Number(form.minOrderValue) || 0,
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1
    };
    delete payload._id; delete payload.usedCount; delete payload.createdAt; delete payload.updatedAt; delete payload.__v; delete payload.createdBy;
    try {
      setSaving(true);
      const res = editingId ? await couponService.update(editingId, payload) : await couponService.create(payload);
      if (res.success) {
        toast.success(res.message);
        setForm(null);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c) => {
    try {
      await couponService.update(c._id, { status: c.status === 'active' ? 'inactive' : 'active' });
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await couponService.remove(c._id);
      toast.success('Coupon deleted');
      load();
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white';
  const label = 'block text-xs font-bold text-gray-700 mb-1';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2"><FiTag /> Coupons</h1>
          <p className="text-xs text-gray-500">Discount codes customers can apply at checkout.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">
          <FiPlus /> New Coupon
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
            <tr>
              {['Code', 'Discount', 'Min Order', 'Validity', 'Used', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No coupons yet</td></tr>
            ) : coupons.map((c) => {
              const st = effectiveStatus(c);
              return (
                <tr key={c._id}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-gray-900">{c.code}</div>
                    {c.description && <div className="text-xs text-gray-500 max-w-[220px] truncate">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                    {c.maxDiscount ? <span className="text-xs text-gray-500"> (max ₹{c.maxDiscount})</span> : null}
                  </td>
                  <td className="px-4 py-3">₹{c.minOrderValue || 0}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {new Date(c.validFrom).toLocaleDateString('en-IN')} – {new Date(c.validUntil).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(c)} disabled={st === 'expired'} title="Click to toggle"
                      className={`px-2 py-0.5 rounded-full border text-[11px] font-bold capitalize ${statusStyle[st]}`}>{st}</button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-blue-600"><FiEdit2 /></button>
                    <button onClick={() => remove(c)} className="p-1.5 text-gray-500 hover:text-rose-600"><FiTrash2 /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">{editingId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button type="button" onClick={() => setForm(null)}><FiX /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Code *</label>
                <input className={`${input} uppercase font-mono`} value={form.code} onChange={(e) => setField('code', e.target.value)} /></div>
              <div><label className={label}>Status</label>
                <select className={input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select></div>
            </div>
            <div><label className={label}>Description</label>
              <input className={input} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Type</label>
                <select className={input} value={form.discountType} onChange={(e) => setField('discountType', e.target.value)}>
                  <option value="percentage">Percentage</option><option value="flat">Flat (₹)</option>
                </select></div>
              <div><label className={label}>Value *</label>
                <input type="number" min="0" className={input} value={form.discountValue} onChange={(e) => setField('discountValue', e.target.value)} /></div>
              <div><label className={label}>Max discount (₹)</label>
                <input type="number" min="0" className={input} value={form.maxDiscount} onChange={(e) => setField('maxDiscount', e.target.value)} disabled={form.discountType === 'flat'} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Min order (₹)</label>
                <input type="number" min="0" className={input} value={form.minOrderValue} onChange={(e) => setField('minOrderValue', e.target.value)} /></div>
              <div><label className={label}>Total usage limit</label>
                <input type="number" min="1" className={input} placeholder="Unlimited" value={form.usageLimit} onChange={(e) => setField('usageLimit', e.target.value)} /></div>
              <div><label className={label}>Per user limit</label>
                <input type="number" min="1" className={input} value={form.perUserLimit} onChange={(e) => setField('perUserLimit', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Valid from</label>
                <input type="date" className={input} value={form.validFrom} onChange={(e) => setField('validFrom', e.target.value)} /></div>
              <div><label className={label}>Valid until *</label>
                <input type="date" className={input} value={form.validUntil} onChange={(e) => setField('validUntil', e.target.value)} /></div>
            </div>
            {cities.length > 0 && (
              <div><label className={label}>Cities (none selected = all cities)</label>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((city) => {
                    const on = form.cityIds.includes(city._id);
                    return (
                      <button type="button" key={city._id}
                        onClick={() => setField('cityIds', on ? form.cityIds.filter((x) => x !== city._id) : [...form.cityIds, city._id])}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {city.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-sm font-bold text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Coupons;
