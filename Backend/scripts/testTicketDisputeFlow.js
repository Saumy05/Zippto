const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { updateTicketStatus } = require('../controllers/adminControllers/adminTicketController');

async function testTicketDisputeFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    const uniqueId = Date.now();
    // 1. Create test user with initial wallet balance 0
    let user = await User.create({
      name: 'Dispute User',
      phone: `999${String(uniqueId).slice(-7)}`,
      isVerified: true,
      wallet: { balance: 0, transactions: [] }
    });

    console.log('Created test user:', user._id, 'Initial wallet:', user.wallet.balance);

    // 2. Create customer dispute ticket with ₹200 refund request
    const ticketNumber = `TKTTEST${uniqueId}`;
    const ticket = await Ticket.create({
      ticketNumber,
      userId: user._id,
      category: 'payment_dispute',
      subject: 'Double charge on service',
      description: 'Charged twice for AC cleaning service',
      refundRequested: true,
      refundAmount: 200,
      refundStatus: 'pending',
      status: 'open'
    });

    console.log('Created customer ticket:', ticket.ticketNumber, 'Refund requested: ₹', ticket.refundAmount);

    // 3. Admin approves refund
    const req = {
      params: { id: ticket._id },
      body: {
        status: 'resolved',
        refundStatus: 'approved',
        adminNotes: 'Verified duplicate charge. Approved ₹200 refund to wallet.'
      }
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };

    await updateTicketStatus(req, res);
    console.log('Admin processed ticket. Response success:', res.responseData?.success);

    // 4. Verify user wallet balance updated
    const updatedUser = await User.findById(user._id);
    console.log('Updated user wallet balance:', updatedUser.wallet.balance);

    if (updatedUser.wallet.balance === 200) {
      console.log('SUCCESS: ₹200 wallet refund credited properly!');
    } else {
      throw new Error(`Wallet balance mismatch: Expected 200, got ${updatedUser.wallet.balance}`);
    }

    // Clean up
    await Ticket.findByIdAndDelete(ticket._id);
    await User.findByIdAndDelete(user._id);

    console.log('Step 5 Support ticket & dispute refund flow verified & cleaned up.');
    process.exit(0);
  } catch (error) {
    console.error('Test ticket dispute flow failed:', error);
    process.exit(1);
  }
}

testTicketDisputeFlow();
