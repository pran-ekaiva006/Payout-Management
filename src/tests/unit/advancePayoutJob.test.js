const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser, buildSale } = require('../fixtures/factories');
const { runAdvancePayoutJob } = require('../../jobs/advancePayoutJob');
const User = require('../../models/User');
const Sale = require('../../models/Sale');
const Transaction = require('../../models/Transaction');
const Payout = require('../../models/Payout');
const { ADVANCE_STATUS, ADVANCE_PAYOUT_RATE, TRANSACTION_TYPE, PAYOUT_TYPE } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('advancePayoutJob', () => {
  it('pays exactly 10% advance on a pending sale', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id, { earning: 1000 }));

    const result = await runAdvancePayoutJob();

    expect(result).toEqual({ claimed: 1, totalAdvanced: 100 });

    const updatedSale = await Sale.findById(sale._id);
    expect(updatedSale.advanceStatus).toBe(ADVANCE_STATUS.PAID);
    expect(updatedSale.advanceAmount).toBe(1000 * ADVANCE_PAYOUT_RATE);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(100);
    expect(txns[0].type).toBe(TRANSACTION_TYPE.ADVANCE_CREDIT);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(100);
  });

  it('running twice does not double-pay', async () => {
    const user = await User.create(buildUser());
    await Sale.create(buildSale(user._id, { earning: 500 }));

    const first = await runAdvancePayoutJob();
    expect(first).toEqual({ claimed: 1, totalAdvanced: 50 });

    const second = await runAdvancePayoutJob();
    expect(second).toEqual({ claimed: 0, totalAdvanced: 0 });

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(50);
  });

  it('skips sales already marked as PAID', async () => {
    const user = await User.create(buildUser());
    await Sale.create(buildSale(user._id, { advanceStatus: ADVANCE_STATUS.PAID, advanceAmount: 100 }));

    const result = await runAdvancePayoutJob();
    expect(result).toEqual({ claimed: 0, totalAdvanced: 0 });

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(0);
  });

  it('concurrent runs on 5 sales produce exactly 5 transactions', async () => {
    const user = await User.create(buildUser());
    for (let i = 0; i < 5; i++) {
      await Sale.create(buildSale(user._id, { earning: 200 }));
    }

    const [r1, r2] = await Promise.all([
      runAdvancePayoutJob(),
      runAdvancePayoutJob(),
    ]);

    expect(r1.claimed + r2.claimed).toBe(5);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(5);

    const payouts = await Payout.find({ userId: user._id, type: PAYOUT_TYPE.ADVANCE });
    expect(payouts).toHaveLength(5);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(5 * 200 * ADVANCE_PAYOUT_RATE);
  });
});
