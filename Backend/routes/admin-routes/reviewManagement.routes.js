const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllReviews,
  updateReviewStatus,
  getReviewStats
} = require('../../controllers/adminControllers/adminReviewController');

// All routes require authentication and admin role
router.use(authenticate, isAdmin, isSuperAdmin); // finance/oversight: super admin only (matches the admin menu)

// Get all reviews
router.get('/reviews', getAllReviews);

// Get review statistics
router.get('/reviews/stats', getReviewStats);

// Update review status
router.patch('/reviews/:id/status', updateReviewStatus);

module.exports = router;
