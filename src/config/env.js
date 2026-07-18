require('dotenv').config();

const config = Object.freeze({
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  nodeEnv: process.env.NODE_ENV || 'development',
});

module.exports = config;
