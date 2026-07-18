const { requestWithdrawal } = require('../services/withdrawalService');
const catchAsync = require('../utils/catchAsync');
const sendSuccess = require('../utils/apiResponse');

const withdraw = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const result = await requestWithdrawal(id, amount);
  sendSuccess(res, 200, result);
});

module.exports = { withdraw };
