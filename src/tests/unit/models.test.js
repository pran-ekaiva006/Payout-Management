const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser, buildSale } = require('../fixtures/factories');
const User = require('../../models/User');
const Sale = require('../../models/Sale');
const Payout = require('../../models/Payout');
const Transaction = require('../../models/Transaction');
const { SALE_STATUS, ADVANCE_STATUS, PAYOUT_TYPE, PAYOUT_STATUS, TRANSACTION_TYPE } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('User model', () => {
  it('saves a valid user', async () => {
    const user = await User.create(buildUser());
    expect(user.name).toBe('Test User');
    expect(user.balance).toBe(0);
    expect(user.lastWithdrawalAt).toBeNull();
  });

  it('rejects a user without name', async () => {
    await expect(User.create(buildUser({ name: undefined }))).rejects.toThrow();
  });
});

describe('Sale model', () => {
  it('saves a valid sale with defaults', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id));
    expect(sale.status).toBe(SALE_STATUS.PENDING);
    expect(sale.advanceStatus).toBe(ADVANCE_STATUS.NONE);
    expect(sale.advanceAmount).toBe(0);
    expect(sale.reconciledAt).toBeNull();
    expect(sale.createdAt).toBeDefined();
  });

  it('rejects an invalid status enum', async () => {
    const user = await User.create(buildUser());
    await expect(Sale.create(buildSale(user._id, { status: 'invalid' }))).rejects.toThrow();
  });

  it('rejects an invalid advanceStatus enum', async () => {
    const user = await User.create(buildUser());
    await expect(Sale.create(buildSale(user._id, { advanceStatus: 'invalid' }))).rejects.toThrow();
  });

  it('rejects negative earning', async () => {
    const user = await User.create(buildUser());
    await expect(Sale.create(buildSale(user._id, { earning: -100 }))).rejects.toThrow();
  });
});

describe('Payout model', () => {
  it('saves a valid advance payout', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id));
    const payout = await Payout.create({
      userId: user._id,
      saleId: sale._id,
      type: PAYOUT_TYPE.ADVANCE,
      amount: 100,
    });
    expect(payout.status).toBe(PAYOUT_STATUS.PENDING);
    expect(payout.type).toBe(PAYOUT_TYPE.ADVANCE);
  });

  it('saves a withdrawal payout without saleId', async () => {
    const user = await User.create(buildUser());
    const payout = await Payout.create({
      userId: user._id,
      type: PAYOUT_TYPE.WITHDRAWAL,
      amount: 50,
    });
    expect(payout.saleId).toBeNull();
  });

  it('rejects an invalid type enum', async () => {
    const user = await User.create(buildUser());
    await expect(Payout.create({
      userId: user._id,
      type: 'invalid',
      amount: 100,
    })).rejects.toThrow();
  });

  it('rejects an invalid status enum', async () => {
    const user = await User.create(buildUser());
    await expect(Payout.create({
      userId: user._id,
      type: PAYOUT_TYPE.ADVANCE,
      amount: 100,
      status: 'invalid',
    })).rejects.toThrow();
  });
});

describe('Transaction model', () => {
  it('saves a valid ledger entry', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id));
    const txn = await Transaction.create({
      userId: user._id,
      amount: 100,
      type: TRANSACTION_TYPE.ADVANCE_CREDIT,
      refId: sale._id,
      refModel: 'Sale',
      balanceAfter: 100,
    });
    expect(txn.type).toBe(TRANSACTION_TYPE.ADVANCE_CREDIT);
    expect(txn.balanceAfter).toBe(100);
    expect(txn.createdAt).toBeDefined();
  });

  it('rejects an invalid type enum', async () => {
    const user = await User.create(buildUser());
    await expect(Transaction.create({
      userId: user._id,
      amount: 100,
      type: 'invalid',
      refId: user._id,
      refModel: 'Sale',
      balanceAfter: 100,
    })).rejects.toThrow();
  });

  it('rejects an invalid refModel enum', async () => {
    const user = await User.create(buildUser());
    await expect(Transaction.create({
      userId: user._id,
      amount: 100,
      type: TRANSACTION_TYPE.ADVANCE_CREDIT,
      refId: user._id,
      refModel: 'Invalid',
      balanceAfter: 100,
    })).rejects.toThrow();
  });
});
