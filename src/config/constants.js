const ADVANCE_PAYOUT_RATE = 0.10;
const WITHDRAWAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SALE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const ADVANCE_STATUS = {
  NONE: 'none',
  PAID: 'paid',
};

const PAYOUT_TYPE = {
  ADVANCE: 'advance',
  ADJUSTMENT: 'adjustment',
  WITHDRAWAL: 'withdrawal',
};

const PAYOUT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

const TRANSACTION_TYPE = {
  ADVANCE_CREDIT: 'advance_credit',
  FINAL_ADJUSTMENT: 'final_adjustment',
  WITHDRAWAL_DEBIT: 'withdrawal_debit',
  REVERSAL_CREDIT: 'reversal_credit',
};

module.exports = {
  ADVANCE_PAYOUT_RATE,
  WITHDRAWAL_COOLDOWN_MS,
  SALE_STATUS,
  ADVANCE_STATUS,
  PAYOUT_TYPE,
  PAYOUT_STATUS,
  TRANSACTION_TYPE,
};
