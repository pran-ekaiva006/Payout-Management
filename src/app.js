const express = require('express');
const sendSuccess = require('./utils/apiResponse');
const errorHandler = require('./middlewares/errorHandler');

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    sendSuccess(res, 200, { status: 'ok' });
  });

  app.use(errorHandler);
  return app;
};

module.exports = createApp;
