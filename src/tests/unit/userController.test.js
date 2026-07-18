const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../app');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser } = require('../fixtures/factories');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const { TRANSACTION_TYPE } = require('../../config/constants');

const app = createApp();

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('User Controller - Read APIs', () => {
  describe('GET /api/users/:id/balance', () => {
    it('returns the user balance and lastWithdrawalAt', async () => {
      const user = await User.create(buildUser({ balance: 250 }));
      
      const res = await request(app).get(`/api/users/${user._id}/balance`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(250);
      expect(res.body.data.lastWithdrawalAt).toBeNull();
    });

    it('returns 404 for a non-existent user', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${randomId}/balance`);
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /api/users/:id/transactions', () => {
    it('returns paginated transactions for a user', async () => {
      const user = await User.create(buildUser());
      
      const txns = Array.from({ length: 25 }).map((_, i) => ({
        userId: user._id,
        amount: 10,
        type: TRANSACTION_TYPE.ADVANCE_CREDIT,
        refId: new mongoose.Types.ObjectId(),
        refModel: 'Sale',
        balanceAfter: (i + 1) * 10
      }));
      
      await Transaction.insertMany(txns);

      const res = await request(app).get(`/api/users/${user._id}/transactions?page=1&limit=20`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toHaveLength(20);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
      expect(res.body.data.total).toBe(25);
      
      // Check pagination on page 2
      const res2 = await request(app).get(`/api/users/${user._id}/transactions?page=2&limit=20`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.transactions).toHaveLength(5);
      expect(res2.body.data.page).toBe(2);
      expect(res2.body.data.total).toBe(25);
    });

    it('returns empty list if user has no transactions', async () => {
      const user = await User.create(buildUser());
      const res = await request(app).get(`/api/users/${user._id}/transactions`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });
  });
});
