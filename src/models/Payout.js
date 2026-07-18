const mongoose = require('mongoose');
const { PAYOUT_TYPE, PAYOUT_STATUS } = require('../config/constants');

const payoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  type: { type: String, enum: Object.values(PAYOUT_TYPE), required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: Object.values(PAYOUT_STATUS), default: PAYOUT_STATUS.PENDING },
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
