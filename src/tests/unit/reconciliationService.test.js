const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser, buildSale } = require('../fixtures/factories');
const { reconcileSale } = require('../../services/reconciliationService');
const User = require('../../models/User');
const Sale = require('../../models/Sale');
const Transaction = require('../../models/Transaction');
const { SALE_STATUS, ADVANCE_STATUS } = require('../../config/constants');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('reconciliationService', () => {
  it('approve: earning 30, advance 3 -> adjustment 27', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id, {
      earning: 30,
      advanceStatus: ADVANCE_STATUS.PAID,
      advanceAmount: 3,
    }));

    const result = await reconcileSale(sale._id, SALE_STATUS.APPROVED);

    expect(result.adjustment).toBe(27);
    expect(result.sale.status).toBe(SALE_STATUS.APPROVED);
    expect(result.sale.reconciledAt).toBeDefined();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(27);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(27);
  });

  it('reject: earning 50, advance 5 -> adjustment -5', async () => {
    const user = await User.create(buildUser({ balance: 5 }));
    const sale = await Sale.create(buildSale(user._id, {
      earning: 50,
      advanceStatus: ADVANCE_STATUS.PAID,
      advanceAmount: 5,
    }));

    const result = await reconcileSale(sale._id, SALE_STATUS.REJECTED);

    expect(result.adjustment).toBe(-5);
    expect(result.sale.status).toBe(SALE_STATUS.REJECTED);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.balance).toBe(0);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(-5);
  });

  it('reject with advanceAmount 0 -> adjustment 0, no transaction created', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id, {
      earning: 100,
      advanceStatus: ADVANCE_STATUS.NONE,
      advanceAmount: 0,
    }));

    const result = await reconcileSale(sale._id, SALE_STATUS.REJECTED);

    expect(result.adjustment).toBe(0);

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(0);
  });

  it('second reconcile throws ConflictError, no extra transaction', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id, {
      earning: 30,
      advanceStatus: ADVANCE_STATUS.PAID,
      advanceAmount: 3,
    }));

    await reconcileSale(sale._id, SALE_STATUS.APPROVED);

    await expect(reconcileSale(sale._id, SALE_STATUS.APPROVED))
      .rejects.toThrow('Sale already reconciled');

    const txns = await Transaction.find({ userId: user._id });
    expect(txns).toHaveLength(1);
  });

  it('throws NotFoundError for non-existent sale', async () => {
    await expect(reconcileSale(new mongoose.Types.ObjectId(), SALE_STATUS.APPROVED))
      .rejects.toThrow('Sale not found');
  });

  it('throws ValidationError for invalid status', async () => {
    const user = await User.create(buildUser());
    const sale = await Sale.create(buildSale(user._id));

    await expect(reconcileSale(sale._id, 'invalid'))
      .rejects.toThrow('Status must be approved or rejected');
  });
});
