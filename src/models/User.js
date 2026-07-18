const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastWithdrawalAt: { type: Date, default: null },
});

module.exports = mongoose.model('User', userSchema);
