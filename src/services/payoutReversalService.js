const Payout = require('../models/Payout');
const { recordTransaction } = require('./ledgerService');
const { NotFoundError, ConflictError } = require('../errors/AppError');
const { PAYOUT_STATUS, PAYOUT_TYPE, TRANSACTION_TYPE } = require('../config/constants');

const handlePayoutStatusUpdate = async (payoutId, newStatus) => {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new NotFoundError('Payout not found', 'PAYOUT_NOT_FOUND');

  const terminalStatuses = [
    PAYOUT_STATUS.SUCCESS,
    PAYOUT_STATUS.FAILED,
    PAYOUT_STATUS.CANCELLED,
    PAYOUT_STATUS.REJECTED,
  ];

  if (terminalStatuses.includes(payout.status)) {
    throw new ConflictError('Payout already finalized', 'PAYOUT_ALREADY_FINALIZED');
  }

  payout.status = newStatus;
  await payout.save();

  const failedStatuses = [PAYOUT_STATUS.FAILED, PAYOUT_STATUS.CANCELLED, PAYOUT_STATUS.REJECTED];
  
  if (failedStatuses.includes(newStatus) && payout.type === PAYOUT_TYPE.WITHDRAWAL) {
    await recordTransaction({
      userId: payout.userId,
      amount: payout.amount,
      type: TRANSACTION_TYPE.REVERSAL_CREDIT,
      refId: payout._id,
      refModel: 'Payout',
    });
  }

  return payout;
};

module.exports = { handlePayoutStatusUpdate };
