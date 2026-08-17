const Ticket = require('../../models/Ticket');
const Booking = require('../../models/Booking');

/**
 * Create a new support ticket / dispute
 * POST /api/users/tickets
 */
const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, category, subject, description, attachments, refundRequested, refundAmount } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required.'
      });
    }

    if (bookingId) {
      const booking = await Booking.findOne({ _id: bookingId, userId });
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Associated booking not found.'
        });
      }
    }

    const ticketNumber = `TKT${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    const ticket = await Ticket.create({
      ticketNumber,
      userId,
      bookingId: bookingId || null,
      category: category || 'booking_issue',
      subject: subject.trim(),
      description: description.trim(),
      attachments: attachments || [],
      refundRequested: Boolean(refundRequested),
      refundAmount: Number(refundAmount) || 0,
      refundStatus: refundRequested ? 'pending' : 'none'
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit support ticket.'
    });
  }
};

/**
 * Get user support tickets
 * GET /api/users/tickets
 */
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await Ticket.find({ userId })
      .populate('bookingId', 'bookingNumber serviceName status finalAmount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets.'
    });
  }
};

module.exports = {
  createTicket,
  getUserTickets
};
