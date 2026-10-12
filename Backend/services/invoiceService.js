const Booking = require('../models/Booking');
const VendorBill = require('../models/VendorBill');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { PAYMENT_STATUS } = require('../utils/constants');

class InvoiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const isPaid = (b) =>
  [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR].includes(b.paymentStatus) || b.cashCollected === true;

// Indian financial year label, e.g. 2026-27 for any date between Apr 2026 and Mar 2027
const financialYear = (d) => {
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
};

/**
 * Assigns the invoice number the first time an invoice is requested for a paid booking.
 * Numbers come from a single atomic counter and are never reused: the booking is claimed first,
 * so concurrent requests cannot burn a number or issue two invoices for the same booking.
 */
const ensureInvoiceIssued = async (booking, buyer) => {
  if (booking.invoiceNumber && booking.invoiceNumber !== 'PENDING') return booking;

  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, $or: [{ invoiceNumber: null }, { invoiceNumber: { $exists: false } }] },
    { $set: { invoiceNumber: 'PENDING' } },
    { new: true }
  );

  if (!claimed) {
    // Another request is issuing (or has issued) it: wait briefly for the final number
    for (let i = 0; i < 10; i += 1) {
      const fresh = await Booking.findById(booking._id);
      if (fresh.invoiceNumber && fresh.invoiceNumber !== 'PENDING') return fresh;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new InvoiceError('Invoice is being generated, please try again in a moment', 409);
  }

  try {
    const settings = await Settings.findOneAndUpdate(
      { type: 'global' },
      { $inc: { currentInvoiceNumber: 1 }, $setOnInsert: { type: 'global' } },
      { new: true, upsert: true }
    );
    const now = new Date();
    const prefix = (settings.invoicePrefix || 'INV').trim();
    const number = `${prefix}/${financialYear(now)}/${String(settings.currentInvoiceNumber).padStart(6, '0')}`;

    claimed.invoiceNumber = number;
    claimed.invoiceIssuedAt = now;
    claimed.invoiceBuyer = buyer;
    await claimed.save();
    return claimed;
  } catch (err) {
    // Release the claim so the invoice can be issued on the next request
    await Booking.updateOne({ _id: booking._id, invoiceNumber: 'PENDING' }, { $set: { invoiceNumber: null } });
    throw err;
  }
};

/**
 * Builds the tax invoice for a paid booking. `requester` restricts which bookings a caller may see:
 * pass { userId } for customers, or {} for admins.
 */
const getInvoiceForBooking = async (bookingId, { userId } = {}) => {
  const query = { _id: bookingId };
  if (userId) query.userId = userId;
  let booking = await Booking.findOne(query);
  if (!booking) throw new InvoiceError('Booking not found', 404);
  if (!isPaid(booking)) throw new InvoiceError('An invoice is available once the payment is complete');

  const [settings, bill, user] = await Promise.all([
    Settings.findOne({ type: 'global' }).lean(),
    VendorBill.findOne({ bookingId: booking._id }).lean(),
    User.findById(booking.userId).select('name phone email businessProfile').lean()
  ]);
  const company = settings || {};

  const flagB2B = company.isB2BEnabled !== false;
  const buyer = booking.invoiceBuyer?.name
    ? booking.invoiceBuyer
    : {
        name: user?.name || 'Customer',
        businessName: flagB2B ? (user?.businessProfile?.businessName || '') : '',
        gstin: flagB2B ? (user?.businessProfile?.gstin || '') : ''
      };

  booking = await ensureInvoiceIssued(booking, buyer);
  const frozenBuyer = booking.invoiceBuyer || buyer;

  // ── Line items ──
  const lines = [];
  const pushLine = (type, item) => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.price) || 0;
    const taxable = round2(rate * qty);
    const rawGstPct = Number(item.gstPercentage) || 0;
    const gstPct = Math.abs(rawGstPct - Math.round(rawGstPct)) < 0.05 ? Math.round(rawGstPct) : round2(rawGstPct);
    const gst = item.gstAmount !== undefined && item.gstAmount !== null ? round2(item.gstAmount) : round2(taxable * gstPct / 100);
    lines.push({ type, description: item.name || 'Item', quantity: qty, rate, taxableValue: taxable, gstPercentage: gstPct, gstAmount: gst });
  };

  let visiting = 0;
  let transport = 0;
  let billTotal;
  if (bill) {
    (bill.services || []).forEach((s) => pushLine('service', s));
    (bill.parts || []).forEach((p) => pushLine('part', p));
    (bill.customItems || []).forEach((c) => pushLine('item', c));
    visiting = round2(bill.visitingCharges);
    transport = round2(bill.transportCharges);
    billTotal = round2(bill.grandTotal);
  } else {
    // Determine the service GST percentage cleanly:
    // When tax is rounded to rupees, (tax / basePrice) * 100 produces fractional rounding noise (e.g. 17.017017017018%).
    // We round to the nearest whole percentage if within 0.15%, or 2 decimal places otherwise.
    const defaultGstPct = company.serviceGstPercentage !== undefined ? Number(company.serviceGstPercentage) : 18;
    let gstPct = defaultGstPct;
    if (booking.basePrice && booking.tax !== undefined) {
      const rawPct = (booking.tax / booking.basePrice) * 100;
      gstPct = Math.abs(rawPct - Math.round(rawPct)) < 0.15 ? Math.round(rawPct) : round2(rawPct);
    }

    pushLine('service', {
      name: booking.serviceName || 'Service',
      price: booking.basePrice,
      quantity: 1,
      gstAmount: booking.tax,
      gstPercentage: gstPct
    });
    visiting = round2(booking.visitingCharges);
    billTotal = round2((booking.basePrice || 0) + (booking.tax || 0) + visiting);
  }

  const taxableTotal = round2(lines.reduce((s, l) => s + l.taxableValue, 0));
  const gstTotal = round2(lines.reduce((s, l) => s + l.gstAmount, 0));
  // The bill total is authoritative: any difference (rounding, plan adjustments) is shown, not hidden
  const adjustment = round2(billTotal - (taxableTotal + gstTotal + visiting + transport));

  const couponDiscount = round2(booking.couponDiscount);
  const amountPaid = round2(booking.finalAmount);
  const walletOrOtherAdjustment = round2(billTotal - couponDiscount - amountPaid);

  // ── Tax split ──
  const sellerState = String(company.companyState || '').trim().toLowerCase();
  const placeOfSupply = String(booking.address?.state || '').trim();
  let taxSplit;
  if (sellerState && placeOfSupply) {
    taxSplit = sellerState === placeOfSupply.toLowerCase()
      ? { type: 'intra', cgst: round2(gstTotal / 2), sgst: round2(gstTotal - round2(gstTotal / 2)), igst: 0 }
      : { type: 'inter', cgst: 0, sgst: 0, igst: gstTotal };
  } else {
    taxSplit = { type: 'unknown', cgst: 0, sgst: 0, igst: 0 };
  }

  return {
    invoiceNumber: booking.invoiceNumber,
    invoiceDate: booking.invoiceIssuedAt,
    bookingNumber: booking.bookingNumber,
    seller: {
      name: company.companyName || 'Zippto',
      logo: company.companyLogo || '/zippto_logo.png',
      gstin: company.companyGSTIN || '',
      pan: company.companyPAN || '',
      address: [company.companyAddress, company.companyCity, company.companyState, company.companyPincode].filter(Boolean).join(', '),
      phone: company.companyPhone || '',
      email: company.companyEmail || ''
    },
    buyer: {
      name: frozenBuyer.name,
      businessName: frozenBuyer.businessName || '',
      gstin: frozenBuyer.gstin || '',
      phone: user?.phone || '',
      email: user?.email || '',
      address: [booking.address?.addressLine1, booking.address?.addressLine2, booking.address?.city, booking.address?.state, booking.address?.pincode].filter(Boolean).join(', ')
    },
    placeOfSupply,
    sacCode: company.sacCode || '',
    serviceDate: booking.scheduledDate,
    lines,
    totals: {
      taxableValue: taxableTotal,
      gst: gstTotal,
      visitingCharges: visiting,
      transportCharges: transport,
      adjustment,
      billTotal,
      couponCode: booking.couponCode || null,
      couponDiscount,
      otherAdjustment: walletOrOtherAdjustment,
      amountPaid
    },
    taxSplit,
    payment: {
      method: booking.paymentMethod,
      status: booking.paymentStatus,
      reference: booking.paymentId || null
    },
    currency: company.currency || 'INR'
  };
};

module.exports = { getInvoiceForBooking, InvoiceError };
