const { reconcileSale } = require('../services/reconciliationService');
const catchAsync = require('../utils/catchAsync');
const sendSuccess = require('../utils/apiResponse');

const reconcile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await reconcileSale(id, status);
  sendSuccess(res, 200, result);
});

module.exports = { reconcile };
