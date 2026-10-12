import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import bookingService from '../../../../services/bookingService';
import InvoiceScreen from '../../../../components/invoice/InvoiceScreen';
import { useSettings } from '../../../../context/SettingsContext';

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await bookingService.getInvoice(id);
        if (res.success) setInvoice(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load the invoice');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const showBusinessHint = settings?.isB2BEnabled !== false && invoice && !invoice.buyer.gstin;

  return (
    <InvoiceScreen
      invoice={invoice}
      loading={loading}
      error={error}
      onBack={() => navigate(`/user/booking/${id}`)}
      footer={showBusinessHint && (
        <p className="text-xs text-gray-500 text-center">
          Need GST input credit? Add your business GSTIN in <Link to="/user/update-profile" className="font-semibold underline">your profile</Link> before your next booking's invoice is generated.
        </p>
      )}
    />
  );
};

export default Invoice;
