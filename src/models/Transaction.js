const mongoose = require('mongoose');
const { TRANSACTION_TYPE } = require('../config/constants');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  refModel: { type: String, enum: ['Sale', 'Payout'], required: true },
  balanceAfter: { type: Number, required: true },
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
