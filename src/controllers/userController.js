const User = require('../models/User');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const sendSuccess = require('../utils/apiResponse');
const { NotFoundError } = require('../errors/AppError');

const getUserBalance = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

  sendSuccess(res, 200, {
    balance: user.balance,
    lastWithdrawalAt: user.lastWithdrawalAt,
  });
});

const getUserTransactions = catchAsync(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ userId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ userId: id }),
  ]);

  sendSuccess(res, 200, {
    transactions,
    page,
    limit,
    total,
  });
});

module.exports = { getUserBalance, getUserTransactions };
