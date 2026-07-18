const Sale = require('../models/Sale');
const Payout = require('../models/Payout');
const { recordTransaction } = require('../services/ledgerService');
const {
  ADVANCE_PAYOUT_RATE,
  SALE_STATUS,
  ADVANCE_STATUS,
  PAYOUT_TYPE,
  PAYOUT_STATUS,
  TRANSACTION_TYPE,
} = require('../config/constants');

const runAdvancePayoutJob = async () => {
  const eligibleSales = await Sale.find({
    status: SALE_STATUS.PENDING,
    advanceStatus: ADVANCE_STATUS.NONE,
  });

  let claimed = 0;
  let totalAdvanced = 0;

  for (const sale of eligibleSales) {
    const advanceAmount = sale.earning * ADVANCE_PAYOUT_RATE;

    const claimedSale = await Sale.findOneAndUpdate(
      { _id: sale._id, advanceStatus: ADVANCE_STATUS.NONE },
      { advanceStatus: ADVANCE_STATUS.PAID, advanceAmount },
      { returnDocument: 'after' }
    );

    if (!claimedSale) continue;

    await recordTransaction({
      userId: sale.userId,
      amount: advanceAmount,
      type: TRANSACTION_TYPE.ADVANCE_CREDIT,
      refId: sale._id,
      refModel: 'Sale',
    });

    await Payout.create({
      userId: sale.userId,
      saleId: sale._id,
      type: PAYOUT_TYPE.ADVANCE,
      amount: advanceAmount,
      status: PAYOUT_STATUS.SUCCESS,
    });

    claimed++;
    totalAdvanced += advanceAmount;
  }

  return { claimed, totalAdvanced };
};

module.exports = { runAdvancePayoutJob };
