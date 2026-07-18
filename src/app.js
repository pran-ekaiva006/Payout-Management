const express = require('express');
const sendSuccess = require('./utils/apiResponse');
const errorHandler = require('./middlewares/errorHandler');
const jobRoutes = require('./routes/jobRoutes');
const saleRoutes = require('./routes/saleRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const userRoutes = require('./routes/userRoutes');

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    sendSuccess(res, 200, { status: 'ok' });
  });

  app.use('/api/jobs', jobRoutes);
  app.use('/api/admin/sales', saleRoutes);
  app.use('/api/users', withdrawalRoutes);
  app.use('/api/payouts', payoutRoutes);
  app.use('/api/users', userRoutes);

  app.use(errorHandler);
  return app;
};

module.exports = createApp;
