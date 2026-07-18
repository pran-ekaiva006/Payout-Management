const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middlewares/errorHandler');
const { AppError, NotFoundError, ConflictError, InsufficientBalanceError } = require('../../errors/AppError');

const buildApp = (errorToThrow) => {
  const app = express();
  app.get('/test', (_req, _res, next) => next(errorToThrow));
  app.use(errorHandler);
  return app;
};

describe('errorHandler middleware', () => {
  it('formats a NotFoundError correctly (404)', async () => {
    const res = await request(buildApp(new NotFoundError('Sale not found', 'SALE_NOT_FOUND'))).get('/test');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'SALE_NOT_FOUND', message: 'Sale not found' },
    });
  });

  it('formats a ConflictError correctly (409)', async () => {
    const res = await request(buildApp(new ConflictError('Sale already reconciled', 'SALE_ALREADY_RECONCILED'))).get('/test');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'SALE_ALREADY_RECONCILED', message: 'Sale already reconciled' },
    });
  });

  it('formats an InsufficientBalanceError correctly (400)', async () => {
    const res = await request(buildApp(new InsufficientBalanceError())).get('/test');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' },
    });
  });

  it('formats a generic AppError correctly', async () => {
    const res = await request(buildApp(new AppError('Custom problem', 422, 'CUSTOM_CODE'))).get('/test');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'CUSTOM_CODE', message: 'Custom problem' },
    });
  });

  it('returns 500 with a generic message for a plain Error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(buildApp(new Error('something broke internally'))).get('/test');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not leak internal error details to the client', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(buildApp(new TypeError('Cannot read property x of undefined'))).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong');
    spy.mockRestore();
  });
});
