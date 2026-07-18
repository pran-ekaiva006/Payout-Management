const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { NotFoundError } = require('../errors/AppError');

const recordTransaction = async ({ userId, amount, type, refId, refModel }, session) => {
  const updateOpts = session ? { session, returnDocument: 'after' } : { returnDocument: 'after' };
  const user = await User.findByIdAndUpdate(userId, { $inc: { balance: amount } }, updateOpts);

  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

  const txnData = { userId, amount, type, refId, refModel, balanceAfter: user.balance };
  const createOpts = session ? { session } : {};
  const [txn] = await Transaction.create([txnData], createOpts);

  return txn;
};

module.exports = { recordTransaction };
