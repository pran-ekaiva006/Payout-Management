const User = require('../models/User');
const Payout = require('../models/Payout');
const { recordTransaction } = require('./ledgerService');
const { NotFoundError, InsufficientBalanceError, ConflictError } = require('../errors/AppError');
const { WITHDRAWAL_COOLDOWN_MS, PAYOUT_TYPE, PAYOUT_STATUS, TRANSACTION_TYPE } = require('../config/constants');

const requestWithdrawal = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

  if (amount > user.balance) {
    throw new InsufficientBalanceError('Insufficient balance for withdrawal', 'INSUFFICIENT_BALANCE');
  }

  const claimDate = new Date();
  const cooldownDate = new Date(claimDate.getTime() - WITHDRAWAL_COOLDOWN_MS);

  const claimedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { lastWithdrawalAt: null },
        { lastWithdrawalAt: { $lte: cooldownDate } },
      ],
    },
    { lastWithdrawalAt: claimDate },
    { returnDocument: 'after' }
  );

  if (!claimedUser) {
    throw new ConflictError('Withdrawal cooldown active', 'WITHDRAWAL_COOLDOWN_ACTIVE');
  }

  const payout = await Payout.create({
    userId,
    type: PAYOUT_TYPE.WITHDRAWAL,
    amount,
    status: PAYOUT_STATUS.PENDING,
  });

  await recordTransaction({
    userId,
    amount: -amount,
    type: TRANSACTION_TYPE.WITHDRAWAL_DEBIT,
    refId: payout._id,
    refModel: 'Payout',
  });

  return payout;
};

module.exports = { requestWithdrawal };
