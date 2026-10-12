const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const { searchAdmin } = require('../../controllers/adminControllers/adminSearchController');

// GET /api/admin/search?q=query
router.get('/search', authenticate, isAdmin, searchAdmin);

module.exports = router;
