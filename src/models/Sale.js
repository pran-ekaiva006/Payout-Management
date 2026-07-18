const mongoose = require('mongoose');
const { SALE_STATUS, ADVANCE_STATUS } = require('../config/constants');

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  brand: { type: String, required: true },
  earning: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(SALE_STATUS), default: SALE_STATUS.PENDING },
  advanceStatus: { type: String, enum: Object.values(ADVANCE_STATUS), default: ADVANCE_STATUS.NONE },
  advanceAmount: { type: Number, default: 0 },
  reconciledAt: { type: Date, default: null },
}, { timestamps: true });

saleSchema.index({ status: 1, advanceStatus: 1 });

module.exports = mongoose.model('Sale', saleSchema);
