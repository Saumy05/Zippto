const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const { getAllTickets, updateTicketStatus } = require('../../controllers/adminControllers/adminTicketController');

router.use(authenticate, isAdmin);

router.get('/tickets', getAllTickets);
router.put('/tickets/:id', updateTicketStatus);

module.exports = router;
