import React, { useState, useEffect, useCallback } from 'react';
import { FiLifeBuoy, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import ticketService from '../../services/ticketService';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['booking_issue', 'payment_dispute', 'vendor_behavior', 'app_issue', 'other'];

const pretty = (s) => (s || '').replace(/_/g, ' ');
const badge = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200'
};
const prioColor = { low: 'text-gray-500', medium: 'text-blue-600', high: 'text-orange-600', urgent: 'text-rose-600' };

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await ticketService.getAll(params);
      if (res.success) setTickets(res.tickets);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const open = (t) => {
    setActive(t);
    setDraft({ status: t.status, priority: t.priority, adminNotes: t.adminNotes || '', refundStatus: t.refundStatus });
  };

  const save = async () => {
    try {
      setSaving(true);
      const body = { status: draft.status, priority: draft.priority, adminNotes: draft.adminNotes };
      // Only send a refund decision when it changed (approving credits the user's wallet exactly once)
      if (draft.refundStatus !== active.refundStatus) body.refundStatus = draft.refundStatus;
      const res = await ticketService.update(active._id, body);
      if (res.success) {
        toast.success(body.refundStatus === 'approved' ? 'Ticket updated and refund credited to wallet' : 'Ticket updated');
        setActive(null);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const select = 'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-500 capitalize';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2"><FiLifeBuoy /> Support Tickets</h1>
        <p className="text-xs text-gray-500">Customer issues and refund disputes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['status', STATUSES], ['priority', PRIORITIES], ['category', CATEGORIES]].map(([key, opts]) => (
          <select key={key} className={select} value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
            <option value="">All {key}</option>
            {opts.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}
          </select>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
            <tr>{['Ticket', 'Customer', 'Category', 'Priority', 'Status', 'Refund', 'Created'].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 font-bold whitespace-nowrap">{h}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tickets found</td></tr>
            ) : tickets.map((t) => (
              <tr key={t._id} onClick={() => open(t)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs font-bold text-gray-900">{t.ticketNumber}</div>
                  <div className="text-xs text-gray-500 max-w-[220px] truncate">{t.subject}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{t.userId?.name || '—'}</div>
                  <div className="text-xs text-gray-500">{t.userId?.phone}</div>
                </td>
                <td className="px-4 py-3 capitalize whitespace-nowrap">{pretty(t.category)}</td>
                <td className={`px-4 py-3 capitalize font-bold ${prioColor[t.priority]}`}>{t.priority}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold capitalize ${badge[t.status]}`}>{pretty(t.status)}</span></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {t.refundRequested ? <>₹{t.refundAmount} <span className="text-xs text-gray-500 capitalize">({t.refundStatus})</span></> : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">{active.ticketNumber}</h2>
              <button onClick={() => setActive(null)}><FiX /></button>
            </div>
            <div>
              <p className="font-bold text-gray-900">{active.subject}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{active.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                {active.userId?.name} · {active.userId?.phone}
                {active.bookingId?.bookingNumber ? ` · Booking ${active.bookingId.bookingNumber}` : ''}
              </p>
              {active.attachments?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {active.attachments.map((a) => <a key={a} href={a} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Attachment</a>)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-gray-700">Status
                <select className={`${select} w-full mt-1`} value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                  {STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
                </select></label>
              <label className="text-xs font-bold text-gray-700">Priority
                <select className={`${select} w-full mt-1`} value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                  {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
            </div>
            {active.refundRequested && (
              <label className="text-xs font-bold text-gray-700 block">
                Refund request: ₹{active.refundAmount}
                <select className={`${select} w-full mt-1`} value={draft.refundStatus} disabled={active.refundStatus === 'approved'}
                  onChange={(e) => setDraft((d) => ({ ...d, refundStatus: e.target.value }))}>
                  {['pending', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {active.refundStatus === 'approved'
                  ? <span className="font-normal text-gray-500">Already credited to the user's wallet.</span>
                  : <span className="font-normal text-gray-500">Approving credits ₹{active.refundAmount} to the user's wallet.</span>}
              </label>
            )}
            <label className="text-xs font-bold text-gray-700 block">Admin notes
              <textarea rows={3} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                value={draft.adminNotes} onChange={(e) => setDraft((d) => ({ ...d, adminNotes: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setActive(null)} className="px-4 py-2 text-sm font-bold text-gray-600">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
