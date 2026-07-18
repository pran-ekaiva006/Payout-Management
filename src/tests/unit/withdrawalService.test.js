const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser } = require('../fixtures/factories');
const { requestWithdrawal } = require('../../services/withdrawalService');
const User = require('../../models/User');
const Payout = require('../../models/Payout');
const Transaction = require('../../models/Transaction');
const { PAYOUT_TYPE, TRANSACTION_TYPE } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('withdrawalService', () => {
  it('succeeds when balance sufficient and no prior withdrawal', async () => {
    const user = await User.create(buildUser({ balance: 100 }));
    
    const payout = await requestWithdrawal(user._id, 40);
    
    expect(payout.amount).toBe(40);
    expect(payout.type).toBe(PAYOUT_TYPE.WITHDRAWAL);
    
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(60);
    expect(updatedUser.lastWithdrawalAt).not.toBeNull();
    
    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(-40);
    expect(txns[0].type).toBe(TRANSACTION_TYPE.WITHDRAWAL_DEBIT);
  });

  it('second withdrawal attempt within 24h throws ConflictError, balance unchanged, no second Payout created', async () => {
    const user = await User.create(buildUser({ balance: 100 }));
    await requestWithdrawal(user._id, 20);
    
    await expect(requestWithdrawal(user._id, 20)).rejects.toThrow('Withdrawal cooldown active');
    
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(80);
    
    const payouts = await Payout.find({ userId: user._id });
    expect(payouts).toHaveLength(1);
  });

  it('withdrawal amount greater than balance throws InsufficientBalanceError, lastWithdrawalAt is NOT updated', async () => {
    const user = await User.create(buildUser({ balance: 50 }));
    
    await expect(requestWithdrawal(user._id, 60)).rejects.toThrow('Insufficient balance for withdrawal');
    
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.lastWithdrawalAt).toBeNull();
    expect(updatedUser.balance).toBe(50);
  });

  it('two concurrent requestWithdrawal calls for the same user — exactly one resolves and one rejects', async () => {
    const user = await User.create(buildUser({ balance: 100 }));
    
    const results = await Promise.allSettled([
      requestWithdrawal(user._id, 20),
      requestWithdrawal(user._id, 20)
    ]);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.code).toBe('WITHDRAWAL_COOLDOWN_ACTIVE');
    
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(80);
    
    const payouts = await Payout.find({ userId: user._id });
    expect(payouts).toHaveLength(1);
  });
});
