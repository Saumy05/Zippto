const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { createTicket, getUserTickets } = require('../../controllers/userControllers/ticketController');

router.use(authenticate);

router.post('/tickets', createTicket);
router.get('/tickets', getUserTickets);

module.exports = router;
