const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser } = require('../fixtures/factories');
const { recordTransaction } = require('../../services/ledgerService');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const { TRANSACTION_TYPE } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('ledgerService.recordTransaction', () => {
  it('positive amount increases balance', async () => {
    const user = await User.create(buildUser());
    await recordTransaction({
      userId: user._id,
      amount: 100,
      type: TRANSACTION_TYPE.ADVANCE_CREDIT,
      refId: new mongoose.Types.ObjectId(),
      refModel: 'Sale',
    });
    const updated = await User.findById(user._id);
    expect(updated.balance).toBe(100);
  });

  it('negative amount decreases balance', async () => {
    const user = await User.create(buildUser({ balance: 200 }));
    await recordTransaction({
      userId: user._id,
      amount: -50,
      type: TRANSACTION_TYPE.WITHDRAWAL_DEBIT,
      refId: new mongoose.Types.ObjectId(),
      refModel: 'Payout',
    });
    const updated = await User.findById(user._id);
    expect(updated.balance).toBe(150);
  });

  it('balanceAfter matches actual user balance post-update', async () => {
    const user = await User.create(buildUser({ balance: 50 }));
    const txn = await recordTransaction({
      userId: user._id,
      amount: 30,
      type: TRANSACTION_TYPE.ADVANCE_CREDIT,
      refId: new mongoose.Types.ObjectId(),
      refModel: 'Sale',
    });
    const updated = await User.findById(user._id);
    expect(txn.balanceAfter).toBe(80);
    expect(updated.balance).toBe(80);
  });

  it('throws NotFoundError for non-existent user', async () => {
    await expect(
      recordTransaction({
        userId: new mongoose.Types.ObjectId(),
        amount: 100,
        type: TRANSACTION_TYPE.ADVANCE_CREDIT,
        refId: new mongoose.Types.ObjectId(),
        refModel: 'Sale',
      })
    ).rejects.toThrow('User not found');
  });

  it('10 concurrent +1 calls yield balance=10 and 10 transactions', async () => {
    const user = await User.create(buildUser());
    const refId = new mongoose.Types.ObjectId();

    await Promise.all(
      Array.from({ length: 10 }, () =>
        recordTransaction({
          userId: user._id,
          amount: 1,
          type: TRANSACTION_TYPE.ADVANCE_CREDIT,
          refId,
          refModel: 'Sale',
        })
      )
    );

    const updated = await User.findById(user._id);
    const txns = await Transaction.find({ userId: user._id });
    expect(updated.balance).toBe(10);
    expect(txns).toHaveLength(10);
  });
});
