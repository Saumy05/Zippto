const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');
const { getSettings, updateSettings } = require('../../controllers/adminControllers/settingsController');

// All routes are protected and for admin only
router.use(authenticate, isAdmin);

router.route('/settings')
  .get(getSettings)
  .put(isSuperAdmin, updateSettings); // only super admins may change platform settings or gateway keys

module.exports = router;
