const Sale = require('../models/Sale');
const { recordTransaction } = require('./ledgerService');
const { NotFoundError, ConflictError, ValidationError } = require('../errors/AppError');
const { SALE_STATUS, TRANSACTION_TYPE } = require('../config/constants');

const reconcileSale = async (saleId, newStatus) => {
  if (newStatus !== SALE_STATUS.APPROVED && newStatus !== SALE_STATUS.REJECTED) {
    throw new ValidationError('Status must be approved or rejected', 'INVALID_STATUS');
  }

  const sale = await Sale.findById(saleId);
  if (!sale) throw new NotFoundError('Sale not found', 'SALE_NOT_FOUND');

  if (sale.status !== SALE_STATUS.PENDING) {
    throw new ConflictError('Sale already reconciled', 'SALE_ALREADY_RECONCILED');
  }

  sale.status = newStatus;
  sale.reconciledAt = new Date();
  await sale.save();

  const adjustment = newStatus === SALE_STATUS.APPROVED
    ? sale.earning - sale.advanceAmount
    : -(sale.advanceAmount) || 0;

  if (adjustment !== 0) {
    await recordTransaction({
      userId: sale.userId,
      amount: adjustment,
      type: TRANSACTION_TYPE.FINAL_ADJUSTMENT,
      refId: sale._id,
      refModel: 'Sale',
    });
  }

  return { sale, adjustment };
};

module.exports = { reconcileSale };
