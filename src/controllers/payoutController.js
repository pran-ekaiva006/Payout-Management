const { handlePayoutStatusUpdate } = require('../services/payoutReversalService');
const catchAsync = require('../utils/catchAsync');
const sendSuccess = require('../utils/apiResponse');

const updatePayoutStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await handlePayoutStatusUpdate(id, status);
  sendSuccess(res, 200, result);
});

module.exports = { updatePayoutStatus };
