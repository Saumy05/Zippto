const Ticket = require('../../models/Ticket');
const User = require('../../models/User');

/**
 * Get all support tickets / disputes (Admin)
 * GET /api/admin/tickets
 */
const getAllTickets = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('userId', 'name phone email')
      .populate('bookingId', 'bookingNumber serviceName finalAmount status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets.'
    });
  }
};

/**
 * Resolve ticket & approve refund (Admin)
 * PUT /api/admin/tickets/:id
 */
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, priority, refundStatus } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    if (status) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (priority) ticket.priority = priority;

    // Handle wallet refund approval
    if (refundStatus === 'approved' && ticket.refundStatus !== 'approved' && ticket.refundAmount > 0) {
      ticket.refundStatus = 'approved';

      // Credit user wallet
      const user = await User.findById(ticket.userId);
      if (user) {
        user.wallet = user.wallet || { balance: 0, transactions: [] };
        user.wallet.balance = (user.wallet.balance || 0) + ticket.refundAmount;
        user.wallet.transactions = user.wallet.transactions || [];
        user.wallet.transactions.push({
          type: 'credit',
          amount: ticket.refundAmount,
          description: `Dispute refund for Ticket #${ticket.ticketNumber}`,
          createdAt: new Date()
        });
        await user.save();
      }
    } else if (refundStatus) {
      ticket.refundStatus = refundStatus;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully.',
      ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket.'
    });
  }
};

module.exports = {
  getAllTickets,
  updateTicketStatus
};
