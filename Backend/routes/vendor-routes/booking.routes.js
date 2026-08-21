const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getVendorBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  addVendorNotes,
  startSelfJob,
  vendorReachedLocation,
  verifySelfVisit,
  completeSelfJob,
  collectSelfCash,
  getVendorRatings,
  getPendingBookings
} = require('../../controllers/bookingControllers/vendorBookingController');

// Validation rules
const rejectBookingValidation = [
  body('reason').optional().trim()
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'])
    .withMessage('Invalid status')
];

const addNotesValidation = [
  body('notes').trim().notEmpty().withMessage('Notes are required')
];

// Routes
router.get('/pending', authenticate, isVendor, getPendingBookings); // Fetch missed alerts on reconnect
router.get('/ratings', authenticate, isVendor, getVendorRatings);
router.get('/', authenticate, isVendor, getVendorBookings);
router.get('/:id', authenticate, isVendor, getBookingById);
router.post('/:id/accept', authenticate, isVendor, acceptBooking);
router.post('/:id/reject', authenticate, isVendor, rejectBookingValidation, rejectBooking);
router.put('/:id/status', authenticate, isVendor, updateStatusValidation, updateBookingStatus);
router.post('/:id/notes', authenticate, isVendor, addNotesValidation, addVendorNotes);

// Direct Partner Job Routes
router.post('/:id/self/start', authenticate, isVendor, startSelfJob);
router.post('/:id/self/reached', authenticate, isVendor, vendorReachedLocation);
router.post('/:id/self/visit/verify', authenticate, isVendor, verifySelfVisit);
router.post('/:id/self/complete', authenticate, isVendor, completeSelfJob);
router.post('/:id/self/payment/collect', authenticate, isVendor, collectSelfCash);

module.exports = router;

