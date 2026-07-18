const express = require('express');
const sendSuccess = require('./utils/apiResponse');
const errorHandler = require('./middlewares/errorHandler');
const jobRoutes = require('./routes/jobRoutes');
const saleRoutes = require('./routes/saleRoutes');

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    sendSuccess(res, 200, { status: 'ok' });
  });

  app.use('/api/jobs', jobRoutes);
  app.use('/api/admin/sales', saleRoutes);

  app.use(errorHandler);
  return app;
};

module.exports = createApp;
