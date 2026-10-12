import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiKey, FiSave, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getSettings, updateSettings } from '../../services/settingsService';
import LogoLoader from '../../../../components/common/LogoLoader';

// Secrets come back masked from the API ("••••1234"). Leaving a secret field untouched keeps the stored value;
// typing a new value replaces it.
const GROUPS = [
  {
    title: 'Razorpay (payments)',
    hint: 'Used for online payments, QR collection, refunds and webhooks. Keys saved here override the server .env values.',
    fields: [
      { key: 'razorpayKeyId', label: 'Key ID', secret: false, placeholder: 'rzp_live_xxxxxxxx' },
      { key: 'razorpayKeySecret', label: 'Key Secret', secret: true },
      { key: 'razorpayWebhookSecret', label: 'Webhook Secret', secret: true }
    ]
  },
  {
    title: 'Cloudinary (image uploads)',
    hint: 'Used for image uploads. Without Cloudinary keys, files are stored on the server disk.',
    fields: [
      { key: 'cloudinaryCloudName', label: 'Cloud Name', secret: false },
      { key: 'cloudinaryApiKey', label: 'API Key', secret: false },
      { key: 'cloudinaryApiSecret', label: 'API Secret', secret: true }
    ]
  }
];

const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

const Integrations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState({});   // what the server currently has (secrets masked)
  const [values, setValues] = useState({});   // what the admin is typing

  const load = async () => {
    try {
      const res = await getSettings();
      if (res.success) {
        setStored(res.settings);
        setValues(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.secret ? '' : (res.settings[f.key] || '')])));
      }
    } catch {
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    // Only send what changed: non-secret fields that differ, and secrets that were typed
    const payload = {};
    ALL_FIELDS.forEach((f) => {
      const typed = (values[f.key] || '').trim();
      if (f.secret) {
        if (typed) payload[f.key] = typed;
      } else if (typed !== (stored[f.key] || '')) {
        payload[f.key] = typed;
      }
    });
    if (Object.keys(payload).length === 0) return toast('Nothing to save');
    if (payload.razorpayKeyId !== undefined && payload.razorpayKeyId && !/^rzp_(test|live)_/.test(payload.razorpayKeyId)) {
      return toast.error('Razorpay Key ID should start with rzp_test_ or rzp_live_');
    }
    try {
      setSaving(true);
      const res = await updateSettings(payload);
      if (res.success) {
        toast.success('Integration keys saved and applied');
        await load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save keys');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LogoLoader />;

  const input = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white font-mono';

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/admin/settings')} className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center" title="Back to Settings">
          <FiArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2"><FiKey /> Payment & Storage Keys</h1>
          <p className="text-xs text-gray-500">Changes apply immediately — no server restart needed.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title} className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">{group.title}</h2>
              <p className="text-xs text-gray-500">{group.hint}</p>
            </div>
            {group.fields.map((f) => {
              const hasStored = f.secret && !!stored[f.key];
              return (
                <div key={f.key}>
                  <label className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    <span>{f.label}</span>
                    {f.secret && (
                      hasStored
                        ? <span className="flex items-center gap-1 text-emerald-600 normal-case font-semibold"><FiCheckCircle /> Saved ({stored[f.key]})</span>
                        : <span className="flex items-center gap-1 text-amber-600 normal-case font-semibold"><FiAlertCircle /> Not set (using server .env)</span>
                    )}
                  </label>
                  <input
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off"
                    className={input}
                    value={values[f.key] || ''}
                    placeholder={f.secret ? (hasStored ? 'Leave blank to keep the saved secret' : 'Paste secret') : f.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-50">
            <FiSave /> {saving ? 'Saving…' : 'Save Keys'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Integrations;
