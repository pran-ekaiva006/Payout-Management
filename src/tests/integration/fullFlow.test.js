const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../app');
const { setupTestDB, teardownTestDB } = require('../fixtures/testSetup');
const { buildUser, buildSale } = require('../fixtures/factories');
const User = require('../../models/User');
const Sale = require('../../models/Sale');
const { SALE_STATUS } = require('../../config/constants');

const app = createApp();

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('Full Flow Integration', () => {
  it('reproduces the exact assignment PDF example end-to-end', async () => {
    // 1. Create one user
    const user = await User.create(buildUser());
    
    // 2. Create 3 pending Sale docs for that user, brand_1, earning 40 each
    const sale1 = await Sale.create(buildSale(user._id, { brand: 'brand_1', earning: 40 }));
    const sale2 = await Sale.create(buildSale(user._id, { brand: 'brand_1', earning: 40 }));
    const sale3 = await Sale.create(buildSale(user._id, { brand: 'brand_1', earning: 40 }));

    console.log(`\n--- STEP 1: INITIAL STATE ---`);
    console.log(`User created. Balance: 0`);
    console.log(`Created 3 pending sales. Earning: 40 each, Advance Paid: 0 each.`);

    // 3. POST /jobs/advance-payout
    const advanceRes = await request(app).post('/api/jobs/advance-payout');
    expect(advanceRes.status).toBe(200);
    expect(advanceRes.body.data.claimed).toBe(3);
    expect(advanceRes.body.data.totalAdvanced).toBe(12);

    let balanceRes = await request(app).get(`/api/users/${user._id}/balance`);
    expect(balanceRes.body.data.balance).toBe(12);

    console.log(`\n--- STEP 2: ADVANCE PAYOUT JOB ---`);
    console.log(`Job claimed ${advanceRes.body.data.claimed} sales.`);
    console.log(`Total advanced across all sales: ${advanceRes.body.data.totalAdvanced}`);
    console.log(`User balance is now: ${balanceRes.body.data.balance}`);

    // 4. POST /admin/sales/:id1/reconcile -> REJECTED
    const reconcile1Res = await request(app)
      .post(`/api/admin/sales/${sale1._id}/reconcile`)
      .send({ status: SALE_STATUS.REJECTED });
    
    expect(reconcile1Res.status).toBe(200);
    expect(reconcile1Res.body.data.adjustment).toBe(-4);

    // 5. POST /admin/sales/:id2/reconcile -> APPROVED
    const reconcile2Res = await request(app)
      .post(`/api/admin/sales/${sale2._id}/reconcile`)
      .send({ status: SALE_STATUS.APPROVED });
    
    expect(reconcile2Res.status).toBe(200);
    expect(reconcile2Res.body.data.adjustment).toBe(36);

    // POST /admin/sales/:id3/reconcile -> APPROVED
    const reconcile3Res = await request(app)
      .post(`/api/admin/sales/${sale3._id}/reconcile`)
      .send({ status: SALE_STATUS.APPROVED });
    
    expect(reconcile3Res.status).toBe(200);
    expect(reconcile3Res.body.data.adjustment).toBe(36);

    // Ensure total adjustment is 68
    const totalAdjustment = reconcile1Res.body.data.adjustment + reconcile2Res.body.data.adjustment + reconcile3Res.body.data.adjustment;
    expect(totalAdjustment).toBe(68);

    console.log(`\n--- STEP 3: RECONCILIATION ---`);
    console.log(`Sale 1 (REJECTED) -> Earning: 40 | Advance Paid: 4 | Final Adjustment: ${reconcile1Res.body.data.adjustment}`);
    console.log(`Sale 2 (APPROVED) -> Earning: 40 | Advance Paid: 4 | Final Adjustment: ${reconcile2Res.body.data.adjustment}`);
    console.log(`Sale 3 (APPROVED) -> Earning: 40 | Advance Paid: 4 | Final Adjustment: ${reconcile3Res.body.data.adjustment}`);
    console.log(`Net Final Adjustments (Final Payout): ${totalAdjustment}`);

    // 6. GET /users/:id/balance -> Final balance
    balanceRes = await request(app).get(`/api/users/${user._id}/balance`);
    expect(balanceRes.body.data.balance).toBe(80);

    console.log(`\n--- STEP 4: FINAL STATE ---`);
    console.log(`User final balance: ${balanceRes.body.data.balance} (12 Advance + 68 Final Adjustments)\n`);
  });
});
