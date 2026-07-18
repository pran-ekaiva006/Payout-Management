const mongoose = require('mongoose');
const { SALE_STATUS, ADVANCE_STATUS } = require('../../config/constants');

const buildUser = (overrides = {}) => ({
  name: 'Test User',
  balance: 0,
  lastWithdrawalAt: null,
  ...overrides,
});

const buildSale = (userId, overrides = {}) => ({
  userId: userId || new mongoose.Types.ObjectId(),
  brand: 'TestBrand',
  earning: 1000,
  status: SALE_STATUS.PENDING,
  advanceStatus: ADVANCE_STATUS.NONE,
  advanceAmount: 0,
  ...overrides,
});

module.exports = { buildUser, buildSale };
