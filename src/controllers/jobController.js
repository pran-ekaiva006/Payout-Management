const { runAdvancePayoutJob } = require('../jobs/advancePayoutJob');
const catchAsync = require('../utils/catchAsync');
const sendSuccess = require('../utils/apiResponse');

const triggerAdvancePayout = catchAsync(async (req, res) => {
  const result = await runAdvancePayoutJob();
  sendSuccess(res, 200, result);
});

module.exports = { triggerAdvancePayout };
