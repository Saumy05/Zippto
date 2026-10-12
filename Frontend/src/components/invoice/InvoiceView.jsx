import React from 'react';

const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const pretty = (s) => (s || '').replace(/_/g, ' ');
const fmtPct = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  if (Math.abs(num - Math.round(num)) < 0.05) {
    return `${Math.round(num)}`;
  }
  return `${Number(num.toFixed(2))}`;
};

const Party = ({ title, children }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{title}</p>
    <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
  </div>
);

/**
 * Printable GST tax invoice. Pure presentation: all numbers come from the server (invoiceService).
 */
const InvoiceView = ({ invoice }) => {
  const { seller, buyer, lines, totals, taxSplit } = invoice;
  const hasGst = totals.gst > 0;

  return (
    <div id="invoice-sheet" className="bg-white text-gray-900 p-6 sm:p-8 max-w-3xl mx-auto border border-gray-200 rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={seller.logo || '/zippto_logo.png'}
              alt={seller.name || 'Zippto'}
              className="w-10 h-10 object-contain rounded-xl border border-gray-100 shadow-xs shrink-0 bg-white"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">{seller.name}</h1>
          </div>
          {(seller.address || seller.gstin || seller.pan || seller.phone || seller.email) && (
            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
              {seller.address && <p className="max-w-xs">{seller.address}</p>}
              {(seller.gstin || seller.pan) && (
                <p>
                  {seller.gstin && <>GSTIN: <span className="font-mono font-semibold text-gray-800">{seller.gstin}</span> </>}
                  {seller.pan && <>· PAN: <span className="font-mono">{seller.pan}</span></>}
                </p>
              )}
              {(seller.phone || seller.email) && (
                <p>{[seller.phone, seller.email].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-black uppercase tracking-wide">{hasGst ? 'Tax Invoice' : 'Invoice'}</p>
          <p className="text-sm font-mono font-semibold mt-1">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-600">Date: {fmtDate(invoice.invoiceDate)}</p>
          <p className="text-xs text-gray-600">Booking: {invoice.bookingNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-4 border-b border-gray-200">
        <Party title="Billed to">
          <p className="font-semibold">{buyer.businessName || buyer.name}</p>
          {buyer.businessName && <p className="text-xs text-gray-600">Attn: {buyer.name}</p>}
          {buyer.gstin && <p className="text-xs">GSTIN: <span className="font-mono font-semibold">{buyer.gstin}</span></p>}
          {buyer.phone && <p className="text-xs text-gray-600">{buyer.phone}</p>}
        </Party>
        <Party title="Service location / place of supply">
          <p className="text-xs text-gray-700">{buyer.address || '—'}</p>
          {invoice.placeOfSupply && <p className="text-xs text-gray-600">Place of supply: {invoice.placeOfSupply}</p>}
          <p className="text-xs text-gray-600">Service date: {fmtDate(invoice.serviceDate)}</p>
        </Party>
      </div>

      <div className="overflow-x-auto py-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase text-gray-500 border-b border-gray-200">
              <th className="text-left py-2 pr-2">Description</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Rate</th>
              <th className="text-right py-2 px-2">Taxable</th>
              <th className="text-right py-2 px-2">GST</th>
              <th className="text-right py-2 pl-2">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((l, i) => (
              <tr key={`${l.description}-${i}`}>
                <td className="py-2 pr-2">
                  {l.description}
                  {invoice.sacCode && l.type !== 'part' && <span className="block text-[10px] text-gray-400">SAC {invoice.sacCode}</span>}
                </td>
                <td className="py-2 px-2 text-right">{l.quantity}</td>
                <td className="py-2 px-2 text-right">{inr(l.rate)}</td>
                <td className="py-2 px-2 text-right">{inr(l.taxableValue)}</td>
                <td className="py-2 px-2 text-right">{inr(l.gstAmount)}<span className="block text-[10px] text-gray-400">{fmtPct(l.gstPercentage)}%</span></td>
                <td className="py-2 pl-2 text-right font-semibold">{inr(l.taxableValue + l.gstAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <dl className="w-full sm:w-80 text-sm space-y-1.5 border-t border-gray-200 pt-3">
          <Row label="Taxable value" value={inr(totals.taxableValue)} />
          {taxSplit.type === 'intra' && (<>
            <Row label="CGST" value={inr(taxSplit.cgst)} />
            <Row label="SGST" value={inr(taxSplit.sgst)} />
          </>)}
          {taxSplit.type === 'inter' && <Row label="IGST" value={inr(taxSplit.igst)} />}
          {taxSplit.type === 'unknown' && hasGst && <Row label="GST" value={inr(totals.gst)} />}
          {totals.visitingCharges > 0 && <Row label="Visiting charges" value={inr(totals.visitingCharges)} />}
          {totals.transportCharges > 0 && <Row label="Transport charges" value={inr(totals.transportCharges)} />}
          {Math.abs(totals.adjustment) >= 0.01 && <Row label="Adjustments / round off" value={inr(totals.adjustment)} />}
          <Row label="Invoice total" value={inr(totals.billTotal)} strong />
          {totals.couponDiscount > 0 && <Row label={`Coupon ${totals.couponCode || ''}`} value={`− ${inr(totals.couponDiscount)}`} />}
          {Math.abs(totals.otherAdjustment) >= 0.01 && <Row label="Other adjustments" value={inr(totals.otherAdjustment)} />}
          <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-black">
            <dt>Amount paid</dt><dd>{inr(totals.amountPaid)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 pt-3 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap justify-between gap-2">
        <span>Paid via {pretty(invoice.payment.method) || '—'}{invoice.payment.reference ? ` · Ref ${invoice.payment.reference}` : ''}</span>
        <span>This is a computer generated invoice.</span>
      </div>
    </div>
  );
};

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between ${strong ? 'font-bold border-t border-gray-100 pt-1.5' : 'text-gray-700'}`}>
    <dt>{label}</dt><dd>{value}</dd>
  </div>
);

export default InvoiceView;
