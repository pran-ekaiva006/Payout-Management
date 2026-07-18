const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser } = require('../fixtures/factories');
const { handlePayoutStatusUpdate } = require('../../services/payoutReversalService');
const { requestWithdrawal } = require('../../services/withdrawalService');
const User = require('../../models/User');
const Payout = require('../../models/Payout');
const Transaction = require('../../models/Transaction');
const { PAYOUT_TYPE, PAYOUT_STATUS, TRANSACTION_TYPE } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('payoutReversalService', () => {
  it('a withdrawal Payout marked FAILED triggers a reversal credit and balance is restored', async () => {
    const user = await User.create(buildUser({ balance: 50 }));
    const payout = await Payout.create({
      userId: user._id,
      type: PAYOUT_TYPE.WITHDRAWAL,
      amount: 50,
      status: PAYOUT_STATUS.PENDING
    });
    
    // Simulate user balance deduction (happened in requestWithdrawal)
    await User.findByIdAndUpdate(user._id, { $inc: { balance: -50 } });

    await handlePayoutStatusUpdate(payout._id, PAYOUT_STATUS.FAILED);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(50);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(50);
    expect(txns[0].type).toBe(TRANSACTION_TYPE.REVERSAL_CREDIT);
  });

  it('a withdrawal Payout marked SUCCESS creates no reversal transaction and balance is unchanged', async () => {
    const user = await User.create(buildUser({ balance: 0 }));
    const payout = await Payout.create({
      userId: user._id,
      type: PAYOUT_TYPE.WITHDRAWAL,
      amount: 50,
      status: PAYOUT_STATUS.PENDING
    });

    await handlePayoutStatusUpdate(payout._id, PAYOUT_STATUS.SUCCESS);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(0);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(0);
  });

  it('calling handlePayoutStatusUpdate twice throws ConflictError and creates no duplicate reversal', async () => {
    const user = await User.create(buildUser({ balance: 0 }));
    const payout = await Payout.create({
      userId: user._id,
      type: PAYOUT_TYPE.WITHDRAWAL,
      amount: 50,
      status: PAYOUT_STATUS.PENDING
    });

    await handlePayoutStatusUpdate(payout._id, PAYOUT_STATUS.FAILED);

    await expect(handlePayoutStatusUpdate(payout._id, PAYOUT_STATUS.FAILED))
      .rejects.toThrow('Payout already finalized');

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
  });

  it('full flow test: withdraw -> FAILED -> balance restored -> withdraw again succeeds', async () => {
    const user = await User.create(buildUser({ balance: 100 }));
    
    // 1. Withdraw
    const payout = await requestWithdrawal(user._id, 60);
    let updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(40);

    // 2. Mark FAILED
    await handlePayoutStatusUpdate(payout._id, PAYOUT_STATUS.FAILED);
    updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(100);

    // Clear lastWithdrawalAt to bypass cooldown for the test
    await User.findByIdAndUpdate(user._id, { lastWithdrawalAt: null });

    // 3. Withdraw again
    const secondPayout = await requestWithdrawal(user._id, 60);
    expect(secondPayout).toBeDefined();
    expect(secondPayout.amount).toBe(60);
    
    updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(40);
  });
});
