const express = require('express');
const { updatePayoutStatus } = require('../controllers/payoutController');

const router = express.Router({ mergeParams: true });

router.post('/:id/status', updatePayoutStatus);

module.exports = router;
