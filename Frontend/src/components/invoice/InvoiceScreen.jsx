import React from 'react';
import { FiArrowLeft, FiPrinter } from 'react-icons/fi';
import InvoiceView from './InvoiceView';

// Page chrome shared by the customer and admin invoice routes. "Print / Save as PDF" uses the browser print dialog;
// the print stylesheet hides everything except the invoice sheet.
const InvoiceScreen = ({ invoice, loading, error, onBack, footer }) => (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
        #invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        .no-print { display: none !important; }
      }
    `}</style>
    <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <FiArrowLeft /> Back
      </button>
      {invoice && (
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold">
          <FiPrinter /> Print / Save PDF
        </button>
      )}
    </div>
    {loading && <p className="text-center text-sm text-gray-500 py-20">Preparing your invoice…</p>}
    {!loading && error && <p className="text-center text-sm text-rose-600 py-20 max-w-md mx-auto">{error}</p>}
    {!loading && invoice && <InvoiceView invoice={invoice} />}
    {!loading && invoice && footer && <div className="no-print max-w-3xl mx-auto mt-4">{footer}</div>}
  </div>
);

export default InvoiceScreen;
