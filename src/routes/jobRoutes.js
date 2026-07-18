const express = require('express');
const { triggerAdvancePayout } = require('../controllers/jobController');

const router = express.Router();

router.post('/advance-payout', triggerAdvancePayout);

module.exports = router;
