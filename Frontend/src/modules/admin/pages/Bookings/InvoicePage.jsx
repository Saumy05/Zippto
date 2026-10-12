import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../services/api';
import InvoiceScreen from '../../../../components/invoice/InvoiceScreen';

const AdminInvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/bookings/${id}/invoice`);
        if (res.data.success) setInvoice(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load the invoice');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return <InvoiceScreen invoice={invoice} loading={loading} error={error} onBack={() => navigate('/admin/bookings')} />;
};

export default AdminInvoicePage;
