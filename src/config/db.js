const mongoose = require('mongoose');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const connectDB = async (uri) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(`MongoDB connected (attempt ${attempt})`);
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to connect to MongoDB after maximum retries');
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
